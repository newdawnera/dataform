import { describe, expect, it } from "vitest";

import { cleanDataset } from "./datasetCleaner.js";

const ALL_OPTIONS = {
  coerceBooleans: true,
  coerceDates: true,
  coerceNumbers: true,
  normalizeHeaders: true,
  normalizeMissingValues: true,
  removeDuplicateRows: true,
  removeEmptyRows: true,
  trimWhitespace: true,
};

describe("cleanDataset", () => {
  it("trims, normalizes headers, and coerces types on distinct rows", () => {
    const result = cleanDataset({
      headers: ["First Name", "Active", "Amount"],
      options: ALL_OPTIONS,
      rows: [
        ["  Alice  ", "yes", "$1,000.00"],
        ["Bob", "no", "2000"],
      ],
    });

    expect(result.headers).toEqual(["first_name", "active", "amount"]);
    expect(result.rows).toEqual([
      ["Alice", "true", 1000],
      ["Bob", "false", 2000],
    ]);
    expect(result.summary.trimmedCellCount).toBeGreaterThan(0);
    expect(result.summary.coercedNumericCells).toBe(2);
    expect(result.summary.coercedBooleanCells).toBe(2);
  });

  it("removes duplicate and fully empty rows", () => {
    const result = cleanDataset({
      headers: ["First Name", "Active", "Amount"],
      options: ALL_OPTIONS,
      rows: [
        ["Bob", "no", "2000"],
        ["Bob", "no", "2000"],
        ["", "", ""],
      ],
    });

    expect(result.rows).toEqual([["Bob", "false", 2000]]);
    expect(result.summary.removedDuplicateRows).toBe(1);
    expect(result.summary.removedEmptyRows).toBe(1);
    // NOTE: coercion stats are tallied before de-duplication, so the duplicate
    // row's coerced cell is still counted here.
    expect(result.summary.coercedNumericCells).toBe(2);
  });

  it("leaves data untouched when no options are enabled", () => {
    const rows = [["  a  ", "1"], ["b", "2"]];
    const result = cleanDataset({ headers: ["x", "y"], options: {}, rows });
    expect(result.headers).toEqual(["x", "y"]);
    expect(result.rows).toEqual(rows);
    expect(result.summary.removedDuplicateRows).toBe(0);
  });

  it("standardizes placeholder missing values to blanks", () => {
    const result = cleanDataset({
      headers: ["note"],
      options: { normalizeMissingValues: true },
      rows: [["N/A"], ["real"]],
    });
    expect(result.rows).toEqual([[""], ["real"]]);
    expect(result.summary.normalizedMissingCellCount).toBe(1);
  });

  it("preserves original headers and rows on the result", () => {
    const headers = ["A"];
    const rows = [["1"]];
    const result = cleanDataset({ headers, options: ALL_OPTIONS, rows });
    expect(result.originalHeaders).toBe(headers);
    expect(result.originalRows).toBe(rows);
  });
});
