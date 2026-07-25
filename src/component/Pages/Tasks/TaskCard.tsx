import {
  Box,
  Checkbox,
  darken,
  IconButton,
  lighten,
  Skeleton,
  styled,
  SvgIconProps,
  Theme,
  Typography,
  Tooltip,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MuiAccordion, { AccordionProps } from "@mui/material/Accordion";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import MuiAccordionSummary, { AccordionSummaryProps } from "@mui/material/AccordionSummary";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useInView } from "react-intersection-observer";
import { FileType } from "../../../api/explorer.ts";
import { TaskResponse, TaskType } from "../../../api/workflow.ts";
import { DefaultButton } from "../../Common/StyledComponents.tsx";
import FileIcon from "../../FileManager/Explorer/FileIcon.tsx";
import Archive from "../../Icons/Archive.tsx";
import ArchiveArrow from "../../Icons/ArchiveArrow.tsx";
import ArrowImport from "../../Icons/ArrowImport.tsx";
import Dismiss from "../../Icons/Dismiss.tsx";
import Delete from "../../Icons/Delete.tsx";
import ArrowSync from "../../Icons/ArrowSync.tsx";
import TaskDetail from "./TaskDetail.tsx";
import TaskSummaryStatus from "./TaskSummaryStatus.tsx";
import TaskSummaryTitle from "./TaskSummaryTitle.tsx";

const Accordion = styled((props: AccordionProps) => <MuiAccordion disableGutters elevation={0} square {...props} />)(({
  theme,
  expanded,
}) => {
  const bgColor = expanded
    ? theme.palette.mode == "light"
      ? "rgba(0, 0, 0, 0.06)"
      : "rgba(255, 255, 255, 0.09)"
    : "initial";
  return {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: bgColor,
    "&::before": {
      display: "none",
    },
    boxShadow: expanded ? `0 0 0 1px ${theme.palette.divider}` : "none",
    position: "relative",
    overflow: "hidden",
    marginBottom: theme.spacing(1),
  };
});

const AccordionSummary = styled((props: AccordionSummaryProps) => <MuiAccordionSummary {...props} />)(() => ({
  flexDirection: "row-reverse",
  minHeight: 0,
  padding: 0,
  "& .MuiAccordionSummary-content": {
    margin: 0,
  },
}));

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: `0 0 ${theme.shape.borderRadius}px ${theme.shape.borderRadius}px`,
  backgroundColor: theme.palette.background.default,
}));

export const getProgressColor = (theme: Theme) =>
  theme.palette.mode === "dark" ? darken(theme.palette.primary.main, 0.4) : lighten(theme.palette.primary.main, 0.85);

export const SummaryButton = styled(DefaultButton)<{
  expanded: boolean;
  percentage?: number;
}>(({ theme, expanded, percentage }) => {
  percentage = percentage ?? 0;
  const bgColor = theme.palette.mode == "light" ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.09)";
  const progressColor = getProgressColor(theme);
  const progressBgColor = !expanded ? bgColor : "rgba(0,0,0,0)";
  return {
    minHeight: 48,
    justifyContent: "flex-start",
    transition: "all 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
    borderRadius: expanded
      ? `${theme.shape.borderRadius}px ${theme.shape.borderRadius}px 0 0`
      : `${theme.shape.borderRadius}px`,
    backgroundColor: progressBgColor,
    "&::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      width: `${percentage}%`,
      backgroundColor: progressColor,
      pointerEvents: "none",
      transition: "width 4.5s linear",
    },
    "& > *": { position: "relative" },
    "&:hover": {
      backgroundColor: theme.palette.mode == "light" ? "rgba(0, 0, 0, 0.09)" : "rgba(255, 255, 255, 0.13)",
    },
  };
});

export interface TaskCardProps {
  loading?: boolean;
  showProgress?: boolean;
  task?: TaskResponse;
  onLoad?: () => void;
  selected?: boolean;
  onSelect?: (task: TaskResponse) => void;
  onRetry?: (task: TaskResponse) => void;
  onDelete?: (task: TaskResponse) => void;
  onCancel?: (task: TaskResponse) => void;
  actionLoading?: boolean;
}

const taskIconsMap: {
  [key: string]: (props: SvgIconProps) => JSX.Element;
} = {
  [TaskType.create_archive]: Archive,
  [TaskType.extract_archive]: ArchiveArrow,
  [TaskType.import]: ArrowImport,
};

const TaskCard = ({
  loading,
  showProgress,
  onLoad,
  task,
  selected,
  onSelect,
  onRetry,
  onDelete,
  onCancel,
  actionLoading,
}: TaskCardProps) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { ref, inView } = useInView({
    rootMargin: "200px 0px",
    triggerOnce: true,
    skip: !loading,
  });

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!inView) {
      return;
    }

    if (onLoad) {
      onLoad();
    }
  }, [inView]);

  const handleChange = (_event: React.SyntheticEvent, newExpanded: boolean) => {
    if (loading) {
      return;
    }
    setExpanded(newExpanded);
  };

  const TaskIcon = useMemo(() => {
    return taskIconsMap[task?.type ?? ""] ?? Archive;
  }, [task?.type]);

  return (
    <Accordion expanded={expanded} onChange={handleChange} TransitionProps={{ unmountOnExit: true }}>
      <AccordionSummary aria-controls="panel1d-content">
        <SummaryButton
          disabled={loading}
          size={"large"}
          expanded={expanded}
          fullWidth
          percentage={
            showProgress
              ? ((task?.summary?.props?.download?.downloaded ?? 0) * 100) /
                Math.max(task?.summary?.props?.download?.total ?? 0, 1)
              : undefined
          }
          startIcon={
            loading ? (
              <Skeleton ref={loading ? ref : undefined} variant={"rounded"} width={22} height={22} />
            ) : task?.type === TaskType.remote_download ? (
              <FileIcon
                sx={{
                  p: 0,
                  height: 30,
                }}
                file={{
                  type: (task?.summary?.props.download?.files?.length ?? 0) > 1 ? FileType.folder : FileType.file,
                  name: task?.summary?.props.download?.name ?? "",
                }}
              />
            ) : (
              <TaskIcon />
            )
          }
        >
          <Box
            sx={{
              display: "flex",
              width: "100%",
              textAlign: "left",
              justifyContent: "space-between",
            }}
          >
            <Box
              sx={{
                flexGrow: 1,
                wordBreak: "break-all",
                minWidth: 0,
              }}
            >
              {loading || !task ? (
                <Skeleton variant={"text"} width={150} />
              ) : (
                <Box component={"span"} sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                  {onSelect && (
                    <Checkbox
                      checked={selected}
                      size="small"
                      onClick={(event) => event.stopPropagation()}
                      onChange={() => onSelect(task)}
                      inputProps={{ "aria-label": t("download.selectTask") }}
                    />
                  )}
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Box component={"span"} sx={{ verticalAlign: "sub" }}>
                      <TaskSummaryTitle type={task.type} summary={task.summary} />
                    </Box>
                    {!!task.summary?.props?.src_str && (
                      <Typography variant="caption" color="text.secondary" noWrap display="block">
                        {task.summary.props.src_str}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Box>

            <Box color={"text.secondary"} sx={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              {loading || !task ? (
                <Skeleton variant={"text"} width={50} />
              ) : (
                <TaskSummaryStatus
                  simplified={isMobile}
                  type={task.type}
                  status={task.status}
                  error={task.error}
                  summary={task.summary}
                />
              )}
              {!loading && task && onRetry && task.status === "error" && (
                <Tooltip title={t("download.retryTask")}>
                  <span>
                    <IconButton
                      size="small"
                      disabled={actionLoading}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRetry(task);
                      }}
                    >
                      <ArrowSync fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              {!loading && task && onCancel && ["queued", "processing", "suspending"].includes(task.status) && (
                <Tooltip title={t("download.cancelTask")}>
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={actionLoading}
                      onClick={(event) => {
                        event.stopPropagation();
                        onCancel(task);
                      }}
                    >
                      <Dismiss fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              {!loading && task && onDelete && (
                <Tooltip title={t("download.deleteRecord")}>
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={actionLoading}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(task);
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Box>
        </SummaryButton>
      </AccordionSummary>
      <AccordionDetails>{task && <TaskDetail task={task} downloading={showProgress} />}</AccordionDetails>
    </Accordion>
  );
};

export default TaskCard;
