import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd(), "..");

describe("Gopeed sidecar build sources", () => {
  it("uses public modules by default and confines the local mirror to local Compose", () => {
    const dockerfile = readFileSync(join(root, "gopeed.Dockerfile"), "utf8");
    const compose = readFileSync(join(root, "docker-compose.yml"), "utf8");
    const workflow = readFileSync(join(root, "release.yml"), "utf8");

    expect(dockerfile).toContain("ARG GO_PROXY=https://proxy.golang.org,direct");
    expect(dockerfile).toContain("ARG GOPEED_VERSION=v1.9.3");
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
    expect(workflow).toContain("verify-gopeed:");
    expect(workflow).toContain("gopeed-fork-test");
    expect(workflow).toContain("gopeed-contract");
    expect(workflow).toContain("GOPEED_VERSION=v1.9.3");
  });

  it("provides a fresh, alias-aware Compose command for the private Gopeed contract", () => {
    const scriptPath = join(root, "scripts", "test-gopeed-contract.sh");

    expect(existsSync(scriptPath)).toBe(true);
    const script = readFileSync(scriptPath, "utf8");

    expect(script).toContain("docker compose --profile test run --build --rm --use-aliases gopeed-contract");
  });

  it("runs maintained Gopeed fork HTTP policy tests through the Compose test profile", () => {
    const dockerfile = readFileSync(join(root, "gopeed.Dockerfile"), "utf8");
    const compose = readFileSync(join(root, "docker-compose.yml"), "utf8");

    expect(dockerfile).toContain("AS gopeed-fork-test");
    expect(dockerfile).toContain("go test ./internal/protocol/http");
    expect(compose).toContain("gopeed-fork-test:");
    expect(compose).toContain("target: gopeed-fork-test");
  });

  it("keeps database and Gopeed API ports private in both deployment manifests", () => {
    const localCompose = readFileSync(join(root, "docker-compose.yml"), "utf8");
    const publishedCompose = readFileSync(join(root, "docker-compose.yaml"), "utf8");

    for (const compose of [localCompose, publishedCompose]) {
      expect(compose).toContain("postgresql:");
      expect(compose).toContain("redis:");
      expect(compose).toContain("gopeed:");
      expect(compose).not.toMatch(/^\s*-\s*["']?\$?\{?[^\n]*:?(?:5432|6379|9999)\}?\s*:/m);
    }
  });

  it("copies the root README brand assets required by the branding contract", () => {
    const dockerfile = readFileSync(join(root, "Dockerfile"), "utf8");

    expect(dockerfile).toContain("COPY docs/brand /src/docs/brand");
  });
});
