import { describe, expect, it } from "vitest";
import { FileType } from "../../../src/api/explorer.ts";
import { canCopyMoveTo } from "../../../src/util/permission.ts";

const sharedFile = {
  id: "file-id",
  name: "source.txt",
  path: "cloudrevo://share-id@share/source.txt",
  type: FileType.file,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  size: 0,
  owned: false,
};

describe("shared transfer destination", () => {
  it("allows a transfer only within the active share", () => {
    const destination = "cloudrevo://share-id@share/destination";

    expect(canCopyMoveTo([sharedFile], destination, true)).toBe(true);
    expect(canCopyMoveTo([sharedFile], destination, false)).toBe(true);
    expect(canCopyMoveTo([sharedFile], "cloudrevo://my/destination", true)).toBe(false);
  });
});
