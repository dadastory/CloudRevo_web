import { describe, expect, it } from "vitest";
import {
  canAddNamedAudience,
  maxShareAccessRuleAudiences,
  updateNamedAudienceRule,
} from "../../../../../src/component/FileManager/Dialogs/filePermissionRule.ts";

describe("updateNamedAudienceRule", () => {
  const rule = {
    anonymous: { read: true },
    authenticated: { read: true },
    users: { "user-1": { read: true }, "user-2": { read: true, update: true } },
    groups: { "group-1": { read: true, create: true } },
  };

  it("removes an exact user permission without changing other audiences", () => {
    const result = updateNamedAudienceRule(rule, "users", "user-1");

    expect(result.users).toEqual({ "user-2": { read: true, update: true } });
    expect(result.groups).toEqual(rule.groups);
  });

  it("removes an exact group permission without changing user permissions", () => {
    const result = updateNamedAudienceRule(rule, "groups", "group-1");

    expect(result.groups).toEqual({});
    expect(result.users).toEqual(rule.users);
  });

  it("prevents adding a new exact audience beyond the server limit", () => {
    const users = Object.fromEntries(
      Array.from({ length: maxShareAccessRuleAudiences }, (_, index) => [`user-${index}`, { read: true }]),
    );

    expect(canAddNamedAudience({ users }, "users", "user-0")).toBe(true);
    expect(canAddNamedAudience({ users }, "users", "new-user")).toBe(false);
  });
});
