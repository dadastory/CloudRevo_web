import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(join(process.cwd(), "src", relativePath), "utf8");

describe("permission editor density", () => {
  it("uses the standard compact dialog and checklist dimensions", () => {
    const dialog = source("component/FileManager/Dialogs/FilePermissions.tsx");
    const audience = source("component/FileManager/Dialogs/PermissionAudience.tsx");

    expect(dialog).toContain('import DraggableDialog from "../../Dialogs/DraggableDialog.tsx"');
    expect(dialog).toContain('maxWidth: "xs"');
    expect(dialog).not.toContain('fontSize: "1.5rem"');
    expect(audience).toContain("width: 360");
    expect(audience).not.toContain('fontSize: "1.05rem"');
  });
});
