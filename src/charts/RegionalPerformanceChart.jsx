import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import Card from "../components/Card";
import SectionHeader from "../components/SectionHeader";
import { REGION_COLORS } from "../utils/constants";
import { formatCompact } from "../utils/formatters";

export default function RegionalPerformanceChart({ data }) {
  return (
    <Card className="col-span-1 p-6 border-2 border-blue-100">
      <SectionHeader
        title="Regional Performance"
        subtitle="Annual revenue contribution"
      />
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {REGION_COLORS.map((color, index) => (
                <linearGradient
                  key={color}
                  id={`regionGradient${index}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="revenue"
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={`url(#regionGradient${index})`} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCompact(value)}
              contentStyle={{
                borderRadius: "8px",
                border: "none",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
