import { describe, expect, it } from "vitest";

import {
  buildPlotFromSuggestion,
  ensureScatterSuggestion,
} from "./aiSuggestedChartPlotterUtils";

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

  it("builds a scatter plot when the date column carries a time component", () => {
    const plot = buildPlotFromSuggestion({
      cleaningResult: {
        headers: ["group_size", "submission_timestamp", "title"],
        rows: [
          [3, "18/01/2026 08:10", "Alpha"],
          [5, "19/01/2026 09:00", "Beta"],
          [2, "20/01/2026 10:30", "Gamma"],
        ],
      },
      suggestion: {
        chartType: "scatter",
        reason:
          "To explore the relationship between 'group_size' and 'submission_timestamp'.",
        title: "Group Size Over Time",
      },
    });

    expect(plot).toMatchObject({
      type: "scatter",
      xLabel: "submission_timestamp",
      xValueType: "date",
      yLabel: "group_size",
      yValueType: "number",
    });
    expect(plot.data).toEqual([
      { x: Date.parse("2026-01-18T00:00:00Z"), y: 3 },
      { x: Date.parse("2026-01-19T00:00:00Z"), y: 5 },
      { x: Date.parse("2026-01-20T00:00:00Z"), y: 2 },
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

describe("ensureScatterSuggestion", () => {
  const cleaningResult = {
    headers: ["group_size", "submission_timestamp", "title"],
    rows: [
      [3, "18/01/2026 08:10", "Alpha"],
      [5, "19/01/2026 09:00", "Beta"],
      [2, "20/01/2026 10:30", "Gamma"],
    ],
  };

  it("appends a plottable scatter when none is suggested and axes are chartable", () => {
    const charts = ensureScatterSuggestion({
      cleaningResult,
      suggestedCharts: [{ chartType: "bar", title: "Title Distribution" }],
    });

    const scatter = charts.find((chart) => chart.chartType === "scatter");
    expect(scatter).toBeTruthy();

    const plot = buildPlotFromSuggestion({ cleaningResult, suggestion: scatter });
    expect(plot).toMatchObject({
      type: "scatter",
      xValueType: "date",
      yValueType: "number",
    });
  });

  it("does not add a second scatter when one already exists", () => {
    const input = [{ chartType: "scatter", title: "Existing" }];
    const charts = ensureScatterSuggestion({
      cleaningResult,
      suggestedCharts: input,
    });
    expect(charts.filter((chart) => chart.chartType === "scatter")).toHaveLength(1);
  });

  it("leaves suggestions unchanged when no chartable axes exist", () => {
    const charts = ensureScatterSuggestion({
      cleaningResult: { headers: ["title"], rows: [["Alpha"], ["Beta"]] },
      suggestedCharts: [{ chartType: "bar", title: "Title" }],
    });
    expect(charts).toHaveLength(1);
  });
});
