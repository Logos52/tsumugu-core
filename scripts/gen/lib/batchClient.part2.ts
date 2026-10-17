export const DEFAULT_LANE_COUNT = 5;

export const MAX_LANE_COUNT = 9;

interface CacheControl {
  type: "ephemeral";
}

interface BatchSystemBlock {
  type: "text";
  text: string;
  cache_control?: CacheControl;
}

interface BatchRequestParams {
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
