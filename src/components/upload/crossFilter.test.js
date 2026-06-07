import { describe, expect, it } from "vitest";

import {
  applyCrossFilter,
  categoryLabel,
  isActiveCrossFilter,
  toggleCrossFilter,
} from "./crossFilter";

const result = {
  headers: ["region", "amount"],
  rows: [
    ["EMEA", "10"],
    ["APAC", "20"],
    ["EMEA", "30"],
    ["AMER", "40"],
  ],
};

describe("categoryLabel", () => {
  it("trims values and coerces to string", () => {
    expect(categoryLabel("  EMEA  ")).toBe("EMEA");
    expect(categoryLabel(42)).toBe("42");
    expect(categoryLabel(null)).toBe("");
  });

  it("truncates long values consistently", () => {
    const long = "x".repeat(40);
    expect(categoryLabel(long)).toBe(`${"x".repeat(31)}...`);
  });
});

describe("isActiveCrossFilter", () => {
  it("recognizes valid and invalid filters", () => {
    expect(isActiveCrossFilter(null)).toBe(false);
    expect(isActiveCrossFilter({ columnIndex: -1, value: "x" })).toBe(false);
    expect(isActiveCrossFilter({ columnIndex: 0, value: null })).toBe(false);
    expect(isActiveCrossFilter({ columnIndex: 0, value: "EMEA" })).toBe(true);
  });
});

describe("applyCrossFilter", () => {
  it("returns the original result when no filter is active", () => {
    expect(applyCrossFilter(result, null)).toBe(result);
  });

  it("keeps only matching rows", () => {
    const filtered = applyCrossFilter(result, {
      columnIndex: 0,
      columnName: "region",
      value: "EMEA",
    });
    expect(filtered.rows).toEqual([
      ["EMEA", "10"],
      ["EMEA", "30"],
    ]);
    expect(filtered.headers).toBe(result.headers);
  });

  it("returns no rows when nothing matches", () => {
    const filtered = applyCrossFilter(result, {
      columnIndex: 0,
      columnName: "region",
      value: "NOPE",
    });
    expect(filtered.rows).toEqual([]);
  });

  it("handles a null result safely", () => {
    expect(applyCrossFilter(null, { columnIndex: 0, value: "x" })).toBe(null);
  });
});

describe("toggleCrossFilter", () => {
  const selection = { columnIndex: 0, columnName: "region", value: "EMEA" };

  it("sets a new filter", () => {
    expect(toggleCrossFilter(null, selection)).toEqual(selection);
  });

  it("clears when the same value is selected again", () => {
    expect(toggleCrossFilter(selection, selection)).toBe(null);
  });

  it("switches to a different value", () => {
    const next = { columnIndex: 0, columnName: "region", value: "APAC" };
    expect(toggleCrossFilter(selection, next)).toEqual(next);
  });
});
