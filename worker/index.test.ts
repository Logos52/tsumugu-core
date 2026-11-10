import { describe, expect, it } from "vitest";
import worker, { type Env } from "./index.js";

function fetcher(body: string, seen: Request[]): Env["CORE"] {
  return {
    fetch(request: Request) {
      seen.push(request);
      return Promise.resolve(new Response(body));
    },
  };
}

function env(coreSeen: Request[], edSeen: Request[]): Env {
  return {
    CORE: fetcher("core", coreSeen),
    ED: fetcher("ed", edSeen),
    PRIMARY_HOST: "tsumugu.cc",
    LEGACY_HOST: "tsumugu-ed.com",
  };
}

describe("worker fetch", () => {
  it("301s the legacy host and its www host onto the primary host", async () => {
    const coreSeen: Request[] = [];
    const edSeen: Request[] = [];
    const legacy = await worker.fetch(
      new Request("http://tsumugu-ed.com:8080/c/媽.html?s=1"),
      env(coreSeen, edSeen),
    );
    expect(legacy.status).toBe(301);
    expect(legacy.headers.get("location")).toBe("https://tsumugu.cc/c/%E5%AA%BD.html?s=1");

    const www = await worker.fetch(
      new Request("https://www.tsumugu-ed.com/browse"),
      env(coreSeen, edSeen),
    );
    expect(www.status).toBe(301);
    expect(www.headers.get("location")).toBe("https://tsumugu.cc/browse");
    expect(coreSeen).toHaveLength(0);
    expect(edSeen).toHaveLength(0);
  });

  it("sends dict paths to the ed fetcher and the rest to core", async () => {
    const coreSeen: Request[] = [];
    const edSeen: Request[] = [];
    const current = env(coreSeen, edSeen);
    const home = new Request("https://tsumugu.cc/");
    const browse = new Request("https://tsumugu.cc/browse");

    const coreResponse = await worker.fetch(home, current);
    const edResponse = await worker.fetch(browse, current);

    expect(await coreResponse.text()).toBe("core");
    expect(await edResponse.text()).toBe("ed");
    expect(coreSeen.map((request) => request.url)).toEqual(["https://tsumugu.cc/"]);
    expect(edSeen.map((request) => request.url)).toEqual(["https://tsumugu.cc/browse"]);
  });
});
