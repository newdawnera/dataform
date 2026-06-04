import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, Eye } from "lucide-react";

import {
  isMissingValue,
  parseDateValue,
  parseNumberValue,
} from "../../data/cleaningRules";
import { detectSensitiveField } from "../../data/sensitiveFieldDetection";

const CHART_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#f59e0b",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#475569",
];
const MAX_CATEGORY_ITEMS = 8;
const MAX_SCATTER_POINTS = 120;
const MAX_TABLE_ROWS = 10;

export default function AiSuggestedChartPlotter({
  cleaningResult,
  suggestedCharts,
}) {
  const plots = useMemo(
    () =>
      (suggestedCharts || []).map((suggestion) =>
        buildPlotFromSuggestion({ cleaningResult, suggestion }),
      ),
    [cleaningResult, suggestedCharts],
  );
  const firstPlottableIndex = plots.findIndex((plot) => plot);
  const [selectedIndex, setSelectedIndex] = useState(firstPlottableIndex);
  const activeIndex = plots[selectedIndex] ? selectedIndex : firstPlottableIndex;
  const activePlot = activeIndex >= 0 ? plots[activeIndex] : null;

  if (!suggestedCharts?.length) return null;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <BarChart3 className="h-4 w-4 text-blue-600" />
        AI suggested chart ideas
      </h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {suggestedCharts.map((chart, index) => {
          const canPlot = Boolean(plots[index]);
          const isActive = activeIndex === index;

          return (
            <div
              className={`rounded-lg border p-3 ${
                isActive
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-slate-50"
              }`}
              key={`${chart.title}-${index}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {chart.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                    {chart.chartType}
                  </p>
                </div>
                <button
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!canPlot}
                  onClick={() => setSelectedIndex(index)}
                  type="button"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Plot
                </button>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-600">
                {chart.reason}
              </p>
              {!canPlot && (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  No matching chart-ready cleaned columns found.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        {activePlot ? (
          <SuggestedChart plot={activePlot} />
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Select a suggested chart with chart-ready cleaned columns.
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestedChart({ plot }) {
  return (
    <div>
      <div className="mb-4">
        <h4 className="text-base font-bold text-slate-900">{plot.title}</h4>
        <p className="mt-1 text-sm text-slate-500">{plot.subtitle}</p>
      </div>
      {plot.type === "bar" && <SuggestedBarChart plot={plot} />}
      {plot.type === "pie" && <SuggestedPieChart plot={plot} />}
      {plot.type === "line" && <SuggestedLineChart plot={plot} />}
      {plot.type === "scatter" && <SuggestedScatterChart plot={plot} />}
      {plot.type === "table" && <SuggestedTable plot={plot} />}
    </div>
  );
}

function SuggestedBarChart({ plot }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={plot.data} margin={{ top: 10, right: 24, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
          <Bar dataKey="value" name={plot.valueLabel} radius={[8, 8, 0, 0]}>
            {plot.data.map((entry, index) => (
              <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SuggestedPieChart({ plot }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={plot.data}
            dataKey="value"
            nameKey="name"
            innerRadius={64}
            outerRadius={110}
            paddingAngle={4}
          >
            {plot.data.map((entry, index) => (
              <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function SuggestedLineChart({ plot }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={plot.data} margin={{ top: 10, right: 24, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line
            dataKey="value"
            name={plot.valueLabel}
            stroke="#2563eb"
            strokeWidth={3}
            type="monotone"
            dot={{ fill: "#2563eb", r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SuggestedScatterChart({ plot }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="x"
            name={plot.xLabel}
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            type="number"
          />
          <YAxis
            dataKey="y"
            name={plot.yLabel}
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            type="number"
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value, name) => [formatNumber(value), name]}
          />
          <Scatter data={plot.data} fill="#0f766e" name="Rows" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function SuggestedTable({ plot }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {plot.columns.map((column) => (
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
          {plot.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
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
  );
}

function buildPlotFromSuggestion({ cleaningResult, suggestion }) {
  if (!cleaningResult?.headers || !cleaningResult?.rows?.length) return null;

  const columns = summarizeColumns(cleaningResult);
  const chartType = String(suggestion?.chartType || "bar").toLowerCase();
  const matchedColumn = findSuggestedColumn(suggestion, columns);
  const numericColumns = columns.filter((column) => column.isNumeric);
  const dateColumns = columns.filter((column) => column.isDate);
  const categoricalColumns = columns.filter((column) => column.isCategorical);

  if (chartType === "line") {
    return buildLinePlot({
      dateColumn: matchedColumn?.isDate ? matchedColumn : dateColumns[0],
      numericColumn: matchedColumn?.isNumeric ? matchedColumn : numericColumns[0],
      rows: cleaningResult.rows,
      suggestion,
    });
  }

  if (chartType === "scatter") {
    const xColumn = matchedColumn?.isNumeric ? matchedColumn : numericColumns[0];
    const yColumn = numericColumns.find(
      (column) => column.columnIndex !== xColumn?.columnIndex,
    );

    return buildScatterPlot({ rows: cleaningResult.rows, suggestion, xColumn, yColumn });
  }

  if (chartType === "pie") {
    const column =
      matchedColumn ||
      categoricalColumns[0] ||
      numericColumns.find((item) => item.topValues.totalUniqueCount <= 20);

    return buildDistributionPlot({ column, suggestion, type: "pie" });
  }

  if (chartType === "table") {
    return buildTablePlot({
      columns,
      rows: cleaningResult.rows,
      suggestion,
    });
  }

  const column =
    matchedColumn ||
    categoricalColumns[0] ||
    numericColumns.find((item) => item.topValues.totalUniqueCount <= 20) ||
    numericColumns[0];

  return buildDistributionPlot({ column, suggestion, type: "bar" });
}

function summarizeColumns(cleaningResult) {
  return cleaningResult.headers
    .map((name, columnIndex) => {
      const observedValues = cleaningResult.rows
        .map((row) => row[columnIndex])
        .filter((value) => !isMissingValue(value));
      const numericValues = observedValues
        .map((value) => parseNumberValue(value))
        .filter((value) => value?.isValid)
        .map((value) => value.value);
      const dateValues = observedValues
        .map((value) => parseDateValue(value))
        .filter((value) => value?.isValid)
        .map((value) => value.isoValue);
      const topValues = buildTopValues(observedValues);
      const observedCount = observedValues.length;
      const numericRatio =
        observedCount === 0 ? 0 : numericValues.length / observedCount;
      const dateRatio =
        observedCount === 0 ? 0 : dateValues.length / observedCount;
      const columnName = String(name || `Column ${columnIndex + 1}`);

      return {
        columnIndex,
        isCategorical:
          observedCount > 0 &&
          numericRatio < 0.8 &&
          dateRatio < 0.8 &&
          topValues.totalUniqueCount > 1,
        isDate: observedCount > 0 && dateRatio >= 0.8,
        isNumeric: observedCount > 0 && numericRatio >= 0.8,
        isSensitive: detectSensitiveField(columnName).isSensitive,
        name: columnName,
        normalizedName: normalizeText(columnName),
        numericValues,
        observedCount,
        topValues,
      };
    })
    .filter((column) => !column.isSensitive);
}

function findSuggestedColumn(suggestion, columns) {
  const suggestionText = normalizeText(
    `${suggestion?.title || ""} ${suggestion?.reason || ""}`,
  );

  return columns
    .map((column) => ({
      column,
      score: scoreColumnMatch(suggestionText, column.normalizedName),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.column;
}

function scoreColumnMatch(suggestionText, columnName) {
  if (!suggestionText || !columnName) return 0;
  if (suggestionText.includes(columnName)) return 100 + columnName.length;

  const tokens = columnName.split(" ").filter((token) => token.length > 2);
  return tokens.reduce(
    (score, token) => score + (suggestionText.includes(token) ? 10 : 0),
    0,
  );
}

function buildDistributionPlot({ column, suggestion, type }) {
  if (!column) return null;

  const data = column.isNumeric
    ? buildNumericBuckets(column.numericValues)
    : column.topValues.items.map((item) => ({
        name: item.name,
        value: item.count,
      }));

  if (data.length === 0) return null;

  return {
    data,
    subtitle: `Plotted locally from cleaned ${column.name} values.`,
    title: suggestion?.title || `${column.name} Distribution`,
    type,
    valueLabel: "Rows",
  };
}

function buildLinePlot({ dateColumn, numericColumn, rows, suggestion }) {
  if (dateColumn) {
    const buckets = new Map();

    rows.forEach((row) => {
      const dateValue = parseDateValue(row[dateColumn.columnIndex]);
      if (!dateValue?.isValid) return;

      const bucket = dateValue.isoValue;
      const currentBucket = buckets.get(bucket) || { count: 0, total: 0 };
      const numericValue = numericColumn
        ? parseNumberValue(row[numericColumn.columnIndex])
        : null;

      currentBucket.count += 1;
      if (numericValue?.isValid) currentBucket.total += numericValue.value;

      buckets.set(bucket, currentBucket);
    });

    const data = [...buckets.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, bucket]) => ({
        name,
        value:
          numericColumn && bucket.count > 0
            ? roundNumber(bucket.total / bucket.count)
            : bucket.count,
      }));

    if (data.length === 0) return null;

    return {
      data,
      subtitle: numericColumn
        ? `Average ${numericColumn.name} by ${dateColumn.name}.`
        : `Row count by ${dateColumn.name}.`,
      title: suggestion?.title || `${dateColumn.name} Trend`,
      type: "line",
      valueLabel: numericColumn ? `Average ${numericColumn.name}` : "Rows",
    };
  }

  if (!numericColumn) return null;

  return {
    data: numericColumn.numericValues.map((value, index) => ({
      name: String(index + 1),
      value,
    })),
    subtitle: `Cleaned ${numericColumn.name} values by row order.`,
    title: suggestion?.title || `${numericColumn.name} Sequence`,
    type: "line",
    valueLabel: numericColumn.name,
  };
}

function buildScatterPlot({ rows, suggestion, xColumn, yColumn }) {
  if (!xColumn || !yColumn) return null;

  const data = rows
    .map((row) => {
      const xValue = parseNumberValue(row[xColumn.columnIndex]);
      const yValue = parseNumberValue(row[yColumn.columnIndex]);

      if (!xValue?.isValid || !yValue?.isValid) return null;

      return {
        x: xValue.value,
        y: yValue.value,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_SCATTER_POINTS);

  if (data.length === 0) return null;

  return {
    data,
    subtitle: `${xColumn.name} compared with ${yColumn.name}.`,
    title: suggestion?.title || "Numeric Relationship",
    type: "scatter",
    xLabel: xColumn.name,
    yLabel: yColumn.name,
  };
}

function buildTablePlot({ columns, rows, suggestion }) {
  const visibleColumns = columns.slice(0, 6);
  if (visibleColumns.length === 0) return null;

  return {
    columns: visibleColumns.map((column) => column.name),
    rows: rows.slice(0, MAX_TABLE_ROWS).map((row) =>
      visibleColumns.map((column) =>
        limitText(String(row[column.columnIndex] ?? ""), 80),
      ),
    ),
    subtitle: `First ${Math.min(rows.length, MAX_TABLE_ROWS)} cleaned rows for non-sensitive columns.`,
    title: suggestion?.title || "Cleaned Data Table",
    type: "table",
  };
}

function buildTopValues(values) {
  const counts = new Map();

  values.forEach((value) => {
    const label = limitText(String(value ?? "").trim(), 32);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return {
    items: [...counts.entries()]
      .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
      .slice(0, MAX_CATEGORY_ITEMS)
      .map(([name, count]) => ({ count, name })),
    totalUniqueCount: counts.size,
  };
}

function buildNumericBuckets(values) {
  const sortedValues = [...values].sort((left, right) => left - right);
  if (sortedValues.length === 0) return [];

  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const bucketCount = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(sortedValues.length))));
  const bucketWidth = max === min ? 1 : (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    name:
      max === min
        ? formatNumber(min)
        : `${formatNumber(min + bucketWidth * index)}-${formatNumber(
            min + bucketWidth * (index + 1),
          )}`,
    value: 0,
  }));

  sortedValues.forEach((value) => {
    const bucketIndex =
      max === min
        ? 0
        : Math.min(Math.floor((value - min) / bucketWidth), bucketCount - 1);
    buckets[bucketIndex].value += 1;
  });

  return buckets;
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function formatNumber(value) {
  if (!Number.isFinite(Number(value))) return String(value);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function roundNumber(value) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

function limitText(value, maxLength) {
  const text = String(value ?? "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

const tooltipStyle = {
  border: "none",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};
