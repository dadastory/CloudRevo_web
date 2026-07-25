import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "..");

describe("Gopeed sidecar build sources", () => {
  it("uses public modules by default and confines the local mirror to local Compose", () => {
    const dockerfile = readFileSync(join(root, "gopeed.Dockerfile"), "utf8");
    const compose = readFileSync(join(root, "docker-compose.yml"), "utf8");
    const workflow = readFileSync(join(root, "release.yml"), "utf8");

    expect(dockerfile).toContain("ARG GO_PROXY=https://proxy.golang.org,direct");
    expect(dockerfile).not.toContain("ENV GOPROXY=https://goproxy.cn,direct");
    expect(dockerfile).toContain("FROM golang@sha256:");
    expect(dockerfile).toContain("FROM alpine@sha256:");
    expect(compose).toContain("GO_PROXY: https://goproxy.cn|https://proxy.golang.org,direct");
    expect(workflow).not.toContain("goproxy.cn");
  });

  it("publishes native architecture digests with bounded cached builds before merging public tags", () => {
    const workflow = readFileSync(join(root, "release.yml"), "utf8");

    expect(workflow).toContain("ubuntu-24.04-arm");
    expect(workflow).toContain("linux/arm64");
    expect(workflow).toContain("push-by-digest=true");
    expect(workflow).toContain("actions/upload-artifact@v4");
    expect(workflow).toContain("actions/download-artifact@v4");
    expect(workflow).toContain("docker buildx imagetools create");
    expect(workflow).toContain("cache-from: type=gha");
    expect(workflow).toContain("cache-to: type=gha,mode=max");
    expect(workflow).toContain("timeout-minutes:");
  });
});
