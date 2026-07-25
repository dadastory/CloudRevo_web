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
const eventReconnectInitialDelay = 1000;
const eventReconnectMaxDelay = 30000;
const eventStreamStableDuration = 5000;

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
  const mounted = useRef(false);
  const refreshInFlight = useRef(false);
  const refreshPending = useRef(false);
  const eventController = useRef<AbortController>();
  const eventReconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const eventReconnectDelay = useRef(eventReconnectInitialDelay);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [downloading, downloaded] = await Promise.all([
        dispatch(
          getTasks({
            page_size: defaultPageSize,
            category: ListTaskCategory.downloading,
          }),
        ),
        dispatch(
          getTasks({
            page_size: defaultPageSize,
            category: ListTaskCategory.downloaded,
            next_page_token: "",
          }),
        ),
      ]);
      if (!mounted.current) return;

      setDownloadingTasks(downloading.tasks);
      setTasks(downloaded.tasks);
      setSelectedTaskIDs([]);
      setNextPageToken(downloaded.pagination?.next_token);
    } catch {
      if (mounted.current) {
        setNextPageToken(undefined);
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [dispatch]);

  const refresh = useCallback(() => {
    if (refreshInFlight.current) {
      refreshPending.current = true;
      return;
    }
    refreshInFlight.current = true;
    void (async () => {
      do {
        refreshPending.current = false;
        await reload();
      } while (mounted.current && refreshPending.current);
      refreshInFlight.current = false;
    })();
  }, [reload]);

  const loadNextPage = useCallback(
    (originTasks: TaskResponse[], token?: string) => () => {
      // The event stream can request a full refresh while the observer asks for
      // the next history page. Serialize both operations so a stale page can
      // never overwrite a newer snapshot from the server.
      if (refreshInFlight.current) {
        refreshPending.current = true;
        return;
      }

      refreshInFlight.current = true;
      setLoading(true);
      void dispatch(
        getTasks({
          page_size: defaultPageSize,
          category: ListTaskCategory.downloaded,
          next_page_token: token,
        }),
      )
        .then((res) => {
          if (!mounted.current) return;
          setTasks([...originTasks, ...res.tasks]);
          setSelectedTaskIDs([]);
          setNextPageToken(res.pagination?.next_token);
        })
        .catch(() => {
          if (mounted.current) {
            setNextPageToken(undefined);
          }
        })
        .finally(() => {
          const needsRefresh = refreshPending.current;
          refreshPending.current = false;
          refreshInFlight.current = false;
          if (mounted.current) {
            setLoading(false);
            if (needsRefresh) refresh();
          }
        });
    },
    [dispatch, refresh],
  );

  const loadDownloading = useCallback(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const onTasksChanged = () => refresh();
    window.addEventListener("cloudrevo:download-tasks-changed", onTasksChanged);

    const scheduleReconnect = (connect: () => void) => {
      if (!mounted.current) return;
      const delay = eventReconnectDelay.current;
      eventReconnectDelay.current = Math.min(delay * 2, eventReconnectMaxDelay);
      eventReconnectTimer.current = setTimeout(connect, delay);
    };

    const connect = () => {
      if (!mounted.current) return;
      eventController.current?.abort();
      const controller = new AbortController();
      eventController.current = controller;
      const connectedAt = Date.now();
      void (async () => {
        try {
          const token = await SessionManager.getAccessToken();
          if (controller.signal.aborted) return;
          const response = await fetch("/api/v4/workflow/events", {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            throw new Error("workflow event stream unavailable");
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let pending = "";
          while (!controller.signal.aborted) {
            const { value, done } = await reader.read();
            if (done) break;
            pending += decoder.decode(value, { stream: true });
            const messages = pending.split("\n\n");
            pending = messages.pop() ?? "";
            if (messages.some((message) => message.includes("event: task"))) refresh();
          }
        } catch {
          // Reconnect below unless this page intentionally aborted the stream.
        } finally {
          if (!controller.signal.aborted && mounted.current) {
            if (Date.now() - connectedAt >= eventStreamStableDuration) {
              eventReconnectDelay.current = eventReconnectInitialDelay;
            }
            scheduleReconnect(connect);
          }
        }
      })();
    };

    connect();
    return () => {
      mounted.current = false;
      window.removeEventListener("cloudrevo:download-tasks-changed", onTasksChanged);
      eventController.current?.abort();
      if (eventReconnectTimer.current) {
        clearTimeout(eventReconnectTimer.current);
      }
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
