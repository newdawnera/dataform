import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Card from "../Card";
import SectionHeader from "../SectionHeader";
import { createAiDatasetSummary } from "../../data/aiDatasetSummary";
import { requestUploadedDataInsights } from "../../services/uploadedDataInsightsService";

const EMPTY_INSIGHT_STATE = {
  error: "",
  result: null,
  status: "idle",
  summaryFingerprint: "",
};

export default function UploadedDataInsightsPanel({
  cleaningResult,
  file,
  profile,
  uploadStatus,
}) {
  const [insightState, setInsightState] = useState(EMPTY_INSIGHT_STATE);
  const datasetSummary = useMemo(
    () => createAiDatasetSummary({ cleaningResult, file, profile }),
    [cleaningResult, file, profile],
  );
  const summaryFingerprint = useMemo(
    () => (datasetSummary ? JSON.stringify(datasetSummary) : ""),
    [datasetSummary],
  );
  const activeInsightState =
    insightState.summaryFingerprint === summaryFingerprint
      ? insightState
      : EMPTY_INSIGHT_STATE;
  const isLoading = activeInsightState.status === "loading";
  const disabledReason = getDisabledReason({
    cleaningResult,
    datasetSummary,
    isLoading,
    uploadStatus,
  });

  const generateInsights = async () => {
    if (disabledReason) return;

    setInsightState({
      error: "",
      result: null,
      status: "loading",
      summaryFingerprint,
    });

    try {
      const result = await requestUploadedDataInsights({ datasetSummary });
      setInsightState({
        error: "",
        result,
        status: "success",
        summaryFingerprint,
      });
    } catch (error) {
      console.error("Uploaded dataset insights request failed:", error.message);
      setInsightState({
        error: error.message,
        result: null,
        status: "error",
        summaryFingerprint,
      });
    }
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionHeader
          subtitle="Generate AI observations from a redacted summary of the cleaned dataset."
          title={
            <>
              <Sparkles className="h-5 w-5 text-slate-500" />
              AI Dataset Insights
            </>
          }
        />
        <button
          className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(disabledReason)}
          onClick={generateInsights}
          type="button"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Generate Insights
        </button>
      </div>

      <PrivacySummary datasetSummary={datasetSummary} />

      {disabledReason && !isLoading && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          {disabledReason}
        </div>
      )}

      {isLoading && (
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <div className="flex items-center gap-2 font-semibold">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating secure insights
          </div>
          <p className="mt-1">
            Sending only the compact dataset profile to the Cloudflare API.
          </p>
        </div>
      )}

      {activeInsightState.status === "error" && (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Insights unavailable
          </div>
          <p className="mt-1">{activeInsightState.error}</p>
        </div>
      )}

      {activeInsightState.result && (
        <InsightsResult result={activeInsightState.result} />
      )}
    </Card>
  );
}

function PrivacySummary({ datasetSummary }) {
  const redactedCount = datasetSummary?.privacy?.sensitiveColumnCount || 0;
  const summaryStats = datasetSummary
    ? [
        `${datasetSummary.rowCount} cleaned rows`,
        `${datasetSummary.columnCount} columns`,
        `${redactedCount} redacted field${redactedCount === 1 ? "" : "s"}`,
      ]
    : ["Waiting for cleaned data"];

  return (
    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4" />
          Local-first workflow
        </div>
        <p className="mt-1">
          Uploading and deterministic cleaning stay in browser state. Raw files
          are not stored by default.
        </p>
      </div>
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
        <div className="flex items-center gap-2 font-semibold">
          <LockKeyhole className="h-4 w-4" />
          Summary sent to AI
        </div>
        <p className="mt-1">
          {summaryStats.join(" | ")}. No model is trained by this app.
        </p>
      </div>
    </div>
  );
}

function InsightsResult({ result }) {
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-3 lg:grid-cols-3">
        {result.insights.map((insight, index) => (
          <div
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            key={`${insight.title}-${index}`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-900">
                {insight.title}
              </h3>
              <SeverityBadge severity={insight.severity} />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {insight.description}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ResultList
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          items={result.recommendations}
          title="Recommendations"
        />
        <ResultList
          icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
          items={result.dataQualityNotes}
          title="Data quality notes"
        />
      </div>

      <div>
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          Suggested charts
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {result.suggestedCharts.map((chart, index) => (
            <div
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              key={`${chart.title}-${index}`}
            >
              <p className="text-sm font-bold text-slate-900">{chart.title}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                {chart.chartType}
              </p>
              <p className="mt-2 text-sm leading-5 text-slate-600">
                {chart.reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        {result.modelTrainingPointer}
      </div>
    </div>
  );
}

function ResultList({ icon, items, title }) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
        {icon}
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {items.map((item, index) => (
          <li
            className="rounded-lg border border-slate-100 bg-white px-3 py-2"
            key={`${title}-${index}`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeverityBadge({ severity }) {
  const className =
    {
      info: "bg-slate-100 text-slate-700",
      opportunity: "bg-emerald-100 text-emerald-700",
      risk: "bg-rose-100 text-rose-700",
      warning: "bg-amber-100 text-amber-700",
    }[severity] || "bg-slate-100 text-slate-700";

  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-1 text-[11px] font-bold uppercase ${className}`}
    >
      {severity || "info"}
    </span>
  );
}

function getDisabledReason({
  cleaningResult,
  datasetSummary,
  isLoading,
  uploadStatus,
}) {
  if (isLoading) return "An insight request is already running.";
  if (uploadStatus === "error") return "Resolve the file parsing error first.";
  if (!cleaningResult) return "Apply deterministic cleaning before generating insights.";
  if (!datasetSummary) return "A privacy-safe dataset summary could not be generated.";
  if (datasetSummary.rowCount === 0) return "The cleaned dataset has no rows to analyze.";
  return "";
}
