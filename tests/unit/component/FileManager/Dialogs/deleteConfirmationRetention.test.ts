import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/component/FileManager/Dialogs/DeleteConfirmation.tsx"), "utf8");

describe("delete confirmation recycle-bin retention", () => {
  it("uses scheduled-cleanup feedback instead of formatting zero retention as a duration", () => {
    expect(source).toContain("const trashRetention = group?.trash_retention ?? 0");
    expect(source).toContain('trashRetention === 0 ? "modals.trashRetentionImmediate" : "modals.trashRetention"');
    expect(source).toContain("trashRetention * 1000");
  });
});
