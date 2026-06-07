import { describe, expect, it } from "vitest";

import {
  analyzeDatasetQuality,
  getColumnNameAtIndex,
  getDefaultCleaningOptions,
  getMaxColumnCount,
  isMissingValue,
  normalizeHeaders,
  parseBooleanValue,
  parseDateValue,
  parseNumberValue,
} from "./cleaningRules.js";

describe("isMissingValue", () => {
  it("treats null, undefined, and blank strings as missing", () => {
    expect(isMissingValue(null)).toBe(true);
    expect(isMissingValue(undefined)).toBe(true);
    expect(isMissingValue("   ")).toBe(true);
  });

  it("treats known placeholders as missing by default", () => {
    expect(isMissingValue("N/A")).toBe(true);
    expect(isMissingValue("null")).toBe(true);
    expect(isMissingValue("-")).toBe(true);
  });

  it("can ignore placeholders when asked", () => {
    expect(isMissingValue("N/A", { includePlaceholders: false })).toBe(false);
  });

  it("treats real values as present", () => {
    expect(isMissingValue("0")).toBe(false);
    expect(isMissingValue(0)).toBe(false);
    expect(isMissingValue("hello")).toBe(false);
  });
});

describe("parseBooleanValue", () => {
  it("maps common truthy/falsy tokens", () => {
    expect(parseBooleanValue("yes")).toBe("true");
    expect(parseBooleanValue("N")).toBe("false");
    expect(parseBooleanValue("1")).toBe("true");
    expect(parseBooleanValue("0")).toBe("false");
    expect(parseBooleanValue(true)).toBe("true");
  });

  it("returns null for non-boolean text", () => {
    expect(parseBooleanValue("maybe")).toBeNull();
    expect(parseBooleanValue("2")).toBeNull();
  });
});

describe("parseNumberValue", () => {
  it("parses plain, currency, and thousands-separated numbers", () => {
    expect(parseNumberValue("1234")).toEqual({ isValid: true, value: 1234 });
    expect(parseNumberValue("$1,234.50")).toEqual({ isValid: true, value: 1234.5 });
    expect(parseNumberValue("£1,234.50")).toEqual({ isValid: true, value: 1234.5 });
    expect(parseNumberValue(42)).toEqual({ isValid: true, value: 42 });
  });

  it("rejects percentages and malformed thousands groups", () => {
    expect(parseNumberValue("50%")).toBeNull();
    expect(parseNumberValue("1,23,456")).toBeNull();
  });

  it("flags suspicious leading-zero values rather than coercing them", () => {
    const result = parseNumberValue("0123");
    expect(result.isSuspicious).toBe(true);
    expect(result.isValid).toBeUndefined();
  });

  it("returns null for non-numeric text and missing values", () => {
    expect(parseNumberValue("abc")).toBeNull();
    expect(parseNumberValue("")).toBeNull();
    expect(parseNumberValue("N/A")).toBeNull();
  });
});

describe("parseDateValue", () => {
  it("normalizes ISO-style dates", () => {
    expect(parseDateValue("2024-01-05")).toEqual({
      isValid: true,
      isoValue: "2024-01-05",
    });
  });

  it("resolves unambiguous slash dates by day > 12", () => {
    expect(parseDateValue("25/12/2024")).toEqual({
      isValid: true,
      isoValue: "2024-12-25",
    });
    expect(parseDateValue("12/25/2024")).toEqual({
      isValid: true,
      isoValue: "2024-12-25",
    });
  });

  it("parses slash and ISO dates that include a time component", () => {
    expect(parseDateValue("25/12/2024 08:10")).toEqual({
      isValid: true,
      isoValue: "2024-12-25",
    });
    expect(parseDateValue("12/25/2024 08:10:00")).toEqual({
      isValid: true,
      isoValue: "2024-12-25",
    });
    expect(parseDateValue("2024-12-25T08:10:00")).toEqual({
      isValid: true,
      isoValue: "2024-12-25",
    });
  });

  it("marks genuinely ambiguous dates instead of guessing", () => {
    const result = parseDateValue("03/04/2024");
    expect(result.isAmbiguous).toBe(true);
    expect(result.isValid).toBeUndefined();
  });

  it("rejects impossible and non-date values", () => {
    expect(parseDateValue("2024-13-40")).toBeNull();
    expect(parseDateValue("not a date")).toBeNull();
  });
});

describe("normalizeHeaders", () => {
  it("lowercases, separates with underscores, and suffixes duplicates", () => {
    const mapping = normalizeHeaders(["First Name", "First Name", "Amount $"]);
    expect(mapping.map((m) => m.cleanedHeader)).toEqual([
      "first_name",
      "first_name_2",
      "amount",
    ]);
    expect(mapping[1].changed).toBe(true);
  });

  it("synthesizes names for blank headers", () => {
    const mapping = normalizeHeaders(["", "  "]);
    expect(mapping[0].cleanedHeader).toBe("column_1");
    expect(mapping[1].cleanedHeader).toBe("column_2");
  });
});

describe("column index helpers", () => {
  it("getMaxColumnCount accounts for ragged rows", () => {
    expect(getMaxColumnCount(["a", "b"], [[1], [1, 2, 3]])).toBe(3);
  });

  it("getColumnNameAtIndex synthesizes names past the header length", () => {
    expect(getColumnNameAtIndex(["a"], 0)).toBe("a");
    expect(getColumnNameAtIndex(["a"], 2)).toBe("Extra 2");
  });
});

describe("analyzeDatasetQuality", () => {
  const headers = ["Name", "Active", "Amount"];
  const rows = [
    ["Alice ", "yes", "1,000"],
    ["Bob", "no", "2000"],
    ["Alice ", "yes", "1,000"],
    ["", "", ""],
  ];

  it("detects empty rows, duplicate rows, and whitespace issues", () => {
    const quality = analyzeDatasetQuality({ headers, rows });
    expect(quality.emptyRowCount).toBe(1);
    expect(quality.duplicateRowCount).toBe(1);
    expect(quality.whitespaceCellCount).toBeGreaterThan(0);
  });

  it("identifies numeric and boolean candidate columns", () => {
    const quality = analyzeDatasetQuality({ headers, rows });
    expect(quality.numericCandidateColumns.map((c) => c.columnIndex)).toContain(2);
    expect(quality.booleanCandidateColumns.map((c) => c.columnIndex)).toContain(1);
  });

  it("flags numeric outliers via the IQR rule", () => {
    const outlierQuality = analyzeDatasetQuality({
      headers: ["value"],
      rows: [["10"], ["11"], ["12"], ["13"], ["1000"]],
    });
    expect(outlierQuality.outlierColumns.length).toBe(1);
  });
});

describe("getDefaultCleaningOptions", () => {
  it("enables coercions only when candidates exist", () => {
    const quality = analyzeDatasetQuality({
      headers: ["Amount"],
      rows: [["1"], ["2"], ["3"]],
    });
    const options = getDefaultCleaningOptions(quality);
    expect(options.coerceNumbers).toBe(true);
    expect(options.trimWhitespace).toBe(true);
    expect(options.coerceDates).toBe(false);
  });
});
