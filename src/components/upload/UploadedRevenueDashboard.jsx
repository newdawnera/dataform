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
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, CalendarDays, DollarSign, Tags, TrendingUp } from "lucide-react";

import Card from "../Card";
import KPICard from "../KPICard";
import SectionHeader from "../SectionHeader";
import { formatCompact, formatCurrency, formatShare } from "../../utils/formatters";
import { buildUploadedRevenueDashboard } from "./uploadedRevenueDashboardUtils";

const CHART_COLORS = [
  "#2563eb",
  "#059669",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#475569",
  "#16a34a",
];

export default function UploadedRevenueDashboard({ result }) {
  const dashboard = useMemo(() => buildUploadedRevenueDashboard(result), [result]);

  if (!dashboard) return null;

  const {
    categoryData,
    columns,
    distributionData,
    interpretation,
    metrics,
    trendData,
  } = dashboard;
  const topCategoryName = metrics.topCategory?.name || "No category";
  const topCategoryShare = metrics.topCategory
    ? `${formatShare(metrics.topCategory.revenue, metrics.totalRevenue, 0)}% of total`
    : "No grouping column";

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeader
          subtitle={`Generated locally from ${columns.revenue}${columns.date ? `, ${columns.date}` : ""}${columns.category ? `, and ${columns.category}` : ""}.`}
          title={
            <>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Uploaded Revenue Dashboard
            </>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          gradient="bg-emerald-600"
          icon={DollarSign}
          subtext="Cleaned uploaded rows"
          title="Total Revenue"
          trend="positive"
          value={formatCompact(metrics.totalRevenue)}
        />
        <KPICard
          gradient="bg-blue-600"
          icon={TrendingUp}
          subtext="Mean per revenue row"
          title="Average Revenue"
          trend="neutral"
          value={formatCompact(metrics.averageRevenue)}
        />
        <KPICard
          gradient="bg-violet-600"
          icon={BarChart3}
          subtext="Rows with usable revenue"
          title="Revenue Records"
          trend="neutral"
          value={new Intl.NumberFormat("en-US").format(metrics.recordCount)}
        />
        <KPICard
          gradient="bg-amber-500"
          icon={Tags}
          subtext={`${topCategoryName} - ${topCategoryShare}`}
          title="Leading Group"
          trend="positive"
          value={metrics.topCategory ? formatCompact(metrics.topCategory.revenue) : "N/A"}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {trendData.length >= 2 ? (
          <RevenueTrendChart data={trendData} />
        ) : (
          <RevenueDistributionChart data={distributionData} />
        )}
        {categoryData.length > 0 && <RevenueCategoryChart data={categoryData} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {categoryData.length > 0 && <RevenueMixChart data={categoryData} />}
        <RevenueInterpretationCard interpretation={interpretation} />
      </div>
    </section>
  );
}

function RevenueTrendChart({ data }) {
  return (
    <Card className="p-6 border-2 border-emerald-100 lg:col-span-2">
      <SectionHeader
        title={
          <>
            <CalendarDays className="h-5 w-5 text-emerald-600" />
            Revenue Trend
          </>
        }
        subtitle="Revenue grouped by cleaned month"
      />
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={formatCompact} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(value)} />
            <Line
              dataKey="revenue"
              dot={{ fill: "#059669", r: 4 }}
              name="Revenue"
              stroke="#059669"
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function RevenueCategoryChart({ data }) {
  return (
    <Card className="p-6 border-2 border-blue-100">
      <SectionHeader title="Revenue By Group" subtitle="Top cleaned category totals" />
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, left: 20, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={formatCompact} />
            <YAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 12 }}
              type="category"
              width={92}
            />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(value)} />
            <Bar dataKey="revenue" name="Revenue" radius={[0, 8, 8, 0]}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function RevenueDistributionChart({ data }) {
  return (
    <Card className="p-6 border-2 border-emerald-100 lg:col-span-2">
      <SectionHeader title="Revenue Distribution" subtitle="Rows grouped into value bands" />
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
            <YAxis tick={{ fill: "#64748b", fontSize: 12 }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="#059669" name="Rows" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function RevenueMixChart({ data }) {
  return (
    <Card className="p-6 border-2 border-violet-100">
      <SectionHeader title="Revenue Mix" subtitle="Share of top cleaned groups" />
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              innerRadius={58}
              nameKey="name"
              outerRadius={96}
              paddingAngle={4}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function RevenueInterpretationCard({ interpretation }) {
  return (
    <Card className="p-6 border-2 border-slate-100 lg:col-span-2">
      <SectionHeader title="Dashboard Interpretation" subtitle={interpretation.summary} />
      <ul className="space-y-3 text-sm leading-6 text-slate-600">
        {interpretation.details.map((detail) => (
          <li className="flex gap-3" key={detail}>
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <span>{detail}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const tooltipStyle = {
  border: "none",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};
