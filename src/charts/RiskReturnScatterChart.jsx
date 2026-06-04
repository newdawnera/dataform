import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Card from "../components/Card";
import SectionHeader from "../components/SectionHeader";
import { formatCompact, formatCurrency } from "../utils/formatters";

export default function RiskReturnScatterChart({ data }) {
  return (
    <Card className="p-6 border-2 border-teal-100">
      <SectionHeader
        title="Risk-Return Profile"
        subtitle="Revenue vs. Probability of Default (Risk Score)"
      />
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="x"
              name="Risk Score"
              unit=""
              stroke="#64748b"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Revenue"
              unit="$"
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              tickFormatter={formatCompact}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 border-2 border-teal-200 shadow-lg rounded-lg">
                      <p className="font-semibold text-slate-800">
                        {payload[0].payload.z}
                      </p>
                      <p className="text-sm text-slate-600">
                        Rev: {formatCurrency(payload[0].value)}
                      </p>
                      <p className="text-sm text-slate-600">
                        Risk: {payload[0].payload.x.toFixed(2)}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Scatter name="Customers" data={data} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-4 justify-center text-xs font-medium text-slate-600">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></span>{" "}
          Defaulted
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-teal-500 shadow-sm"></span>{" "}
          Current
        </div>
      </div>
    </Card>
  );
}
