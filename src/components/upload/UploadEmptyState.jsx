import { Database, ShieldCheck, TableProperties } from "lucide-react";

export default function UploadEmptyState() {
  const items = [
    {
      icon: TableProperties,
      label: "Preview",
      text: "Headers and sample rows appear after parsing.",
    },
    {
      icon: Database,
      label: "Profile",
      text: "Rows, columns, types, and missing cells are computed locally.",
    },
    {
      icon: ShieldCheck,
      label: "Private",
      text: "CSV and Excel contents remain in browser memory.",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            key={item.label}
          >
            <Icon className="h-5 w-5 text-blue-600" />
            <h3 className="mt-4 font-bold text-slate-900">{item.label}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
          </div>
        );
      })}
    </div>
  );
}
