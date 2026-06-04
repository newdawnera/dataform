import { Table2 } from "lucide-react";

import Card from "../Card";
import SectionHeader from "../SectionHeader";
import { getColumnLabel } from "../../data/datasetProfiler";

export default function DataPreviewTable({
  headers,
  previewLimit,
  rows,
  subtitle,
  title = "Data Preview",
  totalRows,
}) {
  if (headers.length === 0) return null;

  const previewColumnCount = Math.max(
    headers.length,
    ...rows.map((row) => row.length),
  );
  const previewColumns = Array.from({ length: previewColumnCount }, (_, index) =>
    index < headers.length
      ? getColumnLabel(headers[index], index)
      : `Extra ${index - headers.length + 1}`,
  );

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader
          subtitle={
            subtitle ||
            `Showing first ${Math.min(
              rows.length,
              previewLimit,
            )} of ${totalRows} data rows.`
          }
          title={
            <>
              <Table2 className="h-5 w-5 text-slate-500" />
              {title}
            </>
          }
        />
        {totalRows > previewLimit && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            Preview limited to {previewLimit} rows
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          The file has headers but no data rows.
        </div>
      ) : (
        <div className="max-h-[520px] overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr>
                {previewColumns.map((header, index) => (
                  <th
                    className="whitespace-nowrap border-r border-slate-200 px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 last:border-r-0"
                    key={`${header}-${index}`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, rowIndex) => (
                <tr className="hover:bg-slate-50" key={rowIndex}>
                  {previewColumns.map((header, columnIndex) => {
                    const cellValue = row[columnIndex];
                    const isEmpty =
                      cellValue === undefined ||
                      cellValue === null ||
                      String(cellValue).trim() === "";

                    return (
                      <td
                        className="max-w-sm border-r border-slate-100 px-3 py-3 align-top text-slate-700 last:border-r-0"
                        key={`${header}-${columnIndex}`}
                      >
                        {isEmpty ? (
                          <span className="text-slate-400">Empty</span>
                        ) : (
                          <span className="block whitespace-pre-wrap break-words">
                            {String(cellValue)}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
