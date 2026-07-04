// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createFirstGradeToast } from "./toast.js";

describe("createFirstGradeToast", () => {
  it("fires exactly once, on the first graded signal", () => {
    const calls: string[] = [];
    const trigger = createFirstGradeToast({ message: "saved", show: (m) => calls.push(m) });

    trigger(false); // no grade yet → no fire
    expect(calls).toHaveLength(0);

    trigger(true); // first grade → fire
    trigger(true); // subsequent grades → no repeat
    trigger(true);
    expect(calls).toEqual(["saved"]);
  });

  it("stays silent for returning visitors who already had progress", () => {
    const calls: string[] = [];
    const trigger = createFirstGradeToast({ message: "saved", show: (m) => calls.push(m), alreadyFired: true });
    trigger(true);
    expect(calls).toHaveLength(0);
  });
});
