import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (...path: string[]) => readFileSync(join(root, ...path), "utf8");

describe("CloudRevo product identity", () => {
  it("uses an explicit CloudRevo wordmark and a secure collaborative-workspace mark", () => {
    for (const asset of ["logo.svg", "logo_light.svg"]) {
      const logo = source("public/static/img", asset);

      expect(logo).toContain("CloudRevo");
      expect(logo).toContain("secure collaborative workspace logo");
      expect(logo).toContain(">Cloud<tspan");
      expect(logo).toContain(">Revo</tspan>");
      expect(logo).toContain('viewBox="0 0 1000 192"');
      expect(logo).toContain("font-size=\"150\"");
      expect(logo).toContain("x=\"205\" y=\"154\"");
      expect(logo).toContain("M96 12 169 42v51");
      expect(logo).toContain("M59 64h40l13 14");
      expect(logo).toContain("M91 40h34l13 13");
      expect(logo).not.toContain("Cloudreve");
    }

    const compact = source("public/static/img", "cloudrevo.svg");
    expect(compact).toContain("CloudRevo");
    expect(compact).toContain("secure collaborative workspace mark");
    expect(compact).toContain("M96 12 169 42v51");
    expect(compact).toContain("M59 64h40l13 14");
    expect(compact).toContain("m77 122 10 9 22-24");
    expect(compact).not.toContain("font-size=");
  });

  it("keeps Powered by attribution within CloudRevo identity", () => {
    const poweredBy = source("src/component/Frame/PoweredBy.tsx");

    expect(poweredBy).toContain("CloudRevo");
    expect(poweredBy).toContain("github.com/dadastory/CloudRevo");
    expect(poweredBy).not.toContain("Cloudreve");
  });

  it("keeps README branding in the main repository and synchronized with the active logo", () => {
    const light = source("..", "docs/brand/logo.svg");
    const dark = source("..", "docs/brand/logo_light.svg");

    for (const readme of [source("..", "README.md"), source("..", "README_zh-CN.md")]) {
      expect(readme).toContain('srcset="docs/brand/logo.svg"');
      expect(readme).toContain('srcset="docs/brand/logo_light.svg"');
      expect(readme).toContain('src="docs/brand/logo.svg"');
      expect(readme).not.toContain('<a href="https://github.com/dadastory/CloudRevo_web">');
    }
    expect(light).toBe(source("public/static/img", "logo.svg"));
    expect(dark).toBe(source("public/static/img", "logo_light.svg"));
  });

  it("does not retain the unused inherited frame logo assets", () => {
    expect(existsSync(join(root, "src/component/Frame/assets/logo.svg"))).toBe(false);
    expect(existsSync(join(root, "src/component/Frame/assets/logo_light.svg"))).toBe(false);
  });

  it("does not ship unsupported desktop or mobile client connection flows", () => {
    const devices = source("src/component/Pages/Devices/Devices.tsx");
    const router = source("src/router/index.tsx");
    const dialogs = source("src/component/FileManager/Dialogs/Dialogs.tsx");

    expect(devices).not.toContain("AppPromotion");
    expect(devices).not.toContain("DesktopAppPromotion");
    expect(router).not.toContain("DesktopCallback");
    expect(dialogs).not.toContain("DesktopMountSetup");
    expect(existsSync(join(root, "src/component/Pages/Devices/AppPromotion.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/component/Pages/Devices/DesktopAppPromotion.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/component/Pages/Login/Signin/DesktopCallback.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/component/FileManager/Dialogs/DesktopMountSetup.tsx"))).toBe(false);
  });

  it("documents GPL derivative provenance and Gopeed acknowledgement", () => {
    const english = source("..", "README.md");
    const chinese = source("..", "README_zh-CN.md");

    for (const readme of [english, chinese]) {
      expect(readme).toContain("CloudRevo");
      expect(readme).toContain("Cloudreve");
      expect(readme).toContain("Gopeed");
      expect(readme).toContain("GPL-3.0");
    }
  });
});
