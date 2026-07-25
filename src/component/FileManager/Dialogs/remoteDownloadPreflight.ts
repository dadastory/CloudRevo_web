export const magnetMetadataTimeoutMessage = "Magnet metadata resolution timed out. Please retry.";

export const remoteDownloadPreflightErrorMessage = (
  error: unknown,
  localizedMagnetTimeout: string,
  fallback: string,
): string => {
  if (typeof error == "object" && error !== null) {
    const candidate = error as { message?: unknown; rawMessage?: unknown };
    if (candidate.rawMessage === magnetMetadataTimeoutMessage || candidate.message === magnetMetadataTimeoutMessage) {
      return localizedMagnetTimeout;
    }
    if (typeof candidate.message == "string" && candidate.message) {
      return candidate.message;
    }
  }
  return fallback;
};
