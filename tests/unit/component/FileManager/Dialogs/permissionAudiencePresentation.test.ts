import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(join(process.cwd(), "src", relativePath), "utf8");

describe("permission audience presentation", () => {
  it("renders audience helper text and an anchored, descriptive permission checklist", () => {
    const dialog = source("component/FileManager/Dialogs/FilePermissions.tsx");
    const audience = source("component/FileManager/Dialogs/PermissionAudience.tsx");

    expect(dialog).toContain('t("application:modals.exactAccessPermissionsDes")');
    expect(dialog).toContain('t("application:modals.commonAccessPermissionsDes")');
    expect(audience).toContain("<Popover");
    expect(audience).toContain('t(`application:modals.permission${key[0].toUpperCase()}${key.slice(1)}Des`)');
    expect(audience).toContain("<Checkbox");
  });
});
