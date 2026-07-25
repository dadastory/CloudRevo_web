import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Checkbox,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useSnackbar } from "notistack";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { sendCreateRemoteDownload, sendPreviewRemoteDownload } from "../../../api/api.ts";
import { DownloadTaskStatus, RemoteDownloadRequestOptions, RemoteDownloadTaskOptions } from "../../../api/workflow.ts";
import { defaultPath } from "../../../hooks/useNavigation.tsx";
import { closeRemoteDownloadDialog } from "../../../redux/globalStateSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../redux/hooks.ts";
import { getFileLinkedUri } from "../../../util";
import { sizeToString } from "../../../util/index.ts";
import CrUri, { Filesystem } from "../../../util/uri.ts";
import { FileDisplayForm } from "../../Common/Form/FileDisplayForm.tsx";
import { OutlineIconTextField } from "../../Common/Form/OutlineIconTextField.tsx";
import { PathSelectorForm } from "../../Common/Form/PathSelectorForm.tsx";
import { ViewTaskAction } from "../../Common/Snackbar/snackbar.tsx";
import DraggableDialog from "../../Dialogs/DraggableDialog.tsx";
import Link from "../../Icons/Link.tsx";
import { FileManagerIndex } from "../FileManager.tsx";
import { classifyRemoteDownloadSource, supportsHTTPTaskControls } from "./remoteDownloadSource.ts";
import { remoteDownloadPreflightErrorMessage } from "./remoteDownloadPreflight.ts";

const CreateRemoteDownload = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState("");
  const [url, setUrl] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [headers, setHeaders] = useState("");
  const [body, setBody] = useState("");
  const [connections, setConnections] = useState("");
  const [preview, setPreview] = useState<DownloadTaskStatus>();
  const [selectedFiles, setSelectedFiles] = useState<number[]>([]);

  const open = useAppSelector((state) => state.globalState.remoteDownloadDialogOpen);
  const target = useAppSelector((state) => state.globalState.remoteDownloadDialogFile);
  const current = useAppSelector((state) => state.fileManager[FileManagerIndex.main].pure_path);
  const sourceLines = url
    .split("\n")
    .map((source) => source.trim())
    .filter(Boolean);
  const sourceKind = sourceLines.length === 1 ? classifyRemoteDownloadSource(sourceLines[0]) : "unknown";
  const showHTTPTaskControls = !target && sourceLines.length === 1 && supportsHTTPTaskControls(sourceLines[0]);

  useEffect(() => {
    if (open) {
      const initialPath = new CrUri(current ?? defaultPath);
      const fs = initialPath.fs();
      setPath(fs == Filesystem.shared_with_me || fs == Filesystem.trash ? defaultPath : initialPath.toString());
      setUrl("");
      setAdvancedOpen(false);
      setMethod("GET");
      setHeaders("");
      setBody("");
      setConnections("");
      setPreview(undefined);
      setSelectedFiles([]);
    }
  }, [open]);

  const onClose = useCallback(() => {
    dispatch(closeRemoteDownloadDialog());
  }, [dispatch]);

  const buildRequest = useCallback(() => {
    if (!showHTTPTaskControls) return undefined;
    let request: RemoteDownloadRequestOptions | undefined;
    if (!target && (headers.trim() || body || method != "GET")) {
      let parsedHeaders: Record<string, string> | undefined;
      if (headers.trim()) {
        try {
          const parsed = JSON.parse(headers);
          if (
            !parsed ||
            Array.isArray(parsed) ||
            typeof parsed != "object" ||
            Object.values(parsed).some((value) => typeof value != "string")
          ) {
            throw new Error("invalid headers");
          }
          parsedHeaders = parsed as Record<string, string>;
        } catch {
          enqueueSnackbar({ message: t("modals.remoteDownloadHeadersInvalid"), variant: "error" });
          return undefined;
        }
      }
      request = { method, headers: parsedHeaders, body: body || undefined };
    }
    return request;
  }, [showHTTPTaskControls, target, headers, body, method, enqueueSnackbar, t]);

  const buildTaskOptions = useCallback((): RemoteDownloadTaskOptions | undefined | null => {
    if (!showHTTPTaskControls) return undefined;
    if (!connections.trim()) {
      return undefined;
    }
    const value = Number(connections);
    if (!Number.isInteger(value) || value < 1 || value > 256) {
      enqueueSnackbar({ message: t("modals.remoteDownloadConnectionsInvalid"), variant: "error" });
      return null;
    }
    return { connections: value };
  }, [showHTTPTaskControls, connections, enqueueSnackbar, t]);

  const onAccept = useCallback(() => {
    if (!target && !url) {
      return;
    }
    const request = buildRequest();
    if (!target && showHTTPTaskControls && (headers.trim() || body || method != "GET") && !request) return;
    const gopeed = buildTaskOptions();
    if (gopeed === null) return;

    const sources = sourceLines;
    if (!preview && !target && sources.length == 1 && sourceKind != "torrent-url") {
      setLoading(true);
      dispatch(sendPreviewRemoteDownload({ src: sources, dst: path, request, gopeed }, true))
        .then((result) => {
          setPreview(result);
          setSelectedFiles(result.files?.map((file) => file.index) ?? []);
        })
        .catch((error: unknown) => {
          enqueueSnackbar({
            message: remoteDownloadPreflightErrorMessage(
              error,
              t("modals.remoteDownloadMagnetTimeout"),
              t("common:unknownError"),
            ),
            variant: "error",
          });
        })
        .finally(() => setLoading(false));
      return;
    }

    setLoading(true);
    dispatch(
      sendCreateRemoteDownload({
        src_file: target ? getFileLinkedUri(target) : undefined,
        dst: path,
        src: sources,
        request,
        gopeed,
        display_name: preview?.name,
        selected_files: preview ? selectedFiles : undefined,
      }),
    )
      .then(() => {
        dispatch(closeRemoteDownloadDialog());
        window.dispatchEvent(new Event("cloudrevo:download-tasks-changed"));
        enqueueSnackbar({
          message: t("modals.taskCreated"),
          variant: "success",
          action: ViewTaskAction("/downloads"),
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    target,
    url,
    path,
    headers,
    body,
    method,
    sourceKind,
    sourceLines,
    showHTTPTaskControls,
    preview,
    selectedFiles,
    buildRequest,
    buildTaskOptions,
    dispatch,
    enqueueSnackbar,
    t,
  ]);

  const togglePreviewFile = (index: number) => {
    setSelectedFiles((current) =>
      current.includes(index) ? current.filter((value) => value != index) : [...current, index],
    );
  };

  return (
    <DraggableDialog
      title={t("application:modals.newRemoteDownloadTitle")}
      showActions
      loading={loading}
      disabled={(!target && !url) || (!!preview && selectedFiles.length == 0)}
      okText={
        preview
          ? t("modals.remoteDownloadStart")
          : target || url.split("\n").filter(Boolean).length != 1
            ? t("common:ok")
            : t("modals.remoteDownloadPreview")
      }
      showCancel
      onAccept={onAccept}
      dialogProps={{
        open: open ?? false,
        onClose: onClose,
        fullWidth: true,
        maxWidth: "sm",
        disableRestoreFocus: true,
      }}
    >
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          {preview && (
            <Stack spacing={1.25}>
              <Alert severity="success" variant="outlined">
                {t("modals.remoteDownloadPreviewReady")}
              </Alert>
              <Typography variant="subtitle2">{preview.name || t("download.unknownTaskName")}</Typography>
              <Typography variant="caption" color="text.secondary">
                {t("modals.remoteDownloadPreviewSize", { size: sizeToString(preview.total) })}
              </Typography>
              <Stack
                spacing={0.25}
                sx={{
                  maxHeight: 220,
                  overflowY: "auto",
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  borderRadius: 1,
                  p: 0.5,
                }}
              >
                {preview.files?.map((file) => (
                  <Stack key={file.index} direction="row" alignItems="center" spacing={0.5} sx={{ py: 0.25 }}>
                    <Checkbox
                      size="small"
                      checked={selectedFiles.includes(file.index)}
                      onChange={() => togglePreviewFile(file.index)}
                    />
                    <Typography
                      variant="body2"
                      sx={{ flexGrow: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    >
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {sizeToString(file.size)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          )}
          {!preview && (
            <>
              <Stack spacing={3} direction={isMobile ? "column" : "row"}>
                {target && <FileDisplayForm file={target} label={t("modals.remoteDownloadURL")} />}
                {!target && (
                  <OutlineIconTextField
                    icon={<Link />}
                    variant="outlined"
                    value={url}
                    multiline
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={t("modals.remoteDownloadURLDescription")}
                    label={t("application:modals.remoteDownloadURL")}
                    fullWidth
                  />
                )}
              </Stack>
              {!target && sourceKind == "torrent-url" && (
                <Alert severity="info" variant="outlined">
                  {t("modals.remoteDownloadTorrentInfo")}
                </Alert>
              )}
              {!target && showHTTPTaskControls && (
                <Accordion
                  expanded={advancedOpen}
                  onChange={(_event, expanded) => setAdvancedOpen(expanded)}
                  disableGutters
                  elevation={0}
                  sx={{
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    "&:before": { display: "none" },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<span>⌄</span>}
                    sx={{ minHeight: 44, "& .MuiAccordionSummary-content": { my: 1 } }}
                  >
                    <Stack spacing={0.25}>
                      <Typography variant="subtitle2">{t("modals.remoteDownloadAdvanced")}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t("modals.remoteDownloadAdvancedDescription")}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <Alert severity="info" variant="outlined">
                        {t("modals.remoteDownloadAuthorizedHeaders")}
                      </Alert>
                      <TextField
                        select
                        label={t("modals.remoteDownloadMethod")}
                        size="small"
                        value={method}
                        onChange={(event) => setMethod(event.target.value as "GET" | "POST")}
                      >
                        <MenuItem value="GET">GET</MenuItem>
                        <MenuItem value="POST">POST</MenuItem>
                      </TextField>
                      <TextField
                        label={t("modals.remoteDownloadConnections")}
                        helperText={t("modals.remoteDownloadConnectionsDescription")}
                        size="small"
                        type="number"
                        value={connections}
                        onChange={(event) => setConnections(event.target.value)}
                        inputProps={{ min: 1, max: 256, step: 1 }}
                      />
                      <TextField
                        label={t("modals.remoteDownloadHeaders")}
                        helperText={t("modals.remoteDownloadHeadersDescription")}
                        value={headers}
                        onChange={(event) => setHeaders(event.target.value)}
                        multiline
                        minRows={3}
                        placeholder={'{\n  "Referer": "https://example.com/",\n  "Cookie": "session=..."\n}'}
                      />
                      <TextField
                        label={t("modals.remoteDownloadBody")}
                        value={body}
                        onChange={(event) => setBody(event.target.value)}
                        multiline
                        minRows={2}
                        disabled={method != "POST"}
                      />
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              )}
              <Stack spacing={3} direction={isMobile ? "column" : "row"}>
                <PathSelectorForm
                  onChange={setPath}
                  path={path}
                  variant={"downloadTo"}
                  label={t("modals.remoteDownloadDst")}
                />
              </Stack>
            </>
          )}
        </Stack>
      </DialogContent>
    </DraggableDialog>
  );
};
export default CreateRemoteDownload;
