import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dashboardApi = () => readFileSync(join(process.cwd(), "src/api/dashboard.ts"), "utf8");

describe("single-edition frontend runtime", () => {
  it("does not expose an obsolete license client type", () => {
    expect(dashboardApi()).not.toContain("ManualRefreshLicenseService");
  });
});
