import { useMemo } from "react";
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
import { BarChart3, GitCompare, PieChart as PieChartIcon, TrendingUp } from "lucide-react";

import Card from "../Card";
import SectionHeader from "../SectionHeader";
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
const MAX_TREND_POINTS = 14;
const MAX_SCATTER_POINTS = 120;

export default function UploadedDataChartsPanel({ result }) {
  const chartPlan = useMemo(() => buildChartPlan(result), [result]);

  if (!result) return null;

  if (!chartPlan.hasCharts) {
    return (
      <Card className="p-5">
        <SectionHeader
          subtitle="Apply cleaning to a dataset with numeric, date, or category fields to render charts."
          title={
            <>
              <BarChart3 className="h-5 w-5 text-slate-500" />
              Cleaned Data Charts
            </>
          }
        />
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No chart-ready columns were found in the cleaned dataset.
        </div>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          subtitle="Charts are generated locally from the cleaned dataset."
          title={
            <>
              <BarChart3 className="h-5 w-5 text-slate-500" />
              Cleaned Data Charts
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {chartPlan.distribution && (
          <DistributionBarChart chart={chartPlan.distribution} />
        )}
        {chartPlan.pie && <DistributionPieChart chart={chartPlan.pie} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {chartPlan.trend && <TrendChart chart={chartPlan.trend} />}
        {chartPlan.scatter && <ScatterRelationshipChart chart={chartPlan.scatter} />}
        {!chartPlan.scatter && chartPlan.histogram && (
          <HistogramChart chart={chartPlan.histogram} />
        )}
      </div>
    </section>
  );
}

function DistributionBarChart({ chart }) {
  return (
    <Card className="p-6 border-2 border-blue-100 lg:col-span-2">
      <SectionHeader title={chart.title} subtitle={chart.subtitle} />
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} margin={{ top: 10, right: 24, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
              interval={0}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#64748b", fontSize: 12 }}
              allowDecimals={false}
            />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#f1f5f9" }} />
            <Bar dataKey="count" name="Rows" radius={[8, 8, 0, 0]}>
              {chart.data.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function DistributionPieChart({ chart }) {
  return (
    <Card className="p-6 border-2 border-purple-100">
      <SectionHeader title={chart.title} subtitle={chart.subtitle} />
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chart.data}
              dataKey="count"
              nameKey="name"
              innerRadius={58}
              outerRadius={96}
              paddingAngle={4}
            >
              {chart.data.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <LegendList data={chart.data} />
    </Card>
  );
}

function TrendChart({ chart }) {
  return (
    <Card className="p-6 border-2 border-emerald-100">
      <SectionHeader
        title={
          <>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            {chart.title}
          </>
        }
        subtitle={chart.subtitle}
      />
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart.data} margin={{ top: 10, right: 24, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="value"
              name={chart.valueLabel}
              stroke="#059669"
              strokeWidth={3}
              dot={{ fill: "#059669", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function ScatterRelationshipChart({ chart }) {
  return (
    <Card className="p-6 border-2 border-teal-100">
      <SectionHeader
        title={
          <>
            <GitCompare className="h-5 w-5 text-teal-600" />
            {chart.title}
          </>
        }
        subtitle={chart.subtitle}
      />
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="x"
              name={chart.xLabel}
              stroke="#64748b"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name={chart.yLabel}
              stroke="#64748b"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value, name) => [formatNumber(value), name]}
            />
            <Scatter name="Rows" data={chart.data} fill="#0f766e" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function HistogramChart({ chart }) {
  return (
    <Card className="p-6 border-2 border-amber-100">
      <SectionHeader title={chart.title} subtitle={chart.subtitle} />
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart.data} margin={{ top: 10, right: 24, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#fef3c7" }} />
            <Bar dataKey="count" name="Rows" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function LegendList({ data }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-medium text-slate-600">
      {data.slice(0, 6).map((item, index) => (
        <div className="flex min-w-0 items-center gap-2" key={item.name}>
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
          />
          <span className="truncate">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

function buildChartPlan(result) {
  if (!result?.headers || !result?.rows) return { hasCharts: false };

  const columns = result.headers.map((name, columnIndex) =>
    summarizeChartColumn({ columnIndex, name, rows: result.rows }),
  );
  const visibleColumns = columns.filter((column) => !column.isSensitive);
  const categoricalColumns = visibleColumns.filter((column) => column.isCategorical);
  const numericColumns = visibleColumns.filter((column) => column.isNumeric);
  const dateColumns = visibleColumns.filter((column) => column.isDate);
  const distributionColumn = selectDistributionColumn(categoricalColumns, numericColumns);
  const histogramColumn = numericColumns[0] || null;

  const chartPlan = {
    distribution: distributionColumn
      ? buildDistributionChart(distributionColumn, "bar")
      : null,
    histogram: histogramColumn ? buildHistogramChart(histogramColumn) : null,
    pie: distributionColumn ? buildDistributionChart(distributionColumn, "pie") : null,
    scatter:
      numericColumns.length >= 2
        ? buildScatterChart(numericColumns[0], numericColumns[1], result.rows)
        : null,
    trend: dateColumns[0]
      ? buildTrendChart(dateColumns[0], numericColumns[0], result.rows)
      : null,
  };

  return {
    ...chartPlan,
    hasCharts: Boolean(
      chartPlan.distribution ||
        chartPlan.histogram ||
        chartPlan.pie ||
        chartPlan.scatter ||
        chartPlan.trend,
    ),
  };
}

function summarizeChartColumn({ columnIndex, name, rows }) {
  const values = rows.map((row) => row[columnIndex]);
  const observedValues = values.filter((value) => !isMissingValue(value));
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
  const numericRatio = observedCount === 0 ? 0 : numericValues.length / observedCount;
  const dateRatio = observedCount === 0 ? 0 : dateValues.length / observedCount;
  const uniqueCount = topValues.totalUniqueCount;

  return {
    columnIndex,
    dateValues,
    isCategorical:
      observedCount > 0 &&
      numericRatio < 0.8 &&
      dateRatio < 0.8 &&
      uniqueCount > 1 &&
      uniqueCount <= 50,
    isDate: observedCount > 0 && dateRatio >= 0.8,
    isNumeric: observedCount > 0 && numericRatio >= 0.8,
    isSensitive: detectSensitiveField(name).isSensitive,
    name: String(name || `Column ${columnIndex + 1}`),
    numericValues,
    observedCount,
    topValues,
  };
}

function selectDistributionColumn(categoricalColumns, numericColumns) {
  if (categoricalColumns.length > 0) {
    return categoricalColumns.sort(
      (left, right) => right.observedCount - left.observedCount,
    )[0];
  }

  return numericColumns.find((column) => column.topValues.totalUniqueCount <= 20) || null;
}

function buildDistributionChart(column, chartType) {
  return {
    data: column.topValues.items,
    subtitle:
      chartType === "bar"
        ? `Top values in ${column.name}`
        : `Share of top values in ${column.name}`,
    title:
      chartType === "bar"
        ? `${column.name} Distribution`
        : `${column.name} Mix`,
  };
}

function buildTrendChart(dateColumn, numericColumn, rows) {
  const groupedValues = new Map();

  rows.forEach((row) => {
    const dateValue = parseDateValue(row[dateColumn.columnIndex]);
    if (!dateValue?.isValid) return;

    const bucket = dateValue.isoValue.slice(0, 10);
    const currentBucket = groupedValues.get(bucket) || {
      count: 0,
      total: 0,
    };
    const numericValue = numericColumn
      ? parseNumberValue(row[numericColumn.columnIndex])
      : null;

    currentBucket.count += 1;
    if (numericValue?.isValid) {
      currentBucket.total += numericValue.value;
    }

    groupedValues.set(bucket, currentBucket);
  });

  const data = [...groupedValues.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .slice(0, MAX_TREND_POINTS)
    .map(([name, bucket]) => ({
      name,
      value: numericColumn && bucket.count > 0 ? roundNumber(bucket.total / bucket.count) : bucket.count,
    }));

  if (data.length === 0) return null;

  return {
    data,
    subtitle: numericColumn
      ? `Average ${numericColumn.name} by ${dateColumn.name}`
      : `Row count by ${dateColumn.name}`,
    title: numericColumn ? `${numericColumn.name} Trend` : `${dateColumn.name} Trend`,
    valueLabel: numericColumn ? `Average ${numericColumn.name}` : "Rows",
  };
}

function buildScatterChart(xColumn, yColumn, rows) {
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
    subtitle: `${xColumn.name} compared with ${yColumn.name}`,
    title: "Numeric Relationship",
    xLabel: xColumn.name,
    yLabel: yColumn.name,
  };
}

function buildHistogramChart(column) {
  const sortedValues = [...column.numericValues].sort((left, right) => left - right);
  if (sortedValues.length === 0) return null;

  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const bucketCount = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(sortedValues.length))));
  const bucketWidth = max === min ? 1 : (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    count: 0,
    name:
      max === min
        ? formatNumber(min)
        : `${formatNumber(min + bucketWidth * index)}-${formatNumber(
            min + bucketWidth * (index + 1),
          )}`,
  }));

  sortedValues.forEach((value) => {
    const bucketIndex =
      max === min
        ? 0
        : Math.min(Math.floor((value - min) / bucketWidth), bucketCount - 1);
    buckets[bucketIndex].count += 1;
  });

  return {
    data: buckets,
    subtitle: `Bucketed values for ${column.name}`,
    title: `${column.name} Range`,
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
