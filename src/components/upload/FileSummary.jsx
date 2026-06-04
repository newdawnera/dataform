import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { createElement } from "react";

import Card from "../Card";
import { formatFileSize } from "../../utils/csvParser";

const STATUS_COPY = {
  error: "Needs attention",
  idle: "Waiting",
  parsing: "Parsing",
  ready: "Ready",
};

const STATUS_CLASSES = {
  error: "bg-rose-50 text-rose-700 border-rose-200",
  idle: "bg-slate-50 text-slate-600 border-slate-200",
  parsing: "bg-blue-50 text-blue-700 border-blue-200",
  ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function FileSummary({
  errors,
  file,
  onReset,
  profile,
  status,
  warnings,
}) {
  const showReset = Boolean(file) || errors.length > 0 || warnings.length > 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Selected File
          </p>
          <h3 className="mt-2 break-all text-lg font-bold text-slate-900">
            {file?.name || "No file selected"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {file ? formatFileSize(file.size) : "CSV or .xlsx, up to 10 MB"}
          </p>
        </div>

        {showReset && (
          <button
            aria-label="Clear uploaded file"
            className="rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            onClick={onReset}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div
        className={`mt-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${STATUS_CLASSES[status]}`}
      >
        {status === "parsing" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === "ready" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Info className="h-3.5 w-3.5" />
        )}
        {STATUS_COPY[status]}
      </div>

      {profile && (
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-500">Rows</dt>
            <dd className="mt-1 font-bold text-slate-900">{profile.rowCount}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-500">Columns</dt>
            <dd className="mt-1 font-bold text-slate-900">
              {profile.columnCount}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-500">Format</dt>
            <dd className="mt-1 font-bold text-slate-900">
              {formatDatasetSource(profile)}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-500">Duplicates</dt>
            <dd className="mt-1 font-bold text-slate-900">
              {profile.duplicateColumnNames.length}
            </dd>
          </div>
        </dl>
      )}

      {errors.length > 0 && (
        <MessageList
          icon={AlertCircle}
          items={errors}
          tone="error"
          title="Validation"
        />
      )}

      {warnings.length > 0 && (
        <MessageList
          icon={Info}
          items={warnings}
          tone="warning"
          title="Warnings"
        />
      )}

      <div className="mt-5 flex items-start gap-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
        <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Uploaded files are processed locally in your browser. No model is
          trained by this app.
        </p>
      </div>
    </Card>
  );
}

function MessageList({ icon: Icon, items, title, tone }) {
  const toneClasses =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <div className={`mt-5 rounded-lg border p-3 ${toneClasses}`}>
      <div className="flex items-center gap-2 text-sm font-bold">
        {createElement(Icon, { className: "h-4 w-4" })}
        {title}
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatDatasetSource(profile) {
  if (profile.fileType === "xlsx") return "Excel (.xlsx)";
  return `CSV (${formatDelimiter(profile.delimiter)})`;
}

function formatDelimiter(delimiter) {
  if (delimiter === "\t") return "Tab";
  if (delimiter === ",") return "Comma";
  if (delimiter === ";") return "Semicolon";
  if (delimiter === "|") return "Pipe";
  return delimiter || "Unknown";
}
