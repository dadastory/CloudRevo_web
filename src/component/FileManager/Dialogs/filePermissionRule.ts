import type { ShareAccessRule, SharePermission } from "../../../api/explorer.ts";

export const defaultAccessRule = (): ShareAccessRule => ({
  anonymous: { read: true },
  authenticated: { read: true },
  users: {},
  groups: {},
});

// Keep this in sync with types.MaxShareAccessRuleAudiences. It prevents a
// client from constructing a request the server must reject or evaluate.
export const maxShareAccessRuleAudiences = 256;

export const canAddNamedAudience = (
  rule: ShareAccessRule,
  audience: "users" | "groups",
  id: string,
): boolean => !!rule[audience]?.[id] || Object.keys(rule[audience] ?? {}).length < maxShareAccessRuleAudiences;

export const updateNamedAudienceRule = (
  rule: ShareAccessRule,
  audience: "users" | "groups",
  id: string,
  permission?: SharePermission,
): ShareAccessRule => {
  const entries = { ...(rule[audience] ?? {}) };
  if (permission) entries[id] = permission;
  else delete entries[id];
  return { ...rule, [audience]: entries };
};
