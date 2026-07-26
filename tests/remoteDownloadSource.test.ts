import { describe, expect, it } from "vitest";
import {
  classifyRemoteDownloadSource,
  requiresRemoteDownloadPreflight,
  supportsHTTPTaskControls,
} from "../src/component/FileManager/Dialogs/remoteDownloadSource.ts";

describe("remote download source classification", () => {
  it("keeps HTTP-only controls away from BitTorrent and eD2K sources", () => {
    expect(classifyRemoteDownloadSource("https://downloads.example.test/release.iso")).toBe("http");
    expect(classifyRemoteDownloadSource("https://downloads.example.test/release.torrent?token=1")).toBe("torrent-url");
    expect(classifyRemoteDownloadSource("magnet:?xt=urn:btih:fixture")).toBe("magnet");
    expect(classifyRemoteDownloadSource("ed2k://|file|fixture.iso|1|0123456789abcdef0123456789abcdef|/")).toBe("ed2k");
    expect(supportsHTTPTaskControls("https://downloads.example.test/release.iso")).toBe(true);
    expect(supportsHTTPTaskControls("https://downloads.example.test/release.torrent")).toBe(false);
    expect(supportsHTTPTaskControls("magnet:?xt=urn:btih:fixture")).toBe(false);
  });

  it("queues eD2K directly instead of requesting unusable preview metadata", () => {
    expect(requiresRemoteDownloadPreflight("https://downloads.example.test/release.iso")).toBe(true);
    expect(requiresRemoteDownloadPreflight("magnet:?xt=urn:btih:fixture")).toBe(true);
    expect(requiresRemoteDownloadPreflight("https://downloads.example.test/release.torrent")).toBe(false);
    expect(requiresRemoteDownloadPreflight("ed2k://|file|fixture.iso|1|0123456789abcdef0123456789abcdef|/")).toBe(false);
  });
});
