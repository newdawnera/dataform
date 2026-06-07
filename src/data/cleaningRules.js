export const HIGH_CONFIDENCE_RATIO = 0.9;
export const HIGH_MISSINGNESS_RATIO = 0.5;
export const MISSING_PLACEHOLDERS = new Set(["n/a", "na", "null", "none", "-"]);

const BOOLEAN_VALUE_MAP = new Map([
  ["true", "true"],
  ["false", "false"],
  ["yes", "true"],
  ["no", "false"],
  ["y", "true"],
  ["n", "false"],
  ["1", "true"],
  ["0", "false"],
]);

export function analyzeDatasetQuality({ headers = [], rows = [] }) {
  const totalColumns = getMaxColumnCount(headers, rows);
  const headerMapping = normalizeHeaders(headers, totalColumns);
  const duplicateColumnNames = findDuplicateColumnNames(headers, totalColumns);
  const columnAnalyses = buildColumnAnalyses(headers, rows, totalColumns);
  const duplicateRowCount = countDuplicateRows(rows, totalColumns);
  const emptyRowCount = rows.filter((row) =>
    isEmptyRow(row, totalColumns),
  ).length;
  const whitespaceIssues = countWhitespaceIssues(rows, totalColumns);
  const missingCellCount = countMissingCells(rows, totalColumns);
  const placeholderMissingCellCount = countPlaceholderMissingCells(
    rows,
    totalColumns,
  );
  const renamedHeaders = headerMapping.filter((item) => item.changed);
  const mixedColumns = columnAnalyses.filter(
    (column) => column.inferredTypes.length > 1,
  );
  const highMissingColumns = columnAnalyses.filter(
    (column) => column.missingRatio >= HIGH_MISSINGNESS_RATIO,
  );
  const numericCandidateColumns = columnAnalyses.filter(
    (column) => column.isNumericCandidate,
  );
  const dateCandidateColumns = columnAnalyses.filter(
    (column) => column.isDateCandidate,
  );
  const suspiciousNumberColumns = columnAnalyses.filter(
    (column) => column.suspiciousNumberValues.length > 0,
  );
  const ambiguousDateColumns = columnAnalyses.filter(
    (column) => column.ambiguousDateCount > 0,
  );
  const booleanCandidateColumns = columnAnalyses.filter(
    (column) => column.isBooleanCandidate,
  );
  const outlierColumns = columnAnalyses.filter(
    (column) => column.outlierCount > 0,
  );

  const recommendations = buildRecommendations({
    booleanCandidateColumns,
    dateCandidateColumns,
    duplicateColumnNames,
    duplicateRowCount,
    emptyRowCount,
    numericCandidateColumns,
    outlierColumns,
    placeholderMissingCellCount,
    renamedHeaders,
    whitespaceIssues,
  });

  return {
    ambiguousDateColumns,
    booleanCandidateColumns,
    columnAnalyses,
    dateCandidateColumns,
    duplicateColumnNames,
    duplicateRowCount,
    emptyRowCount,
    headerMapping,
    highMissingColumns,
    missingCellCount,
    mixedColumns,
    numericCandidateColumns,
    outlierColumns,
    placeholderMissingCellCount,
    recommendations,
    renamedHeaders,
    suspiciousNumberColumns,
    totalColumns,
    totalRows: rows.length,
    whitespaceCellCount: whitespaceIssues.cellCount,
    whitespaceColumns: whitespaceIssues.columns,
  };
}

export function getDefaultCleaningOptions(quality) {
  return {
    coerceBooleans: (quality?.booleanCandidateColumns.length || 0) > 0,
    coerceDates: (quality?.dateCandidateColumns.length || 0) > 0,
    coerceNumbers: (quality?.numericCandidateColumns.length || 0) > 0,
    normalizeHeaders: true,
    normalizeMissingValues: true,
    removeDuplicateRows: (quality?.duplicateRowCount || 0) > 0,
    removeEmptyRows: true,
    trimWhitespace: true,
  };
}

export function normalizeHeaders(headers = [], columnCount = headers.length) {
  const usedNames = new Set();
  const baseNameCounts = new Map();

  return Array.from({ length: columnCount }, (_, index) => {
    const originalHeader = getColumnNameAtIndex(headers, index);
    const baseHeader = normalizeHeaderBase(originalHeader, index);
    let suffixIndex = baseNameCounts.get(baseHeader) || 0;
    let cleanedHeader =
      suffixIndex === 0 ? baseHeader : `${baseHeader}_${suffixIndex + 1}`;

    while (usedNames.has(cleanedHeader)) {
      suffixIndex += 1;
      cleanedHeader = `${baseHeader}_${suffixIndex + 1}`;
    }

    baseNameCounts.set(baseHeader, suffixIndex + 1);
    usedNames.add(cleanedHeader);

    return {
      changed: String(originalHeader) !== cleanedHeader,
      cleanedHeader,
      columnIndex: index,
      originalHeader,
    };
  });
}

export function getColumnNameAtIndex(headers = [], index) {
  if (index < headers.length) return String(headers[index] ?? "");
  return `Extra ${index - headers.length + 1}`;
}

export function getMaxColumnCount(headers = [], rows = []) {
  return Math.max(headers.length, ...rows.map((row) => row.length), 0);
}

export function isMissingValue(value, { includePlaceholders = true } = {}) {
  if (value === undefined || value === null) return true;

  const trimmedValue = String(value).trim();
  if (trimmedValue === "") return true;

  return (
    includePlaceholders && MISSING_PLACEHOLDERS.has(trimmedValue.toLowerCase())
  );
}

export function parseBooleanValue(value) {
  if (typeof value === "boolean") return value ? "true" : "false";

  const normalizedValue = String(value ?? "").trim().toLowerCase();
  return BOOLEAN_VALUE_MAP.get(normalizedValue) || null;
}

export function parseNumberValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { isValid: true, value };
  }

  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue || isMissingValue(trimmedValue)) return null;
  if (trimmedValue.endsWith("%")) return null;

  const withoutCurrency = trimmedValue.replace(/^[£$€]\s*/, "");

  if (hasSuspiciousLeadingZero(withoutCurrency)) {
    return { isSuspicious: true, value: trimmedValue };
  }

  if (withoutCurrency.includes(",")) {
    const hasValidSeparators = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(
      withoutCurrency,
    );
    if (!hasValidSeparators) return null;
  }

  const normalizedValue = withoutCurrency.replace(/,/g, "");

  if (!/^[-+]?(\d+(\.\d+)?|\.\d+)(e[-+]?\d+)?$/i.test(normalizedValue)) {
    return null;
  }

  const parsedValue = Number(normalizedValue);
  if (!Number.isFinite(parsedValue)) return null;

  return { isValid: true, value: parsedValue };
}

export function parseDateValue(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return { isValid: true, isoValue: toIsoDate(value) };
  }

  const trimmedValue = String(value ?? "").trim();
  if (!trimmedValue || isMissingValue(trimmedValue)) return null;

  const isoMatch = trimmedValue.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s].*)?$/,
  );
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return buildDateParseResult(Number(year), Number(month), Number(day));
  }

  const slashMatch = trimmedValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[T\s].*)?$/);
  if (!slashMatch) return null;

  const [, firstPart, secondPart, yearPart] = slashMatch;
  const firstNumber = Number(firstPart);
  const secondNumber = Number(secondPart);
  const yearNumber = Number(yearPart);

  if (firstNumber <= 12 && secondNumber <= 12) {
    return { isAmbiguous: true, value: trimmedValue };
  }

  if (firstNumber > 12 && secondNumber <= 12) {
    return buildDateParseResult(yearNumber, secondNumber, firstNumber);
  }

  if (secondNumber > 12 && firstNumber <= 12) {
    return buildDateParseResult(yearNumber, firstNumber, secondNumber);
  }

  return null;
}

function buildColumnAnalyses(headers, rows, totalColumns) {
  return Array.from({ length: totalColumns }, (_, index) => {
    const columnName = getColumnNameAtIndex(headers, index);
    const values = rows.map((row) => row[index]);
    const observedValues = values.filter((value) => !isMissingValue(value));
    const missingCount = values.length - observedValues.length;
    const typeCounts = {
      boolean: 0,
      date: 0,
      number: 0,
      text: 0,
    };
    const suspiciousNumberValues = [];
    let ambiguousDateCount = 0;
    let booleanLikeCount = 0;
    let dateLikeCount = 0;
    let numericLikeCount = 0;

    observedValues.forEach((value) => {
      const booleanValue = parseBooleanValue(value);
      const numberValue = parseNumberValue(value);
      const dateValue = parseDateValue(value);

      if (booleanValue !== null) booleanLikeCount += 1;
      if (numberValue?.isValid) numericLikeCount += 1;
      if (numberValue?.isSuspicious) {
        suspiciousNumberValues.push(String(numberValue.value));
      }
      if (dateValue?.isValid) dateLikeCount += 1;
      if (dateValue?.isAmbiguous) ambiguousDateCount += 1;

      if (booleanValue !== null) {
        typeCounts.boolean += 1;
      } else if (numberValue?.isValid) {
        typeCounts.number += 1;
      } else if (dateValue?.isValid || dateValue?.isAmbiguous) {
        typeCounts.date += 1;
      } else {
        typeCounts.text += 1;
      }
    });

    const observedCount = observedValues.length;
    const booleanConfidence = getConfidence(booleanLikeCount, observedCount);
    const numericConfidence = getConfidence(numericLikeCount, observedCount);
    const dateConfidence = getConfidence(dateLikeCount, observedCount);
    const isBooleanCandidate =
      observedCount > 0 && booleanConfidence >= HIGH_CONFIDENCE_RATIO;
    const isNumericCandidate =
      observedCount > 0 &&
      numericConfidence >= HIGH_CONFIDENCE_RATIO &&
      suspiciousNumberValues.length === 0 &&
      !isBooleanCandidate;
    const isDateCandidate =
      observedCount > 0 &&
      dateConfidence >= HIGH_CONFIDENCE_RATIO &&
      ambiguousDateCount === 0;

    return {
      ambiguousDateCount,
      booleanConfidence,
      booleanLikeCount,
      columnIndex: index,
      dateConfidence,
      dateLikeCount,
      inferredTypes: Object.entries(typeCounts)
        .filter(([, count]) => count > 0)
        .map(([type]) => type),
      isBooleanCandidate,
      isDateCandidate,
      isNumericCandidate,
      missingCount,
      missingRatio: rows.length === 0 ? 0 : missingCount / rows.length,
      name: columnName,
      numericConfidence,
      numericLikeCount,
      observedCount,
      outlierCount: countOutliers(observedValues),
      suspiciousNumberValues,
      typeCounts,
    };
  });
}

function buildRecommendations({
  booleanCandidateColumns,
  dateCandidateColumns,
  duplicateColumnNames,
  duplicateRowCount,
  emptyRowCount,
  numericCandidateColumns,
  outlierColumns,
  placeholderMissingCellCount,
  renamedHeaders,
  whitespaceIssues,
}) {
  const recommendations = [];

  if (whitespaceIssues.cellCount > 0) {
    recommendations.push({
      id: "trimWhitespace",
      label: "Trim whitespace from text cells",
      detail: `${whitespaceIssues.cellCount} cell${
        whitespaceIssues.cellCount === 1 ? "" : "s"
      } have leading or trailing whitespace.`,
    });
  }

  if (renamedHeaders.length > 0 || duplicateColumnNames.length > 0) {
    recommendations.push({
      id: "normalizeHeaders",
      label: "Normalize column names",
      detail: "Clean headers and suffix duplicates while preserving order.",
    });
  }

  if (emptyRowCount > 0) {
    recommendations.push({
      id: "removeEmptyRows",
      label: "Remove fully empty rows",
      detail: `${emptyRowCount} empty row${
        emptyRowCount === 1 ? "" : "s"
      } detected.`,
    });
  }

  if (duplicateRowCount > 0) {
    recommendations.push({
      id: "removeDuplicateRows",
      label: "Remove duplicate rows",
      detail: `${duplicateRowCount} duplicate row${
        duplicateRowCount === 1 ? "" : "s"
      } detected.`,
    });
  }

  if (placeholderMissingCellCount > 0) {
    recommendations.push({
      id: "normalizeMissingValues",
      label: "Convert missing placeholders to blanks",
      detail: `${placeholderMissingCellCount} placeholder value${
        placeholderMissingCellCount === 1 ? "" : "s"
      } such as N/A or null can be standardized.`,
    });
  }

  if (numericCandidateColumns.length > 0) {
    recommendations.push({
      id: "coerceNumbers",
      label: "Coerce high-confidence numeric columns",
      detail: `${numericCandidateColumns.length} column${
        numericCandidateColumns.length === 1 ? "" : "s"
      } look safely numeric.`,
    });
  }

  if (dateCandidateColumns.length > 0) {
    recommendations.push({
      id: "coerceDates",
      label: "Normalize high-confidence date columns",
      detail: `${dateCandidateColumns.length} column${
        dateCandidateColumns.length === 1 ? "" : "s"
      } can be converted to ISO-style dates.`,
    });
  }

  if (booleanCandidateColumns.length > 0) {
    recommendations.push({
      id: "coerceBooleans",
      label: "Standardize boolean-like columns",
      detail: `${booleanCandidateColumns.length} column${
        booleanCandidateColumns.length === 1 ? "" : "s"
      } contain yes/no, true/false, or 1/0 values.`,
    });
  }

  if (outlierColumns.length > 0) {
    recommendations.push({
      id: "flagOutliers",
      label: "Flag numeric outliers",
      detail: `${outlierColumns.length} numeric column${
        outlierColumns.length === 1 ? "" : "s"
      } have potential outliers. Rows are not removed.`,
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: "reviewOnly",
      label: "No major cleaning actions suggested",
      detail: "The dataset still remains local and can be exported after review.",
    });
  }

  return recommendations;
}

function normalizeHeaderBase(header, index) {
  const normalizedHeader = String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalizedHeader || `column_${index + 1}`;
}

function findDuplicateColumnNames(headers, totalColumns) {
  const seenNames = new Set();
  const duplicateNames = new Set();

  Array.from({ length: totalColumns }, (_, index) =>
    getColumnNameAtIndex(headers, index),
  ).forEach((header) => {
    const normalizedHeader = String(header).trim().toLowerCase();
    if (!normalizedHeader) return;

    if (seenNames.has(normalizedHeader)) {
      duplicateNames.add(String(header).trim());
      return;
    }

    seenNames.add(normalizedHeader);
  });

  return [...duplicateNames];
}

function countWhitespaceIssues(rows, totalColumns) {
  const columns = new Map();
  let cellCount = 0;

  rows.forEach((row) => {
    Array.from({ length: totalColumns }, (_, index) => index).forEach(
      (columnIndex) => {
        const value = row[columnIndex];
        if (typeof value !== "string") return;

        const trimmedValue = value.trim();
        if (trimmedValue === value) return;

        cellCount += 1;
        columns.set(columnIndex, (columns.get(columnIndex) || 0) + 1);
      },
    );
  });

  return {
    cellCount,
    columns: [...columns.entries()].map(([columnIndex, count]) => ({
      columnIndex,
      count,
    })),
  };
}

function countMissingCells(rows, totalColumns) {
  return rows.reduce(
    (total, row) =>
      total +
      Array.from({ length: totalColumns }, (_, index) =>
        isMissingValue(row[index]) ? 1 : 0,
      ).reduce((sum, count) => sum + count, 0),
    0,
  );
}

function countPlaceholderMissingCells(rows, totalColumns) {
  return rows.reduce((total, row) => {
    const rowPlaceholderCount = Array.from(
      { length: totalColumns },
      (_, index) => row[index],
    ).filter((value) => {
      if (value === undefined || value === null) return false;
      const trimmedValue = String(value).trim().toLowerCase();
      return trimmedValue !== "" && MISSING_PLACEHOLDERS.has(trimmedValue);
    }).length;

    return total + rowPlaceholderCount;
  }, 0);
}

function isEmptyRow(row, totalColumns) {
  return Array.from({ length: totalColumns }, (_, index) =>
    isMissingValue(row[index]),
  ).every(Boolean);
}

function countDuplicateRows(rows, totalColumns) {
  const seenRows = new Set();
  let duplicateRowCount = 0;

  rows.forEach((row) => {
    const fingerprint = createRowFingerprint(row, totalColumns);

    if (seenRows.has(fingerprint)) {
      duplicateRowCount += 1;
      return;
    }

    seenRows.add(fingerprint);
  });

  return duplicateRowCount;
}

function createRowFingerprint(row, totalColumns) {
  return JSON.stringify(
    Array.from({ length: totalColumns }, (_, index) => {
      const value = row[index];
      if (isMissingValue(value)) return "";
      return typeof value === "string" ? value.trim() : value;
    }),
  );
}

function hasSuspiciousLeadingZero(value) {
  const normalizedValue = value.replace(/,/g, "");
  return /^[-+]?0\d/.test(normalizedValue);
}

function getConfidence(matchCount, observedCount) {
  if (observedCount === 0) return 0;
  return matchCount / observedCount;
}

function buildDateParseResult(year, month, day) {
  if (!isValidDateParts(year, month, day)) return null;

  return {
    isValid: true,
    isoValue: toIsoDate(new Date(Date.UTC(year, month - 1, day))),
  };
}

function isValidDateParts(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function countOutliers(values) {
  const numericValues = values
    .map((value) => parseNumberValue(value))
    .filter((result) => result?.isValid)
    .map((result) => result.value)
    .sort((left, right) => left - right);

  if (numericValues.length < 4) return 0;

  const firstQuartile = getQuantile(numericValues, 0.25);
  const thirdQuartile = getQuantile(numericValues, 0.75);
  const interquartileRange = thirdQuartile - firstQuartile;

  if (interquartileRange === 0) return 0;

  const lowerBound = firstQuartile - interquartileRange * 1.5;
  const upperBound = thirdQuartile + interquartileRange * 1.5;

  return numericValues.filter(
    (value) => value < lowerBound || value > upperBound,
  ).length;
}

function getQuantile(sortedValues, quantile) {
  const position = (sortedValues.length - 1) * quantile;
  const baseIndex = Math.floor(position);
  const remainder = position - baseIndex;
  const nextValue = sortedValues[baseIndex + 1];

  if (nextValue === undefined) return sortedValues[baseIndex];
  return sortedValues[baseIndex] + remainder * (nextValue - sortedValues[baseIndex]);
}
