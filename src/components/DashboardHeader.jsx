import { LayoutDashboard, RefreshCw } from "lucide-react";

export default function DashboardHeader({
  isRefreshing,
  onRefresh,
  showRefresh = true,
}) {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-lg shadow-lg">
            <LayoutDashboard className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
              Data Insight Workspace
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Retail risk demo + local data import
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {showRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          )}
          <span className="hidden md:block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
            Secure Insights
          </span>
        </div>
      </div>
    </header>
  );
}
