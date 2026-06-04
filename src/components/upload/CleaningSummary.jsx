import { ClipboardCheck } from "lucide-react";

import Card from "../Card";
import SectionHeader from "../SectionHeader";

export default function CleaningSummary({ result }) {
  if (!result) return null;

  const { summary, quality } = result;
  const metrics = [
    {
      label: "Rows",
      value: `${summary.originalRowCount} -> ${summary.cleanedRowCount}`,
    },
    {
      label: "Columns",
      value: `${summary.originalColumnCount} -> ${summary.cleanedColumnCount}`,
    },
    { label: "Empty rows removed", value: summary.removedEmptyRows },
    { label: "Duplicate rows removed", value: summary.removedDuplicateRows },
    { label: "Cells trimmed", value: summary.trimmedCellCount },
    { label: "Missing values standardized", value: summary.normalizedMissingCellCount },
    { label: "Numeric cells coerced", value: summary.coercedNumericCells },
    { label: "Date cells coerced", value: summary.coercedDateCells },
    { label: "Boolean cells coerced", value: summary.coercedBooleanCells },
    { label: "Remaining missing cells", value: summary.remainingMissingCells },
  ];

  return (
    <Card className="p-5">
      <SectionHeader
        subtitle="Compare the original upload with the cleaned in-memory dataset."
        title={
          <>
            <ClipboardCheck className="h-5 w-5 text-slate-500" />
            Cleaning Summary
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {metrics.map((metric) => (
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3" key={metric.label}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {metric.label}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {metric.value}
            </p>
          </div>
        ))}
      </div>

      {summary.renamedColumns.length > 0 && (
        <DetailTable
          columns={["Original", "Cleaned"]}
          rows={summary.renamedColumns.map((column) => [
            column.originalHeader || `Column ${column.columnIndex + 1}`,
            column.cleanedHeader,
          ])}
          title="Renamed columns"
        />
      )}

      <CoercionDetails summary={summary} />

      {quality.outlierColumns.length > 0 && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Potential outliers were flagged in{" "}
          {quality.outlierColumns.length} numeric column
          {quality.outlierColumns.length === 1 ? "" : "s"}. No rows were
          removed for outliers.
        </div>
      )}
    </Card>
  );
}

function CoercionDetails({ summary }) {
  const rows = [
    ...summary.numericCoercionsByColumn.map((item) => [
      item.columnName,
      "Number",
      item.coercedCells,
    ]),
    ...summary.dateCoercionsByColumn.map((item) => [
      item.columnName,
      "Date",
      item.coercedCells,
    ]),
    ...summary.booleanCoercionsByColumn.map((item) => [
      item.columnName,
      "Boolean",
      item.coercedCells,
    ]),
  ];

  if (rows.length === 0) return null;

  return (
    <DetailTable
      columns={["Column", "Rule", "Cells"]}
      rows={rows}
      title="Coerced values"
    />
  );
}

function DetailTable({ columns, rows, title }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  className="whitespace-nowrap px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500"
                  key={column}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td className="px-3 py-2 text-slate-700" key={cellIndex}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
