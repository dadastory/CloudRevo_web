import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../../../src/session", () => ({
  default: {
    currentLoginOrNull: () => ({ user: { id: "visitor-id" } }),
    currentUser: () => ({ id: "visitor-id", group: { direct_link_batch_size: 0 } }),
    currentUserGroupPermission: () => ({ enabled: () => false }),
  },
}));

vi.mock("../../../../../src/redux/fileManagerSlice.ts", () => ({
  ContextMenuTypes: {
    empty: "empty",
    new: "new",
    file: "file",
    searchResult: "searchResult",
  },
}));

vi.mock("../../../../../src/redux/siteConfigSlice.ts", () => ({
  Viewers: {},
  ViewersByID: {},
}));

vi.mock("../../../../../src/hooks/useNavigation.tsx", () => ({ defaultPath: "cloudrevo://my" }));

vi.mock("../../../../../src/component/FileManager/FileManager.tsx", () => ({
  FileManagerIndex: { main: 0, selector: 1 },
}));

vi.mock("../../../../../src/util", () => ({
  fileExtension: (name: string) => name.split(".").at(-1),
}));

import { FileType, NavigatorCapability } from "../../../../../src/api/explorer.ts";
import type { FileResponse } from "../../../../../src/api/explorer.ts";
import Boolset from "../../../../../src/util/boolset.ts";
import { canUpdate, getActionOpt } from "../../../../../src/component/FileManager/ContextMenu/useActionDisplayOpt.ts";

const ContextMenuTypes = {
  empty: "empty",
  file: "file",
};

const sharePath = (name: string) => `cloudrevo://share-id@share/${name}`;

const capability = (...values: number[]) => {
  const result = new Boolset();
  values.forEach((value) => result.set(value, true));
  return result.toString();
};

const file = (overrides: Partial<FileResponse> = {}): FileResponse => ({
  type: FileType.file,
  id: "file-id",
  name: "shared-file.txt",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  size: 0,
  path: sharePath("shared-file.txt"),
  owned: false,
  ...overrides,
});

describe("getActionOpt share write permissions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("enables create and upload for a writable shared folder parent", () => {
    const parent = file({
      type: FileType.folder,
      id: "folder-id",
      name: "shared-folder",
      path: sharePath("shared-folder"),
      capability: capability(NavigatorCapability.create_file),
    });

    const action = getActionOpt([], undefined, ContextMenuTypes.empty, parent);

    expect(action.showCreateFolder).toBe(true);
    expect(action.showUpload).toBe(true);
  });

  it("enables shared transfer actions from their source capabilities", () => {
    const target = file({
      capability: capability(
        NavigatorCapability.rename_file,
        NavigatorCapability.soft_delete,
        NavigatorCapability.delete_file,
        NavigatorCapability.upload_file,
        NavigatorCapability.download_file,
      ),
    });

    const action = getActionOpt([target], undefined, ContextMenuTypes.file);

    expect(action.showRename).toBe(true);
    expect(action.showDelete).toBe(true);
    expect(action.showCopy).toBe(true);
    expect(action.showMove).toBe(true);
    expect(action.showPin).not.toBe(true);
    expect(action.showVersionControl).not.toBe(true);
    expect(canUpdate(action)).toBe(false);
  });

  it("renders an update-only shared target without create or delete actions", () => {
    const target = file({ capability: capability(NavigatorCapability.rename_file) });

    const action = getActionOpt([target], undefined, ContextMenuTypes.file);

    expect(action.showRename).toBe(true);
    expect(action.showDelete).not.toBe(true);
    expect(action.showCreateFolder).not.toBe(true);
    expect(action.showUpload).not.toBe(true);
  });

  it("does not expose mutation actions for a read-only share", () => {
    const parent = file({
      type: FileType.folder,
      id: "folder-id",
      name: "shared-folder",
      path: sharePath("shared-folder"),
      capability: capability(NavigatorCapability.list_children),
    });
    const target = file({ capability: capability(NavigatorCapability.download_file) });

    const parentAction = getActionOpt([], undefined, ContextMenuTypes.empty, parent);
    const targetAction = getActionOpt([target], undefined, ContextMenuTypes.file);

    expect(parentAction.showCreateFolder).not.toBe(true);
    expect(parentAction.showUpload).not.toBe(true);
    expect(targetAction.showRename).not.toBe(true);
    expect(targetAction.showDelete).not.toBe(true);
    expect(canUpdate(targetAction)).toBe(false);
  });

  it("exposes the file permission action only for an owned single target", () => {
    const owned = file({ owned: true, path: "cloudrevo://my/owned.txt" });
    const shared = file();

    expect(getActionOpt([owned], undefined, ContextMenuTypes.file).showFilePermissions).toBe(true);
    expect(getActionOpt([shared], undefined, ContextMenuTypes.file).showFilePermissions).not.toBe(true);
  });
});
