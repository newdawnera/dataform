import { Columns3 } from "lucide-react";

import Card from "../Card";
import SectionHeader from "../SectionHeader";
import { getColumnLabel } from "../../data/datasetProfiler";

const TYPE_CLASSES = {
  boolean: "bg-cyan-50 text-cyan-700",
  date: "bg-violet-50 text-violet-700",
  empty: "bg-slate-100 text-slate-600",
  mixed: "bg-amber-50 text-amber-700",
  number: "bg-emerald-50 text-emerald-700",
  text: "bg-blue-50 text-blue-700",
};

export default function ColumnProfileTable({ profile }) {
  if (!profile) return null;

  const duplicateNames = new Set(
    profile.duplicateColumnNames.map((name) => name.toLowerCase()),
  );

  return (
    <Card className="p-5">
      <SectionHeader
        subtitle="Deterministic local profiling only; values are not cleaned or changed."
        title={
          <>
            <Columns3 className="h-5 w-5 text-slate-500" />
            Column Profile
          </>
        }
      />

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wide text-slate-500">
              <th className="whitespace-nowrap px-3 py-3">Column</th>
              <th className="whitespace-nowrap px-3 py-3">Type</th>
              <th className="whitespace-nowrap px-3 py-3">Missing</th>
              <th className="whitespace-nowrap px-3 py-3">Filled</th>
              <th className="whitespace-nowrap px-3 py-3">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {profile.columns.map((column) => {
              const normalizedName = String(column.name).trim().toLowerCase();
              const isDuplicate =
                normalizedName && duplicateNames.has(normalizedName);

              return (
                <tr className="hover:bg-slate-50" key={column.index}>
                  <td className="max-w-xs px-3 py-3 font-semibold text-slate-900">
                    <span className="block truncate">
                      {getColumnLabel(column.name, column.index)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                        TYPE_CLASSES[column.type]
                      }`}
                    >
                      {column.type}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                    {column.missingCount}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">
                    {column.filledCount}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                    {isDuplicate ? "Duplicate name" : "Ready"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
