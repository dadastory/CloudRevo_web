export type RemoteDownloadSourceKind = "http" | "torrent-url" | "magnet" | "ed2k" | "unknown";

export const classifyRemoteDownloadSource = (source: string): RemoteDownloadSourceKind => {
  const normalized = source.trim();
  const lower = normalized.toLowerCase();
  if (lower.startsWith("magnet:")) return "magnet";
  if (lower.startsWith("ed2k://")) return "ed2k";

  try {
    const url = new URL(normalized);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "unknown";
    return url.pathname.toLowerCase().endsWith(".torrent") ? "torrent-url" : "http";
  } catch {
    return "unknown";
  }
};

export const supportsHTTPTaskControls = (source: string) => classifyRemoteDownloadSource(source) === "http";
