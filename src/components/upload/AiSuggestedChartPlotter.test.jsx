import { describe, expect, it } from "vitest";

import { buildPlotFromSuggestion } from "./aiSuggestedChartPlotterUtils";

describe("buildPlotFromSuggestion", () => {
  it("builds a scatter plot from a numeric column and a mentioned date column", () => {
    const plot = buildPlotFromSuggestion({
      cleaningResult: {
        headers: ["group_size", "submission_timestamp", "title"],
        rows: [
          [3, "2026-01-01", "Alpha"],
          [5, "2026-01-02", "Beta"],
          [2, "2026-01-03", "Gamma"],
        ],
      },
      suggestion: {
        chartType: "scatter",
        reason:
          "To investigate the relationship between 'group_size' and 'submission_timestamp'.",
        title: "Group Size vs. Submission Timestamp",
      },
    });

    expect(plot).toMatchObject({
      title: "Group Size vs. Submission Timestamp",
      type: "scatter",
      xLabel: "submission_timestamp",
      xValueType: "date",
      yLabel: "group_size",
      yValueType: "number",
    });
    expect(plot.data).toEqual([
      { x: Date.parse("2026-01-01T00:00:00Z"), y: 3 },
      { x: Date.parse("2026-01-02T00:00:00Z"), y: 5 },
      { x: Date.parse("2026-01-03T00:00:00Z"), y: 2 },
    ]);
  });
});
