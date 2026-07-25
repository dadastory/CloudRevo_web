import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const permissionEditorKeys = [
  "sharePermissions",
  "filePermissions",
  "clearCustomPermissions",
  "exactAccessPermissions",
  "commonAccessPermissions",
  "noExactAccessPermissions",
  "permissionRead",
  "permissionReadDes",
  "permissionCreate",
  "permissionCreateDes",
  "permissionUpdate",
  "permissionUpdateDes",
  "permissionDelete",
  "permissionDeleteDes",
  "noPermissions",
  "editPermissions",
  "removePermissionAudience",
  "anonymousVisitors",
  "authenticatedVisitors",
  "specificUsers",
  "specificGroups",
  "searchUserOrGroup",
];

describe("permission editor locales", () => {
  it("defines every permission-editor label in each bundled application locale", () => {
    const localeRoot = join(process.cwd(), "public", "locales");
    const missingByLocale = readdirSync(localeRoot)
      .map((locale) => {
        const application = JSON.parse(readFileSync(join(localeRoot, locale, "application.json"), "utf8"));
        return { locale, missing: permissionEditorKeys.filter((key) => !(key in application.modals)) };
      })
      .filter(({ missing }) => missing.length > 0);

    expect(missingByLocale).toEqual([]);
  });

  it("uses the concise permissions label wherever the feature is exposed", () => {
    const localeRoot = join(process.cwd(), "public", "locales");

    readdirSync(localeRoot).forEach((locale) => {
      const application = JSON.parse(readFileSync(join(localeRoot, locale, "application.json"), "utf8"));

      expect(application.modals.sharePermissions).toBe(application.modals.filePermissions);
      if (application.fileManager?.sharePermissions) {
        expect(application.fileManager.sharePermissions).toBe(application.modals.filePermissions);
      }
    });
  });
});
