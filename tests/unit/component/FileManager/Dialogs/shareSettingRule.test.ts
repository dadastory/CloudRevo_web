import { describe, expect, it } from "vitest";
import {
  canSetDefaultShare,
  normalizeDefaultShareSetting,
} from "../../../../../src/component/FileManager/Dialogs/Share/shareSettingRule.ts";

describe("default share setting normalization", () => {
  it("clears privacy and password fields when default sharing is enabled", () => {
    expect(
      normalizeDefaultShareSetting({
        default: true,
        is_private: true,
        use_custom_password: true,
        password: "secret",
      }, "default"),
    ).toMatchObject({
      default: true,
      is_private: false,
      use_custom_password: false,
      password: undefined,
    });
  });

  it("clears the default marker when privacy is enabled", () => {
    expect(normalizeDefaultShareSetting({ default: true, is_private: true }, "is_private")).toMatchObject({
      default: false,
      is_private: true,
    });
  });

  it("offers default sharing only to authenticated administrators", () => {
    expect(canSetDefaultShare(true, true)).toBe(true);
    expect(canSetDefaultShare(true, false)).toBe(false);
    expect(canSetDefaultShare(false, true)).toBe(false);
  });
});
