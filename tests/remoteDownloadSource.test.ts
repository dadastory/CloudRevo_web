import { describe, expect, it } from "vitest";
import {
  classifyRemoteDownloadSource,
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
});
