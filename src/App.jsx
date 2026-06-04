import { useMemo, useState } from "react";
import { Activity, ShieldAlert, TrendingUp, Wallet } from "lucide-react";

import PortfolioCompositionChart from "./charts/PortfolioCompositionChart";
import RegionalPerformanceChart from "./charts/RegionalPerformanceChart";
import RiskReturnScatterChart from "./charts/RiskReturnScatterChart";
import AIInsightsPanel from "./components/AIInsightsPanel";
import DashboardFooter from "./components/DashboardFooter";
import DashboardHeader from "./components/DashboardHeader";
import FilterBar from "./components/FilterBar";
import KPICard from "./components/KPICard";
import WorkspaceTabs from "./components/WorkspaceTabs";
import DataUploadPanel from "./components/upload/DataUploadPanel";
import {
  buildRegionData,
  buildRiskReturnData,
  buildSegmentData,
  calculatePortfolioMetrics,
  filterPortfolioData,
} from "./data/portfolioAggregations";
import { generatePortfolioData } from "./data/mockPortfolioData";
import {
  AI_INSIGHTS_ERROR_FALLBACK,
  requestGroqPortfolioInsights,
} from "./services/aiInsightsService";
import { openPrintableRiskReport } from "./services/reportService";
import { formatCompact } from "./utils/formatters";

export default function Dashboard() {
  const [activeView, setActiveView] = useState("demo");
  const [portfolioData, setPortfolioData] = useState(generatePortfolioData());
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [chartType, setChartType] = useState("bar");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setPortfolioData(generatePortfolioData());
      setAiAnalysis(null);
      setIsRefreshing(false);
    }, 800);
  };

  const filteredData = useMemo(
    () => filterPortfolioData(portfolioData, selectedSegment, selectedRegion),
    [portfolioData, selectedRegion, selectedSegment],
  );

  const metrics = useMemo(
    () => calculatePortfolioMetrics(filteredData),
    [filteredData],
  );

  const segmentData = useMemo(
    () => buildSegmentData(filteredData),
    [filteredData],
  );

  const regionData = useMemo(
    () => buildRegionData(filteredData),
    [filteredData],
  );

  const riskReturnData = useMemo(
    () => buildRiskReturnData(filteredData),
    [filteredData],
  );

  const generateAIInsights = async () => {
    if (isGenerating) return;

    setIsGenerating(true);

    try {
      const insights = await requestGroqPortfolioInsights({
        metrics,
        regionData,
        segmentData,
      });
      setAiAnalysis(insights);
    } catch (error) {
      console.error("AI Generation failed:", error);
      setAiAnalysis(AI_INSIGHTS_ERROR_FALLBACK);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReport = () => {
    openPrintableRiskReport({
      aiAnalysis,
      filteredCount: filteredData.length,
      metrics,
      regionData,
      segmentData,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <DashboardHeader
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        showRefresh={activeView === "demo"}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <WorkspaceTabs activeView={activeView} onViewChange={setActiveView} />

        <div className="space-y-8" hidden={activeView !== "demo"}>
          <FilterBar
            filteredCount={filteredData.length}
            onRegionChange={setSelectedRegion}
            onSegmentChange={setSelectedSegment}
            selectedRegion={selectedRegion}
            selectedSegment={selectedSegment}
            totalCount={portfolioData.length}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Portfolio Balance"
              value={formatCompact(metrics.totalBalance)}
              subtext="+12.5% vs Last Year"
              trend="positive"
              icon={Wallet}
              gradient="bg-emerald-600"
            />
            <KPICard
              title="Annual Revenue"
              value={formatCompact(metrics.totalRevenue)}
              subtext="+8.2% vs Target"
              trend="positive"
              icon={TrendingUp}
              gradient="bg-blue-600"
            />
            <KPICard
              title="Avg. Risk Score"
              value={metrics.avgRisk.toFixed(3)}
              subtext="Model v4.2 (Scale 0-1)"
              trend="neutral"
              icon={Activity}
              gradient="bg-violet-600"
            />
            <KPICard
              title="Default Rate"
              value={`${metrics.defaultRate.toFixed(1)}%`}
              subtext="Above threshold (>4.5%)"
              trend="negative"
              icon={ShieldAlert}
              gradient="bg-rose-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <PortfolioCompositionChart
              chartType={chartType}
              data={segmentData}
              onChartTypeChange={setChartType}
            />
            <RegionalPerformanceChart data={regionData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskReturnScatterChart data={riskReturnData} />
            <AIInsightsPanel
              aiAnalysis={aiAnalysis}
              isGenerating={isGenerating}
              metrics={metrics}
              onGenerate={generateAIInsights}
              onReport={generateReport}
              regionData={regionData}
              segmentData={segmentData}
            />
          </div>
        </div>

        <div hidden={activeView !== "upload"}>
          <DataUploadPanel />
        </div>
      </main>

      <DashboardFooter />
    </div>
  );
}
