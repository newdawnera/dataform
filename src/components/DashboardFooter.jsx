import { Users } from "lucide-react";

export default function DashboardFooter() {
  return (
    <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-slate-200 mt-8">
      <div className="flex flex-col md:flex-row justify-between items-center text-slate-500 text-sm">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <Users size={16} />
          <span>
            Built by <strong className="text-slate-700">Lucky J. Daniel</strong>
          </span>
        </div>
        <div className="flex gap-6 text-xs font-medium">
          <span className="text-blue-600">React.js</span>
          <span className="text-purple-600">Recharts</span>
          <span className="text-pink-600">Tailwind CSS</span>
          <span className="text-emerald-600">Groq AI</span>
        </div>
      </div>
    </footer>
  );
}
