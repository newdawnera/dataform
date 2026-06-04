import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Card from "../components/Card";
import SectionHeader from "../components/SectionHeader";
import { SEGMENT_COLORS } from "../utils/constants";
import { formatCompact } from "../utils/formatters";

const getToggleClassName = (isActive) =>
  `px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
    isActive
      ? "bg-purple-500 text-white shadow-md"
      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
  }`;

export default function PortfolioCompositionChart({
  chartType,
  data,
  onChartTypeChange,
}) {
  return (
    <Card className="col-span-1 lg:col-span-2 p-6 border-2 border-purple-100">
      <div className="flex items-center justify-between mb-6">
        <SectionHeader
          title="Portfolio Composition"
          subtitle="Total outstanding balance per customer segment"
        />
        <div className="flex gap-2">
          <button
            onClick={() => onChartTypeChange("bar")}
            className={getToggleClassName(chartType === "bar")}
          >
            Bar
          </button>
          <button
            onClick={() => onChartTypeChange("line")}
            className={getToggleClassName(chartType === "line")}
          >
            Line
          </button>
        </div>
      </div>
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                {data.map((entry, index) => (
                  <linearGradient
                    key={entry.name}
                    id={`colorGradient${index}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={SEGMENT_COLORS[entry.name]}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={SEGMENT_COLORS[entry.name]}
                      stopOpacity={0.3}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
                tickFormatter={formatCompact}
              />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Bar dataKey="balance" name="Balance" radius={[8, 8, 0, 0]} barSize={60}>
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={`url(#colorGradient${index})`} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} tickFormatter={formatCompact} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "none",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#8b5cf6"
                strokeWidth={3}
                dot={{ fill: "#8b5cf6", r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
