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
  buildPlotFromSuggestion,
  buildSuggestedChartRead,
  ensureScatterSuggestion,
  formatScatterValue,
} from "./aiSuggestedChartPlotterUtils";

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

export default function AiSuggestedChartPlotter({
  cleaningResult,
  suggestedCharts,
}) {
  const charts = useMemo(
    () => ensureScatterSuggestion({ cleaningResult, suggestedCharts }),
    [cleaningResult, suggestedCharts],
  );
  const plots = useMemo(
    () =>
      charts.map((suggestion) =>
        buildPlotFromSuggestion({ cleaningResult, suggestion }),
      ),
    [cleaningResult, charts],
  );
  const firstPlottableIndex = plots.findIndex((plot) => plot);
  const [selectedIndex, setSelectedIndex] = useState(firstPlottableIndex);
  const activeIndex = plots[selectedIndex] ? selectedIndex : firstPlottableIndex;
  const activePlot = activeIndex >= 0 ? plots[activeIndex] : null;

  if (!charts.length) return null;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
        <BarChart3 className="h-4 w-4 text-blue-600" />
        AI suggested chart ideas
      </h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {charts.map((chart, index) => {
          const plot = plots[index];
          const canPlot = Boolean(plot);
          const isActive = activeIndex === index;
          const suggestedRead = buildSuggestedChartRead({ plot, suggestion: chart });

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
              <div className="mt-3 rounded-md border border-slate-200 bg-white/70 p-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Suggested read
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {suggestedRead}
                </p>
              </div>
              {!canPlot && (
                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Cannot plot safely from the chart-ready cleaned columns.
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
      {plot.interpretation && <SuggestedInterpretation interpretation={plot.interpretation} />}
    </div>
  );
}

function SuggestedInterpretation({ interpretation }) {
  return (
    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/70 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
        Interpretation
      </p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">
        {interpretation.summary}
      </p>
      {interpretation.details?.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
          {interpretation.details.map((detail) => (
            <li className="flex gap-2" key={detail}>
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
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
            tickFormatter={(value) => formatScatterValue(value, plot.xValueType)}
            type="number"
          />
          <YAxis
            dataKey="y"
            name={plot.yLabel}
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => formatScatterValue(value, plot.yValueType)}
            type="number"
          />
          <Tooltip
            contentStyle={tooltipStyle}
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value, name) => [
              formatScatterValue(
                value,
                name === plot.xLabel ? plot.xValueType : plot.yValueType,
              ),
              name,
            ]}
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

const tooltipStyle = {
  border: "none",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};
