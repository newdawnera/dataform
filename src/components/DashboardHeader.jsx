import { LayoutDashboard, RefreshCw } from "lucide-react";

export default function DashboardHeader({
  isRefreshing,
  onRefresh,
  showRefresh = true,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 p-2 shadow">
            <LayoutDashboard aria-hidden="true" className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight text-slate-900">
              Data Insight Workspace
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Retail risk demo · local data import
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {showRefresh && (
            <button
              aria-label={isRefreshing ? "Refreshing data" : "Refresh data"}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isRefreshing}
              onClick={onRefresh}
              type="button"
            >
              <RefreshCw
                aria-hidden="true"
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          )}
          <span className="hidden rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 md:block">
            Secure Insights
          </span>
        </div>
      </div>
    </header>
  );
}
