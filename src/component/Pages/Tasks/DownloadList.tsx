import { useCallback, useEffect, useRef, useState } from "react";
import { ListTaskCategory, TaskResponse, TaskStatus } from "../../../api/workflow.ts";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import PageHeader from "../PageHeader.tsx";
import { getTasks, sendCancelDownloadTask, sendDeleteDownloadTasks, sendRetryDownloadTasks } from "../../../api/api.ts";
import { useAppDispatch } from "../../../redux/hooks.ts";
import { confirmOperation } from "../../../redux/thunks/dialog.ts";
import Nothing from "../../Common/Nothing.tsx";
import ArrowSync from "../../Icons/ArrowSync.tsx";
import Delete from "../../Icons/Delete.tsx";
import { useSnackbar } from "notistack";
import TaskCard from "./TaskCard.tsx";
import PageContainer from "../PageContainer.tsx";
import SessionManager from "../../../session/index.ts";

const defaultPageSize = 25;

const DownloadList = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [nextPageToken, setNextPageToken] = useState<string | undefined>("");
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [downloadingTasks, setDownloadingTasks] = useState<TaskResponse[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [selectedTaskIDs, setSelectedTaskIDs] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const downloadingListHash = useRef("");

  const loadNextPage = useCallback(
    (originTasks: TaskResponse[], token?: string) => () => {
      setLoading(true);
      dispatch(
        getTasks({
          page_size: defaultPageSize,
          category: ListTaskCategory.downloaded,
          next_page_token: token,
        }),
      )
        .then((res) => {
          setTasks([...originTasks, ...res.tasks]);
          setSelectedTaskIDs([]);
          if (res.pagination?.next_token) {
            setNextPageToken(res.pagination.next_token);
          } else {
            setNextPageToken(undefined);
          }
        })
        .catch(() => {
          setNextPageToken(undefined);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [dispatch, setTasks],
  );

  const loadDownloading = useCallback(() => {
    setLoading(true);
    dispatch(
      getTasks({
        page_size: defaultPageSize,
        category: ListTaskCategory.downloading,
      }),
    )
      .then((res) => {
        setDownloadingTasks(res.tasks);
        // New hash = id of first downloading task + id of last downloading task + length of downloading tasks
        const newHash = `${res.tasks[0]?.id ?? ""}-${res.tasks[res.tasks.length - 1]?.id ?? ""}-${res.tasks.length}`;

        if (downloadingListHash.current != "" && downloadingListHash.current != newHash) {
          loadNextPage([], "")();
        }
        downloadingListHash.current = newHash;
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [dispatch, setDownloadingTasks]);

  const refresh = useCallback(() => {
    loadDownloading();
    loadNextPage([], "")();
  }, [loadDownloading, loadNextPage]);

  useEffect(() => {
    refresh();
    const onTasksChanged = () => refresh();
    window.addEventListener("cloudrevo:download-tasks-changed", onTasksChanged);
    const controller = new AbortController();
    void (async () => {
      const token = await SessionManager.getAccessToken();
      const response = await fetch("/api/v4/workflow/events", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let pending = "";
      while (!controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) return;
        pending += decoder.decode(value, { stream: true });
        const messages = pending.split("\n\n");
        pending = messages.pop() ?? "";
        if (messages.some((message) => message.includes("event: task"))) refresh();
      }
    })().catch(() => {});
    return () => {
      window.removeEventListener("cloudrevo:download-tasks-changed", onTasksChanged);
      controller.abort();
    };
  }, [refresh]);

  const selectedTasks = tasks.filter((task) => selectedTaskIDs.includes(task.id));
  const selectedFailedTaskIDs = selectedTasks.filter((task) => task.status == TaskStatus.error).map((task) => task.id);
  const failedTaskIDs = tasks.filter((task) => task.status == TaskStatus.error).map((task) => task.id);
  const allLoadedSelected = tasks.length > 0 && tasks.every((task) => selectedTaskIDs.includes(task.id));

  const toggleTaskSelection = (task: TaskResponse) => {
    setSelectedTaskIDs((previous) =>
      previous.includes(task.id) ? previous.filter((id) => id != task.id) : [...previous, task.id],
    );
  };

  const toggleAllTasks = () => {
    setSelectedTaskIDs(allLoadedSelected ? [] : tasks.map((task) => task.id));
  };

  const retryTasks = (ids: string[]) => {
    if (ids.length == 0) {
      return;
    }
    setActionLoading(true);
    dispatch(sendRetryDownloadTasks({ ids }))
      .then(() => {
        enqueueSnackbar({ message: t("download.retrySubmitted", { num: ids.length }), variant: "success" });
        refresh();
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  const deleteTasks = (ids: string[]) => {
    if (ids.length == 0) {
      return;
    }
    dispatch(confirmOperation(t("download.deleteTaskConfirm", { num: ids.length }))).then(() => {
      setActionLoading(true);
      dispatch(sendDeleteDownloadTasks({ ids }))
        .then(() => {
          enqueueSnackbar({ message: t("download.taskDeleted"), variant: "success" });
          refresh();
        })
        .finally(() => {
          setActionLoading(false);
        });
    });
  };

  const cancelTask = (id: string) => {
    dispatch(confirmOperation(t("download.cancelTaskConfirm"))).then(() => {
      setActionLoading(true);
      dispatch(sendCancelDownloadTask(id))
        .then(() => {
          enqueueSnackbar({ message: t("download.taskCanceled"), variant: "success" });
          refresh();
        })
        .finally(() => setActionLoading(false));
    });
  };

  return (
    <PageContainer>
      <Container maxWidth="lg">
        <PageHeader onRefresh={refresh} loading={loading} title={t("application:navbar.remoteDownload")} />
        {selectedTaskIDs.length > 0 && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ sm: "center" }}
            sx={{ mb: 2, p: 1.25, borderRadius: 1, bgcolor: "action.selected" }}
          >
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              {t("download.selectedTasks", { num: selectedTaskIDs.length })}
            </Typography>
            <Button
              size="small"
              startIcon={<ArrowSync />}
              disabled={actionLoading || selectedFailedTaskIDs.length == 0}
              onClick={() => retryTasks(selectedFailedTaskIDs)}
            >
              {t("download.retrySelected", { num: selectedFailedTaskIDs.length })}
            </Button>
            <Button
              size="small"
              color="error"
              startIcon={<Delete />}
              disabled={actionLoading}
              onClick={() => deleteTasks(selectedTaskIDs)}
            >
              {t("download.deleteSelected")}
            </Button>
          </Stack>
        )}
        <Typography variant={"h5"} sx={{ mb: 2 }} color={"text.secondary"} fontWeight={500}>
          {t("download.active")}
        </Typography>
        {downloadingTasks != undefined && downloadingTasks.length == 0 && (
          <Box sx={{ p: 1, width: "100%", textAlign: "center" }}>
            <Nothing size={0.8} top={63} primary={t("setting.listEmpty")} />
          </Box>
        )}
        {downloadingTasks == undefined && <TaskCard onLoad={loadDownloading} loading={true} />}

        {downloadingTasks && downloadingTasks.map((task) => (
          <TaskCard
            showProgress
            key={task.id}
            task={task}
            onCancel={task.status == TaskStatus.queued ? (queuedTask) => cancelTask(queuedTask.id) : undefined}
            actionLoading={actionLoading}
          />
        ))}
        <Typography variant={"h5"} sx={{ mb: 2, mt: 3 }} color={"text.secondary"} fontWeight={500}>
          {t("download.finished")}
        </Typography>
        {tasks.length > 0 && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.5 }}>
            <Button size="small" variant="outlined" onClick={toggleAllTasks} disabled={actionLoading}>
              {t(allLoadedSelected ? "download.clearSelection" : "download.selectAllCurrent")}
            </Button>
            <Button
              size="small"
              startIcon={<ArrowSync />}
              onClick={() => retryTasks(failedTaskIDs)}
              disabled={actionLoading || failedTaskIDs.length == 0}
            >
              {t("download.retryAllFailed", { num: failedTaskIDs.length })}
            </Button>
          </Stack>
        )}
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            selected={selectedTaskIDs.includes(task.id)}
            onSelect={toggleTaskSelection}
            onRetry={task.status == TaskStatus.error ? (selectedTask) => retryTasks([selectedTask.id]) : undefined}
            onDelete={(selectedTask) => deleteTasks([selectedTask.id])}
            actionLoading={actionLoading}
          />
        ))}
        {nextPageToken != undefined && (
          <TaskCard onLoad={loadNextPage(tasks, nextPageToken)} loading={true} key={nextPageToken} />
        )}

        {nextPageToken == undefined && tasks.length == 0 && (
          <Box sx={{ p: 1, width: "100%", textAlign: "center" }}>
            <Nothing size={0.8} top={63} primary={t("setting.listEmpty")} />
          </Box>
        )}
      </Container>
    </PageContainer>
  );
};

export default DownloadList;
