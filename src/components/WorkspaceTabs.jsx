import { LayoutDashboard, UploadCloud } from "lucide-react";

const TABS = [
  {
    icon: LayoutDashboard,
    id: "demo",
    label: "Demo Dashboard",
  },
  {
    icon: UploadCloud,
    id: "upload",
    label: "Upload Data",
  },
];

export default function WorkspaceTabs({ activeView, onViewChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div
        aria-label="Workspace view"
        className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        role="tablist"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;

          return (
            <button
              aria-selected={isActive}
              className={`flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              role="tab"
              type="button"
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <p className="text-sm font-medium text-slate-500">
        Uploaded files are processed locally in your browser.
      </p>
    </div>
  );
}
