import { describe, expect, it } from "vitest";
import { flag, list, num, parseArgs, str } from "../src/args.js";

describe("parseArgs", () => {
  it("keeps positionals and reads values and bare flags", () => {
    const parsed = parseArgs(["cmd", "file", "--out", "dir", "--force"]);
    expect(parsed._).toEqual(["cmd", "file"]);
    expect(parsed.opts).toEqual({ out: "dir", force: true });
  });

  it("takes the next non-flag token as a flag value", () => {
    const parsed = parseArgs(["--force", "file"]);
    expect(parsed.opts.force).toBe("file");
    expect(parsed._).toEqual([]);
  });

  it("treats a following flag as a bare flag, not a value", () => {
    const parsed = parseArgs(["--force", "--out"]);
    expect(parsed.opts).toEqual({ force: true, out: true });
    expect(parsed._).toEqual([]);
  });

  it("leaves single-dash tokens as positionals", () => {
    const parsed = parseArgs(["-h", "--count", "-1"]);
    expect(parsed._).toEqual(["-h"]);
    expect(parsed.opts.count).toBe("-1");
  });
});

describe("arg readers", () => {
  const opts = {
    name: " 學 ",
    count: "1e2",
    bare: true,
    off: "false",
    on: "true",
    items: " a, ,b ,c ",
    empty: "",
    bad: "nope",
    inf: "Infinity",
  };

  it("reads strings only from string values", () => {
    expect(str(opts, "name")).toBe(" 學 ");
    expect(str(opts, "bare")).toBeUndefined();
    expect(str(opts, "missing")).toBeUndefined();
    expect(str(opts, "empty")).toBe("");
  });

  it("reads finite numbers and drops non-finite text", () => {
    expect(num(opts, "count")).toBe(100);
    expect(num(opts, "empty")).toBe(0);
    expect(num(opts, "bad")).toBeUndefined();
    expect(num(opts, "inf")).toBeUndefined();
    expect(num(opts, "bare")).toBeUndefined();
    expect(num({ count: "-1" }, "count")).toBe(-1);
  });

  it("splits comma lists and ignores bare flags", () => {
    expect(list(opts, "items")).toEqual(["a", "b", "c"]);
    expect(list(opts, "bare")).toEqual([]);
    expect(list(opts, "missing")).toEqual([]);
    expect(list(opts, "empty")).toEqual([]);
  });

  it("treats a bare flag and the string true as set", () => {
    expect(flag(opts, "bare")).toBe(true);
    expect(flag(opts, "on")).toBe(true);
    expect(flag(opts, "off")).toBe(false);
    expect(flag(opts, "name")).toBe(false);
    expect(flag(opts, "missing")).toBe(false);
  });
});
