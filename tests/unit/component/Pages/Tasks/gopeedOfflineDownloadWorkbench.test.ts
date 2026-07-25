import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) => readFileSync(join(process.cwd(), "src", relativePath), "utf8");

describe("Gopeed offline-download workbench", () => {
  it("keeps optional request context in the creation flow and validates header JSON before submit", () => {
    const dialog = source("component/FileManager/Dialogs/CreateRemoteDownload.tsx");

    expect(dialog).toContain("remoteDownloadAdvanced");
    expect(dialog).toContain("remoteDownloadAuthorizedHeaders");
    expect(dialog).toContain("JSON.parse(headers)");
    expect(dialog).toContain("remoteDownloadHeadersInvalid");
    expect(dialog).toContain("request,");
  });

  it("provides per-task and selection-based terminal actions through dedicated workflow APIs", () => {
    const list = source("component/Pages/Tasks/DownloadList.tsx");
    const card = source("component/Pages/Tasks/TaskCard.tsx");
    const api = source("api/api.ts");

    expect(list).toContain("sendRetryDownloadTasks");
    expect(list).toContain("sendDeleteDownloadTasks");
    expect(list).toContain("deleteTaskConfirm");
    expect(card).toContain('task.status === "error"');
    expect(card).toContain("download.selectTask");
    expect(api).toContain('"/workflow/download/batch/retry"');
    expect(api).toContain('"/workflow/download/batch"');
  });

  it("preflights one source before queueing and keeps the task view synchronized", () => {
    const dialog = source("component/FileManager/Dialogs/CreateRemoteDownload.tsx");
    const list = source("component/Pages/Tasks/DownloadList.tsx");
    const api = source("api/api.ts");

    expect(dialog).toContain("sendPreviewRemoteDownload");
    expect(dialog).toContain("selected_files: preview ? selectedFiles");
    expect(dialog).toContain("cloudrevo:download-tasks-changed");
    expect(list).toContain('window.addEventListener("cloudrevo:download-tasks-changed"');
    expect(list).toContain("toggleAllTasks");
    expect(list).toContain("retryAllFailed");
    expect(api).toContain('"/workflow/download/preview"');
  });

  it("keeps waiting cancellation available and uses task events instead of periodic polling", () => {
    const list = source("component/Pages/Tasks/DownloadList.tsx");
    const card = source("component/Pages/Tasks/TaskCard.tsx");
    const files = source("component/Pages/Tasks/DownloadFileList.tsx");

    expect(list).toContain("sendCancelDownloadTask");
    expect(list).toContain("onCancel");
    expect(list).toContain('"/api/v4/workflow/events"');
    expect(list).not.toContain("setInterval");
    expect(card).toContain("download.cancelTask");
    expect(card).toContain('transition: "width');
    expect(files).toContain('transition: "background-size');
  });

  it("reconnects task events and coalesces refreshes without overlapping requests", () => {
    const list = source("component/Pages/Tasks/DownloadList.tsx");

    expect(list).toContain("eventReconnectInitialDelay");
    expect(list).toContain("scheduleReconnect(connect)");
    expect(list).toContain("refreshInFlight.current");
    expect(list).toContain("refreshPending.current");
    expect(list).toContain("const loadNextPage");
    expect(list).toContain("if (refreshInFlight.current)");
    expect(list).toContain("const needsRefresh = refreshPending.current");
    expect(list).toContain("eventController.current?.abort()");
    expect(list).not.toContain("setInterval");
  });

  it("has no stale Aria2 administration text in supported locales", () => {
    for (const locale of readdirSync(join(process.cwd(), "public", "locales"))) {
      const content = readFileSync(join(process.cwd(), "public", "locales", locale, "dashboard.json"), "utf8");
      expect(content).not.toMatch(/aria2|rpc-secret|:6800/i);
      const dashboard = JSON.parse(content);
      expect(dashboard.node.gopeedDes).toBeTruthy();
      expect(dashboard.group.downloaderOptions).toBeTruthy();
      if (locale !== "en-US" && locale !== "zh-CN") {
        expect(dashboard.node.gopeedDes).not.toMatch(/^Connect CloudRevo to the Gopeed REST API/);
        expect(dashboard.group.downloaderOptions).not.toBe("Downloader job options");
      }
    }
  });

  it("submits safe Gopeed connection tuning and preserves the preflight name for the queued row", () => {
    const dialog = source("component/FileManager/Dialogs/CreateRemoteDownload.tsx");
    const workflow = source("api/workflow.ts");

    expect(dialog).toContain("connections");
    expect(dialog).toContain("gopeed");
    expect(dialog).toContain("display_name: preview?.name");
    expect(workflow).toContain("RemoteDownloadTaskOptions");
  });
});
