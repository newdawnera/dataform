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
import UploadedDataInsightsPanel from "./UploadedDataInsightsPanel";
import useDatasetCleaning from "../../hooks/useDatasetCleaning";
import useDatasetUpload from "../../hooks/useDatasetUpload";

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

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-blue-600">
            Phase 4
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
          <CleanedDataPreview result={cleaning.cleaningResult} />
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
