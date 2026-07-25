import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (...path: string[]) => readFileSync(join(root, ...path), "utf8");

describe("CloudRevo product identity", () => {
  it("uses original CloudRevo metadata and artwork", () => {
    for (const asset of ["logo.svg", "logo_light.svg", "cloudrevo.svg"]) {
      const logo = source("public/static/img", asset);
      expect(logo).toContain("CloudRevo");
      expect(logo).toContain("folded cloud mark");
      expect(logo).not.toContain("Cloudreve");
    }
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
      expect(readme).toContain("raw.githubusercontent.com/dadastory/CloudRevo/main/docs/brand/logo.svg");
      expect(readme).toContain("raw.githubusercontent.com/dadastory/CloudRevo/main/docs/brand/logo_light.svg");
      expect(readme).not.toContain("CloudRevo_web/main/public/static/img/logo");
    }
    expect(light).toBe(source("public/static/img", "logo.svg"));
    expect(dark).toBe(source("public/static/img", "logo_light.svg"));
  });

  it("does not retain the unused inherited frame logo assets", () => {
    expect(existsSync(join(root, "src/component/Frame/assets/logo.svg"))).toBe(false);
    expect(existsSync(join(root, "src/component/Frame/assets/logo_light.svg"))).toBe(false);
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
