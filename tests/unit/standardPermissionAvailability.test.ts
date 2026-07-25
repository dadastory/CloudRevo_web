import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(join(process.cwd(), "src", relativePath), "utf8");

describe("standard permission availability", () => {
  it("hydrates saved precise users when reopening the permission editor", () => {
    const editor = source("component/FileManager/Dialogs/FilePermissions.tsx");

    expect(editor).toContain("getUserInfo");
    expect(editor).toContain("Promise.all");
  });

  it("makes clearing a local rule explicit instead of looking like file deletion", () => {
    const editor = source("component/FileManager/Dialogs/FilePermissions.tsx");

    expect(editor).toContain('t("application:modals.clearCustomPermissions")');
    expect(editor).not.toContain('color="error" disabled={saving} onClick={clear}>{t("common:delete")}');
  });

  it("synchronizes the saved rule into file-manager state and confirms the save", () => {
    const editor = source("component/FileManager/Dialogs/FilePermissions.tsx");
    const fileManagerSlice = source("redux/fileManagerSlice.ts");

    expect(editor).toContain("getFileInfo");
    expect(editor).toContain("fileUpdated");
    expect(editor).toContain("enqueueSnackbar");
    expect(editor).toContain('variant: "success"');
    expect(fileManagerSlice).toContain("access_rule: file.access_rule");
  });

  it("opens a shared file in edit mode only for its version-control capability", () => {
    const actionOptions = source("component/FileManager/ContextMenu/useActionDisplayOpt.ts");
    const canUpdate = actionOptions.slice(
      actionOptions.indexOf("export const canUpdate"),
      actionOptions.indexOf("export interface DisplayOption"),
    );

    expect(canUpdate).toContain("NavigatorCapability.version_control");
    expect(canUpdate).toContain("const canUpdateSharedFile = opt.isShareFileSystem");
  });

  it("shows a default marker beside the administrative share ID", () => {
    const dashboardApi = source("api/dashboard.ts");
    const row = source("component/Admin/Share/ShareRow.tsx");

    expect(dashboardApi).toContain("props?: ShareProps");
    expect(row).toContain("share?.props?.default");
  });

  it("uses the ACL as the only share-collaboration setting", () => {
    const settings = source("component/FileManager/Dialogs/Share/ShareSetting.tsx");
    const dialog = source("component/FileManager/Dialogs/Share/ShareDialog.tsx");
    const thunk = source("redux/thunks/share.ts");

    expect(settings).not.toContain("allow_write");
    expect(dialog).not.toContain("allow_write");
    expect(thunk).not.toContain("allow_write");
  });

  it("opens the global audience editor from the share-link dialog", () => {
    const settings = source("component/FileManager/Dialogs/Share/ShareSetting.tsx");
    const dialog = source("component/FileManager/Dialogs/Share/ShareDialog.tsx");

    expect(settings).toContain("onOpenPermissions");
    expect(dialog).toContain("setFilePermissionDialog");
    expect(settings).not.toContain("AudiencePermissionRow");
    expect(settings).not.toContain("<Chip");
  });

  it("confirms a share-link permission save", () => {
    const dialog = source("component/FileManager/Dialogs/Share/ShareDialog.tsx");

    expect(dialog).toContain("enqueueSnackbar");
    expect(dialog).toContain('variant: "success"');
  });
});
