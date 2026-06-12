import { describe, expect, it } from "vitest";

import { buildUploadedRevenueDashboard } from "./uploadedRevenueDashboardUtils";

describe("buildUploadedRevenueDashboard", () => {
  it("builds revenue metrics, trend, and category data from cleaned rows", () => {
    const dashboard = buildUploadedRevenueDashboard({
      headers: ["submission_date", "region", "annual_revenue"],
      rows: [
        ["2026-01-05", "North", 1200],
        ["2026-01-18", "South", 900],
        ["2026-02-02", "North", 1300],
        ["2026-02-14", "South", 1100],
      ],
    });

    expect(dashboard).toMatchObject({
      columns: {
        category: "region",
        date: "submission_date",
        revenue: "annual_revenue",
      },
      metrics: {
        averageRevenue: 1125,
        recordCount: 4,
        totalRevenue: 4500,
      },
    });
    expect(dashboard.categoryData).toEqual([
      { label: "region", name: "North", revenue: 2500 },
      { label: "region", name: "South", revenue: 2000 },
    ]);
    expect(dashboard.trendData).toEqual([
      { name: "2026-01", revenue: 2100 },
      { name: "2026-02", revenue: 2400 },
    ]);
    expect(dashboard.interpretation.summary).toContain("North currently leads");
  });

  it("does not build a revenue dashboard for unrelated numeric data", () => {
    const dashboard = buildUploadedRevenueDashboard({
      headers: ["submission_date", "region", "risk_score"],
      rows: [
        ["2026-01-05", "North", 0.2],
        ["2026-01-18", "South", 0.4],
      ],
    });

    expect(dashboard).toBeNull();
  });
});
