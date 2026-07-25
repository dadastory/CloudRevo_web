import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(join(process.cwd(), "src/component/FileManager/Dialogs/Share/ManageShares.tsx"), "utf8");

describe("managed share copy action", () => {
  it("renders a direct, labelled action-column control that copies the row URL", () => {
    expect(source).toContain('import { copyToClipboard } from "../../../../util/index.ts"');
    expect(source).toContain('import CopyOutlined from "../../../Icons/CopyOutlined.tsx"');
    expect(source).toContain('aria-label={t("share.copyLinkToClipboard")}');
    expect(source).toContain("copyToClipboard(e.url)");
    expect(source).toContain("event.stopPropagation()");
    expect(source).not.toContain("const copyLink");
  });
});
