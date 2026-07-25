import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(join(process.cwd(), "src", relativePath), "utf8");

describe("default optional-feature availability", () => {
  it("does not retain the upgrade dialog or unavailable settings pages", () => {
    expect(existsSync(join(process.cwd(), "src/component/Admin/Common/ProDialog.tsx"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/component/Admin/Settings/VAS/VAS.tsx"))).toBe(false);
    expect(existsSync(join(process.cwd(), "src/component/Admin/Settings/Event/Events.tsx"))).toBe(false);
  });

  it("keeps unavailable navigation and selectors out of the default UI", () => {
    const navigation = source("component/Frame/NavBar/PageNavigation.tsx");
    const settings = source("component/Admin/Settings/Settings.tsx");
    const providerSelector = source("component/Admin/StoragePolicy/SelectProvider.tsx");
    const customProperties = source("component/Admin/FileSystem/CustomProps/CustomPropsSetting.tsx");

    expect(navigation).not.toContain('path: "/admin/payment"');
    expect(navigation).not.toContain('path: "/admin/event"');
    expect(navigation).not.toContain('path: "/admin/abuse"');
    expect(settings).not.toContain("SettingsPageTab.VAS");
    expect(settings).not.toContain("SettingsPageTab.Events");
    expect(providerSelector).toContain("filter((type) => !PolicyPropsMap[type].pro)");
    expect(customProperties).toContain("filter((type) => !FieldTypes[type].pro)");
  });

  it("does not ship unfinished Connect, announcement, or Giscus UI", () => {
    const navigation = source("component/Frame/NavBar/PageNavigation.tsx");
    const router = readFileSync(join(process.cwd(), "src/router/index.tsx"), "utf8");
    const siteInformation = source("component/Admin/Settings/SiteInformation/SiteInformation.tsx");
    const dashboard = source("component/Admin/Home/Home.tsx");

    expect(navigation).not.toContain('path: "/connect"');
    expect(router).not.toContain('path: "/connect"');
    expect(siteInformation).not.toContain("settings.announcement");
    expect(siteInformation).not.toContain("show_app_promotion");
    expect(siteInformation).not.toContain("show_desktop_app_promotion");
    expect(dashboard).not.toContain("@giscus/react");
    expect(dashboard).not.toContain("<Giscus");
    expect(readFileSync(join(process.cwd(), "package.json"), "utf8")).not.toContain("@giscus/react");
  });
});
