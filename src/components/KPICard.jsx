import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import Card from "./Card";

export default function KPICard({
  title,
  value,
  subtext,
  icon: IconComponent,
  trend,
  gradient,
}) {
  const trendClass =
    trend === "positive"
      ? "text-emerald-600"
      : trend === "negative"
        ? "text-rose-600"
        : "text-slate-500";

  return (
    <Card className="p-6 flex items-start justify-between transition-shadow hover:shadow-lg">
      <div>
        <p className="text-sm font-medium text-slate-600 mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-slate-900">{value}</h3>
        {subtext && (
          <div className={`flex items-center mt-2 text-sm font-semibold ${trendClass}`}>
            {trend === "positive" ? (
              <ArrowUpRight className="w-4 h-4 mr-1" />
            ) : trend === "negative" ? (
              <ArrowDownRight className="w-4 h-4 mr-1" />
            ) : null}
            {subtext}
          </div>
        )}
      </div>
      {IconComponent && (
        <div className={`p-3 rounded-lg ${gradient}`}>
          <IconComponent size={22} className="text-white" />
        </div>
      )}
    </Card>
  );
}
