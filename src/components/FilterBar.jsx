import { Filter } from "lucide-react";

import { REGIONS, SEGMENTS } from "../utils/constants";
import Card from "./Card";

export default function FilterBar({
  filteredCount,
  onRegionChange,
  onSegmentChange,
  selectedRegion,
  selectedSegment,
  totalCount,
}) {
  return (
    <Card className="p-4 bg-gradient-to-r from-white to-slate-50">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-600" />
          <span className="font-semibold text-slate-700">Filters:</span>
        </div>

        <select
          value={selectedSegment}
          onChange={(event) => onSegmentChange(event.target.value)}
          className="px-4 py-2 bg-white border-2 border-purple-200 rounded-lg font-medium text-slate-700 hover:border-purple-400 focus:border-purple-500 focus:outline-none transition-colors"
        >
          <option value="all">All Segments</option>
          {SEGMENTS.map((segment) => (
            <option key={segment} value={segment}>
              {segment}
            </option>
          ))}
        </select>

        <select
          value={selectedRegion}
          onChange={(event) => onRegionChange(event.target.value)}
          className="px-4 py-2 bg-white border-2 border-blue-200 rounded-lg font-medium text-slate-700 hover:border-blue-400 focus:border-blue-500 focus:outline-none transition-colors"
        >
          <option value="all">All Regions</option>
          {REGIONS.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>

        <div className="ml-auto text-sm text-slate-600 font-medium">
          Displaying <span className="text-blue-600 font-bold">{filteredCount}</span>{" "}
          of {totalCount} records
        </div>
      </div>
    </Card>
  );
}
