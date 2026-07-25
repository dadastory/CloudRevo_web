import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/redux/thunks/filemanager.ts"), "utf8");

describe("shared directory loading lifecycle", () => {
  it("clears loading after a successful final cursor-page response", () => {
    const reconcile = source.slice(source.indexOf("export function navigateReconcile"), source.indexOf("export function loadMorePages"));

    expect(reconcile).toContain("finally {");
    expect(reconcile).toContain("dispatch(setFmLoading({ index, value: false }))");
    expect(reconcile).toContain("dispatch(applyListResponse({ index, value: listRes }))");
  });
});
