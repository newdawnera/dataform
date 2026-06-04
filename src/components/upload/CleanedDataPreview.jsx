import DataPreviewTable from "./DataPreviewTable";

const CLEANED_PREVIEW_LIMIT = 50;

export default function CleanedDataPreview({ result }) {
  if (!result) return null;

  return (
    <DataPreviewTable
      headers={result.headers}
      previewLimit={CLEANED_PREVIEW_LIMIT}
      rows={result.rows.slice(0, CLEANED_PREVIEW_LIMIT)}
      subtitle={`Showing first ${Math.min(
        result.rows.length,
        CLEANED_PREVIEW_LIMIT,
      )} of ${result.rows.length} cleaned rows.`}
      title="Cleaned Preview"
      totalRows={result.rows.length}
    />
  );
}
