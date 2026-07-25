import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (...path: string[]) => readFileSync(join(root, ...path), "utf8");

describe("CloudRevo product identity", () => {
  it("uses original CloudRevo metadata and artwork", () => {
    expect(source("public/static/img/logo.svg")).toContain("CloudRevo");
    expect(source("public/static/img/cloudrevo.svg")).toContain("CloudRevo");
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
