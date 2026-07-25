import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(join(process.cwd(), "src", relativePath), "utf8");

describe("share permissions entry", () => {
  it("reuses the global file permissions dialog and does not submit a link ACL", () => {
    const dialog = source("component/FileManager/Dialogs/Share/ShareDialog.tsx");
    const setting = source("component/FileManager/Dialogs/Share/ShareSetting.tsx");
    const thunk = source("redux/thunks/share.ts");

    expect(dialog).toContain("setFilePermissionDialog");
    expect(setting).toContain("onOpenPermissions");
    expect(setting).toContain('t("application:modals.filePermissions")');
    expect(setting).not.toContain("share_permissions");
    expect(thunk).not.toContain("access_rule: setting.access_rule");
  });
});
