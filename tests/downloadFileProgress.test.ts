import { describe, expect, it } from "vitest";
import { fileProgressDetails } from "../src/component/Pages/Tasks/downloadFileProgress.ts";

describe("fileProgressDetails", () => {
  it("does not present aggregate-only progress as per-file progress", () => {
    expect(fileProgressDetails({ progress: 0.75 })).toEqual({
      known: false,
      percentage: 0,
      label: "—",
    });
  });

  it("formats authoritative file progress", () => {
    expect(fileProgressDetails({ progress: 0.375, progress_known: true })).toEqual({
      known: true,
      percentage: 37.5,
      label: "37.50 %",
    });
  });
});
