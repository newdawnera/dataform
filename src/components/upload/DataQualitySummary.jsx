import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

import Card from "../Card";
import SectionHeader from "../SectionHeader";

export default function DataQualitySummary({ quality }) {
  if (!quality) return null;

  const stats = [
    { label: "Rows", value: quality.totalRows },
    { label: "Columns", value: quality.totalColumns },
    { label: "Missing cells", value: quality.missingCellCount },
    { label: "Duplicate rows", value: quality.duplicateRowCount },
    { label: "Empty rows", value: quality.emptyRowCount },
    { label: "Duplicate names", value: quality.duplicateColumnNames.length },
    { label: "Mixed type cols", value: quality.mixedColumns.length },
    { label: "Whitespace cols", value: quality.whitespaceColumns.length },
  ];

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader
          subtitle="Review issues before applying deterministic local cleaning."
          title={
            <>
              <ShieldCheck className="h-5 w-5 text-slate-500" />
              Data Quality Summary
            </>
          }
        />
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Local only
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((stat) => (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3" key={stat.label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {stat.label}
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Review issues
          </h3>
          <IssueList quality={quality} />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Suggested cleaning actions
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {quality.recommendations.map((recommendation) => (
              <li
                className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                key={recommendation.id}
              >
                <span className="block font-semibold text-slate-800">
                  {recommendation.label}
                </span>
                <span>{recommendation.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
        Uploaded files are processed locally in your browser. No model is
        trained by this app.
      </div>
    </Card>
  );
}

function IssueList({ quality }) {
  const issues = [
    formatIssue(
      quality.duplicateColumnNames.length,
      "duplicate column name",
      "duplicate column names",
    ),
    formatIssue(
      quality.mixedColumns.length,
      "column with mixed inferred types",
      "columns with mixed inferred types",
    ),
    formatIssue(
      quality.highMissingColumns.length,
      "column with high missingness",
      "columns with high missingness",
    ),
    formatIssue(
      quality.outlierColumns.length,
      "numeric column with potential outliers",
      "numeric columns with potential outliers",
    ),
    formatIssue(
      quality.placeholderMissingCellCount,
      "missing placeholder",
      "missing placeholders",
    ),
    formatIssue(
      quality.suspiciousNumberColumns.length,
      "column with leading-zero numeric values left unchanged",
      "columns with leading-zero numeric values left unchanged",
    ),
    formatIssue(
      quality.ambiguousDateColumns.length,
      "column with ambiguous dates left unchanged",
      "columns with ambiguous dates left unchanged",
    ),
  ].filter(Boolean);

  if (issues.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        No major quality issues detected.
      </p>
    );
  }

  return (
    <ul className="mt-3 space-y-2 text-sm text-slate-600">
      {issues.map((issue) => (
        <li className="rounded-lg border border-slate-100 bg-white px-3 py-2" key={issue}>
          {issue}
        </li>
      ))}
    </ul>
  );
}

function formatIssue(count, singularLabel, pluralLabel) {
  if (count === 0) return null;
  return `${count} ${count === 1 ? singularLabel : pluralLabel}`;
}
