import { Download } from "lucide-react";

export default function ReportButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-3 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-lg font-semibold hover:from-slate-800 hover:to-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
    >
      <Download className="w-4 h-4" />
      Download Full Risk Report (PDF)
    </button>
  );
}
