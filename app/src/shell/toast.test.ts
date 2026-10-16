
import { describe, expect, it } from "vitest";
import { createFirstGradeToast } from "./toast.js";

describe("createFirstGradeToast", () => {
  it("fires exactly once, on the first graded signal", () => {
    const calls: string[] = [];
    const trigger = createFirstGradeToast({ message: "saved", show: (m) => calls.push(m) });

    trigger(false); 
    expect(calls).toHaveLength(0);

    trigger(true); 
    trigger(true); 
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
