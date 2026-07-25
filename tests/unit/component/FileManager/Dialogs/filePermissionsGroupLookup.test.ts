import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/component/FileManager/Dialogs/FilePermissions.tsx"), "utf8");

describe("file permission group lookup", () => {
  it("searches groups on the server and resolves persisted group audiences", () => {
    expect(source).toContain("getSearchShareGroups");
    expect(source).toContain("resolveShareGroups");
    expect(source).not.toContain("getShareGroups()");
    expect(source).not.toContain("groups.filter");
  });
});
