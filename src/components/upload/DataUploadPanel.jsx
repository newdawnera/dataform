import { useMemo, useState } from "react";

import ColumnProfileTable from "./ColumnProfileTable";
import CleanedDataPreview from "./CleanedDataPreview";
import CleaningOptionsPanel from "./CleaningOptionsPanel";
import CleaningSummary from "./CleaningSummary";
import DataPreviewTable from "./DataPreviewTable";
import DataQualitySummary from "./DataQualitySummary";
import ExportCleanedCsvButton from "./ExportCleanedCsvButton";
import FileDropzone from "./FileDropzone";
import FileSummary from "./FileSummary";
import UploadEmptyState from "./UploadEmptyState";
import UploadedDataChartsPanel from "./UploadedDataChartsPanel";
import UploadedDataInsightsPanel from "./UploadedDataInsightsPanel";
import UploadedRevenueDashboard from "./UploadedRevenueDashboard";
import useDatasetCleaning from "../../hooks/useDatasetCleaning";
import useDatasetUpload from "../../hooks/useDatasetUpload";
import { applyCrossFilter } from "./crossFilter";

export default function DataUploadPanel() {
  const {
    errors,
    datasetId,
    file,
    headers,
    importFile,
    previewLimit,
    previewRows,
    profile,
    resetUpload,
    rows,
    status,
    warnings,
  } = useDatasetUpload();
  const cleaning = useDatasetCleaning({ datasetId, headers, rows });

  const [crossFilter, setCrossFilter] = useState(null);
  const [filterSource, setFilterSource] = useState(cleaning.cleaningResult);

  // Drop any active cross-filter whenever a new cleaned result arrives
  // (new upload, or cleaning re-applied) so a stale filter never sticks.
  // Uses React's adjust-state-during-render pattern instead of an effect.
  if (filterSource !== cleaning.cleaningResult) {
    setFilterSource(cleaning.cleaningResult);
    setCrossFilter(null);
  }

  const filteredResult = useMemo(
    () => applyCrossFilter(cleaning.cleaningResult, crossFilter),
    [cleaning.cleaningResult, crossFilter],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
            Local data workspace
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Data Upload Workspace
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Import a dataset, review quality issues, apply transparent local
            cleaning, export a cleaned CSV, and request secure AI insights from
            a privacy-safe summary.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <FileDropzone onFileSelect={importFile} status={status} />
        <FileSummary
          errors={errors}
          file={file}
          onReset={resetUpload}
          profile={profile}
          status={status}
          warnings={warnings}
        />
      </div>

      {status === "idle" && <UploadEmptyState />}

      {profile && (
        <>
          <ColumnProfileTable profile={profile} />
          <DataPreviewTable
            headers={headers}
            previewLimit={previewLimit}
            rows={previewRows}
            totalRows={profile.rowCount}
          />
          <DataQualitySummary quality={cleaning.quality} />
          <CleaningOptionsPanel
            hasAppliedCleaning={cleaning.hasAppliedCleaning}
            onApply={cleaning.applyCleaning}
            onOptionChange={cleaning.setOption}
            onReset={cleaning.resetCleaning}
            options={cleaning.options}
            quality={cleaning.quality}
          />
          <CleaningSummary result={cleaning.cleaningResult} />
          <CleanedDataPreview result={filteredResult} />
          <UploadedRevenueDashboard result={cleaning.cleaningResult} />
          <UploadedDataChartsPanel
            crossFilter={crossFilter}
            filteredResult={filteredResult}
            onCrossFilter={setCrossFilter}
            result={cleaning.cleaningResult}
          />
          <ExportCleanedCsvButton
            fileName={file?.name}
            result={cleaning.cleaningResult}
          />
          <UploadedDataInsightsPanel
            cleaningResult={cleaning.cleaningResult}
            file={file}
            profile={profile}
            uploadStatus={status}
          />
        </>
      )}
    </section>
  );
}
