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
      interpretation: {
        summary:
          "group_size shows a weak negative pattern across submission_timestamp.",
      },
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

  it("explains when a line suggestion falls back to row order instead of time", () => {
    const plot = buildPlotFromSuggestion({
      cleaningResult: {
        headers: ["group_size", "submission_timestamp"],
        rows: [
          [3, "not ready"],
          [5, "still not ready"],
          [2, "missing date"],
        ],
      },
      suggestion: {
        chartType: "line",
        reason: "To examine the trend of submissions over time.",
        title: "Submission Timestamp Trend",
      },
    });

    expect(plot).toMatchObject({
      subtitle: "Cleaned group_size values by row order.",
      type: "line",
    });
    expect(plot.interpretation.summary).toContain("not a true time trend");
    expect(plot.interpretation.details[2]).toContain(
      "avoid treating it as a submission-time trend",
    );
  });
});
