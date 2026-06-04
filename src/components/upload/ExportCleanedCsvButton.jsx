import { Download } from "lucide-react";

import { buildCsv, createCleanedCsvFilename } from "../../data/csvExporter";

export default function ExportCleanedCsvButton({ fileName, result }) {
  const isDisabled = !result || result.headers.length === 0;

  const handleExport = () => {
    if (isDisabled) return;

    const csv = buildCsv({ headers: result.headers, rows: result.rows });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = createCleanedCsvFilename(fileName);
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">Export cleaned CSV</h3>
        <p className="mt-1 text-sm text-slate-500">
          Downloads the cleaned dataset from browser memory. No server upload.
        </p>
      </div>
      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isDisabled}
        onClick={handleExport}
        type="button"
      >
        <Download className="h-4 w-4" />
        Export cleaned CSV
      </button>
    </div>
  );
}
