import { describe, expect, it } from "vitest";
import {
  magnetMetadataTimeoutMessage,
  remoteDownloadPreflightErrorMessage,
} from "../src/component/FileManager/Dialogs/remoteDownloadPreflight.ts";

describe("remote download preflight feedback", () => {
  it("turns the stable magnet timeout into a retryable localized message", () => {
    const error = {
      message: magnetMetadataTimeoutMessage,
      rawMessage: magnetMetadataTimeoutMessage,
    };

    expect(remoteDownloadPreflightErrorMessage(error, "磁力元数据解析超时，请重试。", "未知错误")).toBe(
      "磁力元数据解析超时，请重试。",
    );
  });

  it("keeps a non-timeout preflight failure actionable", () => {
    expect(
      remoteDownloadPreflightErrorMessage(new Error("Invalid source URL"), "磁力元数据解析超时，请重试。", "未知错误"),
    ).toBe("Invalid source URL");
  });
});
