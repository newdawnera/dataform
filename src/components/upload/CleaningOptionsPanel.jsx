import { RotateCcw, Wand2 } from "lucide-react";

import Card from "../Card";
import SectionHeader from "../SectionHeader";

const CLEANING_OPTIONS = [
  {
    detail: "Trim leading and trailing spaces without changing internal text.",
    key: "trimWhitespace",
    label: "Trim whitespace",
  },
  {
    detail: "Lowercase headers, replace separators with underscores, and suffix duplicates.",
    key: "normalizeHeaders",
    label: "Normalize column names",
  },
  {
    detail: "Convert empty strings and safe placeholders such as N/A or null to blanks.",
    key: "normalizeMissingValues",
    label: "Standardize missing values",
  },
  {
    detail: "Drop rows where every cell is empty after selected cleanup.",
    key: "removeEmptyRows",
    label: "Remove empty rows",
  },
  {
    detail: "Keep the first occurrence and remove exact duplicate rows.",
    key: "removeDuplicateRows",
    label: "Remove duplicate rows",
  },
  {
    detail: "Convert high-confidence numeric values such as 1,234 or $1,234.50.",
    key: "coerceNumbers",
    label: "Coerce numbers",
  },
  {
    detail: "Normalize safe high-confidence dates to YYYY-MM-DD.",
    key: "coerceDates",
    label: "Coerce dates",
  },
  {
    detail: "Standardize true/false, yes/no, y/n, and 1/0 values.",
    key: "coerceBooleans",
    label: "Coerce booleans",
  },
];

export default function CleaningOptionsPanel({
  hasAppliedCleaning,
  onApply,
  onOptionChange,
  onReset,
  options,
  quality,
}) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader
          subtitle="Choose the transparent deterministic actions to apply."
          title={
            <>
              <Wand2 className="h-5 w-5 text-slate-500" />
              Apply Cleaning
            </>
          }
        />
        <div className="flex flex-wrap gap-2">
          {hasAppliedCleaning && (
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              onClick={onReset}
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={quality.totalRows === 0}
            onClick={onApply}
            type="button"
          >
            <Wand2 className="h-4 w-4" />
            Apply cleaning
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {CLEANING_OPTIONS.map((option) => (
          <label
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50"
            key={option.key}
          >
            <input
              checked={Boolean(options[option.key])}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              onChange={(event) =>
                onOptionChange(option.key, event.target.checked)
              }
              type="checkbox"
            />
            <span>
              <span className="block text-sm font-bold text-slate-900">
                {option.label}
              </span>
              <span className="block text-sm leading-5 text-slate-500">
                {option.detail}
              </span>
            </span>
          </label>
        ))}
      </div>
    </Card>
  );
}
