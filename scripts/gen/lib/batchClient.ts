export const DEFAULT_LANE_COUNT = 5;
export const MAX_LANE_COUNT = 9;

export interface CacheControl {
  type: "ephemeral";
}

export interface BatchSystemBlock {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

export interface BatchRequestParams {
  model: string;
  max_tokens?: number;
  system: BatchSystemBlock[];
  messages: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface BatchRequest {
  custom_id: string;
  params: BatchRequestParams;
}

export interface BatchResult {
  custom_id: string;
  result: {
    type: "succeeded" | "errored";
    message?: { content: Array<{ type: string; text: string }> };
    error?: { message: string };
  };
}

export interface BatchClient {
  submit(requests: BatchRequest[]): Promise<string>;
  poll(batchId: string): Promise<BatchResult[]>;
}

export function extractResultText(result: BatchResult): string {
  const blocks = result.result.message?.content ?? [];
  return blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/** Build generate request: cumulative vocab in cached system prefix, not user turn. (frozen, no injection) */
export function buildGenerateRequest(opts: {
  customId: string;
  model: string;
  cumulativeVocab: string[];
  userPrompt: string;
}): BatchRequest {
  const vocabBlock = opts.cumulativeVocab.join("\n");
  return {
    custom_id: opts.customId,
    params: {
      model: opts.model,
      max_tokens: 8192,
      system: [
        {
          type: "text",
          text: "FROZEN CONTROLLED VOCABULARY (Traditional, cumulative through lesson):\n" + vocabBlock,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: opts.userPrompt }],
    },
  };
}

export function buildCritiqueRequest(opts: {
  customId: string;
  model: string;
  draft: string;
  newGrammar: string[];
  format: string;
}): BatchRequest {
  const grammarList = opts.newGrammar.join("、") || "(none)";
  return {
    custom_id: opts.customId,
    params: {
      model: opts.model,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text:
            "You are a fresh-context critic. No generation memory. " +
            "Return PASS or FAIL plus bullet reasons.",
        },
      ],
      messages: [
        {
          role: "user",
          content:
            `format: ${opts.format}\n` +
            `newGrammar: ${grammarList}\n\n` +
            `Draft:\n${opts.draft}`,
        },
      ],
    },
  };
}

export function buildRepairRequest(opts: {
  customId: string;
  model: string;
  cumulativeVocab: string[];
  draft: string;
  critique: string;
}): BatchRequest {
  return {
    custom_id: opts.customId,
    params: {
      model: opts.model,
      max_tokens: 8192,
      system: [
        {
          type: "text",
          text: "FROZEN CONTROLLED VOCABULARY:\n" + opts.cumulativeVocab.join("\n"),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Critique:\n${opts.critique}\n\nRepair this draft:\n${opts.draft}`,
        },
      ],
    },
  };
}

/** In-memory client for vitest — returns results in arbitrary order. */
export function createMockBatchClient(
  responses: Record<string, string>,
): BatchClient & { submitted: BatchRequest[] } {
  const submitted: BatchRequest[] = [];
  return {
    submitted,
    async submit(requests) {
      submitted.push(...requests);
      return `mock-batch-${submitted.length}`;
    },
    async poll(_batchId) {
      const entries = Object.entries(responses);
      // Deliberately shuffle to assert custom_id routing.
      const shuffled = [...entries].sort((a, b) => (a[0] < b[0] ? 1 : -1));
      return shuffled.map(([custom_id, text]) => ({
        custom_id,
        result: {
          type: "succeeded" as const,
          message: { content: [{ type: "text", text }] },
        },
      }));
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Real Batches client using Anthropic REST (env-gated, 50% price, supports cache_control on system). */
export function createAnthropicBatchClient(apiKey: string): BatchClient {
  const BASE = "https://api.anthropic.com/v1/messages/batches";
  const HDR = {
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  } as const;

  return {
    async submit(requests) {
      const body = {
        requests: requests.map((r) => ({
          custom_id: r.custom_id,
          params: {
            ...r.params,
            max_tokens: r.params.max_tokens ?? 4096,
          },
        })),
      };
      const res = await fetch(BASE, {
        method: "POST",
        headers: HDR,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`batch submit failed ${res.status}: ${t}`);
      }
      const data = (await res.json()) as { id: string };
      return data.id;
    },
    async poll(batchId) {
      // Poll status until ended, then fetch results_url (jsonl of {custom_id, result})
      for (let attempt = 0; attempt < 120; attempt++) {
        const stRes = await fetch(`${BASE}/${batchId}`, { headers: HDR });
        if (!stRes.ok) {
          await sleep(2000);
          continue;
        }
        const st = (await stRes.json()) as {
          processing_status?: string;
          results_url?: string;
          request_counts?: unknown;
        };
        if (st.processing_status === "ended" && st.results_url) {
          const rRes = await fetch(st.results_url, { headers: HDR });
          if (!rRes.ok) throw new Error(`results fetch ${rRes.status}`);
          const text = await rRes.text();
          return text
            .trim()
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => JSON.parse(line) as BatchResult);
        }
        if (st.processing_status === "errored") {
          throw new Error(`batch ${batchId} errored`);
        }
        await sleep(5000);
      }
      throw new Error(`batch ${batchId} poll timeout`);
    },
  };
}