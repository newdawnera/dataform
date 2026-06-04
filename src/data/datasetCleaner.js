import {
  analyzeDatasetQuality,
  getColumnNameAtIndex,
  isMissingValue,
  parseBooleanValue,
  parseDateValue,
  parseNumberValue,
} from "./cleaningRules.js";

const TRACKED_SAMPLE_LIMIT = 5;

export function cleanDataset({ headers = [], options = {}, rows = [] }) {
  const quality = analyzeDatasetQuality({ headers, rows });
  const columnCount = quality.totalColumns;
  const headerMapping = options.normalizeHeaders
    ? quality.headerMapping
    : createPassthroughHeaderMapping(headers, columnCount);
  const cleanedHeaders = headerMapping.map((item) => item.cleanedHeader);
  const booleanColumns = createColumnSet(
    options.coerceBooleans,
    quality.booleanCandidateColumns,
  );
  const dateColumns = createColumnSet(
    options.coerceDates,
    quality.dateCandidateColumns,
  );
  const numericColumns = createColumnSet(
    options.coerceNumbers,
    quality.numericCandidateColumns,
  );
  const summary = createInitialSummary({
    columnCount,
    headerMapping,
    options,
    rowCount: rows.length,
  });
  const cleanedRows = [];

  rows.forEach((row) => {
    const cleanedRow = cleanRow({
      booleanColumns,
      columnCount,
      dateColumns,
      numericColumns,
      options,
      row,
      summary,
    });

    if (
      options.removeEmptyRows &&
      cleanedRow.every((value) => isMissingValue(value))
    ) {
      summary.removedEmptyRows += 1;
      return;
    }

    cleanedRows.push(cleanedRow);
  });

  const dedupedRows = options.removeDuplicateRows
    ? removeDuplicateRows(cleanedRows, summary)
    : cleanedRows;

  summary.cleanedRowCount = dedupedRows.length;
  summary.remainingMissingCells = countMissingCells(dedupedRows);
  summary.numericCoercionsByColumn = countsToColumnSummaries(
    summary.numericCoercionCounts,
    cleanedHeaders,
    "coercedCells",
  );
  summary.dateCoercionsByColumn = countsToColumnSummaries(
    summary.dateCoercionCounts,
    cleanedHeaders,
    "coercedCells",
  );
  summary.booleanCoercionsByColumn = countsToColumnSummaries(
    summary.booleanCoercionCounts,
    cleanedHeaders,
    "coercedCells",
  );
  summary.skippedSuspiciousNumberValues = sampleMapToSummaries(
    summary.suspiciousNumberSamples,
    cleanedHeaders,
  );
  summary.skippedAmbiguousDateValues = sampleMapToSummaries(
    summary.ambiguousDateSamples,
    cleanedHeaders,
  );

  delete summary.numericCoercionCounts;
  delete summary.dateCoercionCounts;
  delete summary.booleanCoercionCounts;
  delete summary.suspiciousNumberSamples;
  delete summary.ambiguousDateSamples;

  return {
    headers: cleanedHeaders,
    originalHeaders: headers,
    originalRows: rows,
    quality,
    rows: dedupedRows,
    summary,
  };
}

function cleanRow({
  booleanColumns,
  columnCount,
  dateColumns,
  numericColumns,
  options,
  row,
  summary,
}) {
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    let value = row[columnIndex] ?? "";

    if (options.trimWhitespace && typeof value === "string") {
      const trimmedValue = value.trim();
      if (trimmedValue !== value) {
        summary.trimmedCellCount += 1;
        value = trimmedValue;
      }
    }

    if (options.normalizeMissingValues && isMissingValue(value)) {
      if (String(value ?? "").trim() !== "") {
        summary.normalizedMissingCellCount += 1;
      }
      return "";
    }

    if (value === undefined || value === null) return "";
    if (isMissingValue(value)) return value;

    if (booleanColumns.has(columnIndex)) {
      const coercedBoolean = parseBooleanValue(value);
      if (coercedBoolean !== null) {
        incrementMap(summary.booleanCoercionCounts, columnIndex);
        summary.coercedBooleanCells += 1;
        return coercedBoolean;
      }
    }

    if (numericColumns.has(columnIndex)) {
      const coercedNumber = parseNumberValue(value);
      if (coercedNumber?.isValid) {
        incrementMap(summary.numericCoercionCounts, columnIndex);
        summary.coercedNumericCells += 1;
        return coercedNumber.value;
      }

      if (coercedNumber?.isSuspicious) {
        addSample(summary.suspiciousNumberSamples, columnIndex, coercedNumber.value);
      }
    }

    if (dateColumns.has(columnIndex)) {
      const coercedDate = parseDateValue(value);
      if (coercedDate?.isValid) {
        incrementMap(summary.dateCoercionCounts, columnIndex);
        summary.coercedDateCells += 1;
        return coercedDate.isoValue;
      }

      if (coercedDate?.isAmbiguous) {
        addSample(summary.ambiguousDateSamples, columnIndex, coercedDate.value);
      }
    }

    return value;
  });
}

function createInitialSummary({ columnCount, headerMapping, options, rowCount }) {
  return {
    appliedOptions: { ...options },
    booleanCoercionCounts: new Map(),
    booleanCoercionsByColumn: [],
    cleanedColumnCount: columnCount,
    cleanedRowCount: rowCount,
    coercedBooleanCells: 0,
    coercedDateCells: 0,
    coercedNumericCells: 0,
    dateCoercionCounts: new Map(),
    dateCoercionsByColumn: [],
    normalizedMissingCellCount: 0,
    numericCoercionCounts: new Map(),
    numericCoercionsByColumn: [],
    originalColumnCount: columnCount,
    originalRowCount: rowCount,
    remainingMissingCells: 0,
    removedDuplicateRows: 0,
    removedEmptyRows: 0,
    renamedColumns: options.normalizeHeaders
      ? headerMapping.filter((item) => item.changed)
      : [],
    skippedAmbiguousDateValues: [],
    skippedSuspiciousNumberValues: [],
    ambiguousDateSamples: new Map(),
    suspiciousNumberSamples: new Map(),
    trimmedCellCount: 0,
  };
}

function createPassthroughHeaderMapping(headers, columnCount) {
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const header = getColumnNameAtIndex(headers, columnIndex);
    return {
      changed: false,
      cleanedHeader: header,
      columnIndex,
      originalHeader: header,
    };
  });
}

function createColumnSet(isEnabled, columns) {
  if (!isEnabled) return new Set();
  return new Set(columns.map((column) => column.columnIndex));
}

function removeDuplicateRows(rows, summary) {
  const seenRows = new Set();
  const dedupedRows = [];

  rows.forEach((row) => {
    const fingerprint = JSON.stringify(row);

    if (seenRows.has(fingerprint)) {
      summary.removedDuplicateRows += 1;
      return;
    }

    seenRows.add(fingerprint);
    dedupedRows.push(row);
  });

  return dedupedRows;
}

function countMissingCells(rows) {
  return rows.reduce(
    (total, row) =>
      total +
      row.filter((value) => isMissingValue(value)).length,
    0,
  );
}

function incrementMap(map, key) {
  map.set(key, (map.get(key) || 0) + 1);
}

function addSample(map, key, value) {
  const samples = map.get(key) || [];
  if (samples.length < TRACKED_SAMPLE_LIMIT) {
    samples.push(String(value));
  }
  map.set(key, samples);
}

function countsToColumnSummaries(counts, headers, countKey) {
  return [...counts.entries()].map(([columnIndex, count]) => ({
    columnIndex,
    columnName: headers[columnIndex],
    [countKey]: count,
  }));
}

function sampleMapToSummaries(samplesByColumn, headers) {
  return [...samplesByColumn.entries()].map(([columnIndex, samples]) => ({
    columnIndex,
    columnName: headers[columnIndex],
    samples,
    skippedCount: samples.length,
  }));
}
