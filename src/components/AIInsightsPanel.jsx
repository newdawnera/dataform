import { Loader2, Sparkles, TrendingUp } from "lucide-react";

import { formatShare } from "../utils/formatters";
import Card from "./Card";
import ReportButton from "./ReportButton";

export default function AIInsightsPanel({
  aiAnalysis,
  isGenerating,
  metrics,
  onGenerate,
  onReport,
  regionData,
  segmentData,
}) {
  const highNetWorthRevenue =
    segmentData.find((segment) => segment.name === "High Net Worth")?.value || 0;
  const massMarketName =
    segmentData.find((segment) => segment.name === "Mass Market")?.name ||
    "Mass Market";
  const leadingRegionName = regionData[0]?.name || "N/A";

  return (
    <Card className="p-0 border-l-4 border-l-blue-500 shadow-lg">
      <div className="p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 h-full flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
                {isGenerating ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {aiAnalysis ? "AI Analyst Report" : "Automated Insights"}
                </h3>
                {!aiAnalysis && !isGenerating && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                    Sample
                  </span>
                )}
              </div>
            </div>
            {!aiAnalysis && !isGenerating && (
              <button
                onClick={onGenerate}
                className="text-xs flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <Sparkles className="w-3 h-3" />
                Generate AI
              </button>
            )}
          </div>

          <div className="space-y-4">
            {isGenerating ? (
              <div className="text-center py-10 text-slate-500 text-sm animate-pulse">
                Analyzing portfolio metrics via Groq (Llama 3)...
              </div>
            ) : aiAnalysis ? (
              <>
                {aiAnalysis.insights.map((insight, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-3 bg-white rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                  >
                    <span className="font-bold text-purple-300 text-2xl">
                      0{index + 1}
                    </span>
                    <p className="text-slate-700 leading-relaxed text-sm">
                      {insight}
                    </p>
                  </div>
                ))}
                <div className="mt-4 p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg border-2 border-blue-200 shadow-sm">
                  <strong className="block text-blue-900 text-xs uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Strategic Recommendation
                  </strong>
                  <p className="text-slate-800 text-sm font-medium italic">
                    "{aiAnalysis.recommendation}"
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500 italic">
                  Illustrative sample insights. Click Generate AI for analysis of
                  the current data.
                </p>
                <div className="flex gap-3 p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                  <span className="font-bold text-purple-300 text-2xl">01</span>
                  <p className="text-slate-700 leading-relaxed text-sm">
                    <strong className="text-purple-700">
                      High Net Worth Dominance:
                    </strong>{" "}
                    HNW customers constitute only 18% of the base but generate
                    <span className="font-semibold text-blue-700">
                      {" "}
                      {formatShare(highNetWorthRevenue, metrics.totalRevenue, 0)}%
                    </span>{" "}
                    of total revenue.
                  </p>
                </div>
                <div className="flex gap-3 p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                  <span className="font-bold text-purple-300 text-2xl">02</span>
                  <p className="text-slate-700 leading-relaxed text-sm">
                    <strong className="text-purple-700">Risk Concentration:</strong>{" "}
                    The {massMarketName} segment shows a default rate correlation
                    of
                    <span className="font-semibold text-rose-600"> 0.65</span>{" "}
                    with utilization rates above 80%.
                  </p>
                </div>
                <div className="flex gap-3 p-3 bg-white rounded-lg shadow-sm border border-slate-100">
                  <span className="font-bold text-purple-300 text-2xl">03</span>
                  <p className="text-slate-700 leading-relaxed text-sm">
                    <strong className="text-purple-700">
                      Regional Opportunity:
                    </strong>{" "}
                    {leadingRegionName} leads in revenue, suggesting a targeted
                    campaign to increase credit limits for Affluent customers in
                    this region could yield +$1.2M.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200">
          <ReportButton onClick={onReport} />
        </div>
      </div>
    </Card>
  );
}
