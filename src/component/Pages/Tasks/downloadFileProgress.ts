import { DownloadTaskFile } from "../../../api/workflow.ts";

export function fileProgressDetails(file?: Pick<DownloadTaskFile, "progress" | "progress_known">) {
  const known = file?.progress_known === true;
  const percentage = known ? (file.progress ?? 0) * 100 : 0;

  return {
    known,
    percentage,
    label: known ? `${percentage.toFixed(2)} %` : "—",
  };
}
