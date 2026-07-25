export interface DefaultShareSettingValues {
  default?: boolean;
  is_private?: boolean;
  use_custom_password?: boolean;
  password?: string;
}

export type DefaultShareSettingChange = "default" | "is_private";

export const canSetDefaultShare = (isAuthenticated: boolean, isAdministrator: boolean): boolean =>
  isAuthenticated && isAdministrator;

// Default shares must be directly usable by newly provisioned recipients, so
// their state cannot include link privacy or a password. The triggering field
// determines which choice wins when a user toggles between the two settings.
export const normalizeDefaultShareSetting = <T extends DefaultShareSettingValues>(
  setting: T,
  changed: DefaultShareSettingChange,
): T => {
  if (changed === "default" && setting.default) {
    return {
      ...setting,
      is_private: false,
      use_custom_password: false,
      password: undefined,
    };
  }
  if (changed === "is_private" && setting.is_private) {
    return { ...setting, default: false };
  }
  return setting;
};
