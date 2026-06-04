import {
  analyzeDatasetQuality,
  isMissingValue,
  parseBooleanValue,
  parseDateValue,
  parseNumberValue,
} from "./cleaningRules";
import {
  detectSensitiveField,
  summarizeSensitiveFields,
} from "./sensitiveFieldDetection";

const MAX_PROFILED_COLUMNS = 80;
const MAX_COLUMN_NAME_LENGTH = 120;
const MAX_RENAMED_COLUMNS = 25;
const MAX_TOP_VALUES = 5;
const MAX_VALUE_LENGTH = 80;

export function createAiDatasetSummary({ cleaningResult, file, profile }) {
  if (!cleaningResult?.headers || !cleaningResult?.rows) return null;

  const headers = cleaningResult.headers;
  const rows = cleaningResult.rows;
  const cleanedQuality = analyzeDatasetQuality({ headers, rows });
  const sensitiveFields = summarizeSensitiveFields(headers);
  const summary = cleaningResult.summary || {};
  const columnSummaries = headers
    .slice(0, MAX_PROFILED_COLUMNS)
    .map((header, columnIndex) =>
      summarizeColumn({
        columnIndex,
        columnName: header,
        rows,
      }),
    );

  return {
    schemaVersion: "phase4.dataset-summary.v1",
    datasetName: limitText(
      file?.name || profile?.fileName || "Uploaded dataset",
      MAX_VALUE_LENGTH,
    ),
    rowCount: rows.length,
    columnCount: headers.length,
    columnNames: headers.map((header) =>
      limitText(String(header ?? ""), MAX_COLUMN_NAME_LENGTH),
    ),
    omittedColumnProfileCount: Math.max(headers.length - MAX_PROFILED_COLUMNS, 0),
    sourceProfile: {
      originalColumnCount:
        summary.originalColumnCount ?? profile?.columnCount ?? headers.length,
      originalFileType: profile?.fileType || "unknown",
      originalRowCount: summary.originalRowCount ?? profile?.rowCount ?? rows.length,
    },
    cleaning: {
      actionsApplied: summary.appliedOptions || {},
      afterRowCount: summary.cleanedRowCount ?? rows.length,
      beforeRowCount: summary.originalRowCount ?? profile?.rowCount ?? rows.length,
      coercedBooleanCells: summary.coercedBooleanCells || 0,
      coercedDateCells: summary.coercedDateCells || 0,
      coercedNumericCells: summary.coercedNumericCells || 0,
      normalizedMissingCellCount: summary.normalizedMissingCellCount || 0,
      remainingMissingCells: summary.remainingMissingCells || 0,
      removedDuplicateRows: summary.removedDuplicateRows || 0,
      removedEmptyRows: summary.removedEmptyRows || 0,
      renamedColumns: (summary.renamedColumns || [])
        .slice(0, MAX_RENAMED_COLUMNS)
        .map((column) => ({
          columnIndex: column.columnIndex,
          cleanedHeader: limitText(column.cleanedHeader, MAX_COLUMN_NAME_LENGTH),
          originalHeader: limitText(column.originalHeader, MAX_COLUMN_NAME_LENGTH),
        })),
      trimmedCellCount: summary.trimmedCellCount || 0,
    },
    quality: {
      duplicateRowCount: cleanedQuality.duplicateRowCount,
      highMissingColumnCount: cleanedQuality.highMissingColumns.length,
      missingCellCount: cleanedQuality.missingCellCount,
      mixedColumnCount: columnSummaries.filter(
        (column) => column.inferredType === "mixed",
      ).length,
      originalDuplicateRowCount: cleaningResult.quality?.duplicateRowCount || 0,
      originalMissingCellCount: cleaningResult.quality?.missingCellCount || 0,
      outlierColumnCount: cleanedQuality.outlierColumns.length,
    },
    privacy: {
      rawRowsIncluded: false,
      redactionMethod: "best_effort_column_name_detection",
      sensitiveColumnCount: sensitiveFields.length,
      sensitiveFields: sensitiveFields.map((field) => ({
        category: field.category,
        columnIndex: field.columnIndex,
        columnName: limitText(field.columnName, MAX_COLUMN_NAME_LENGTH),
        reason: field.reason,
      })),
    },
    columns: columnSummaries,
  };
}

function summarizeColumn({ columnIndex, columnName, rows }) {
  const sensitiveField = detectSensitiveField(columnName);
  const values = rows.map((row) => row[columnIndex]);
  const missingCount = values.filter((value) => isMissingValue(value)).length;
  const observedValues = values.filter((value) => !isMissingValue(value));
  const typeCounts = countValueTypes(observedValues, columnName);
  const inferredType = inferColumnType(typeCounts, observedValues.length);
  const baseSummary = {
    columnIndex,
    columnName: limitText(columnName, MAX_COLUMN_NAME_LENGTH),
    inferredType,
    missingCount,
    missingRatio: roundRatio(rows.length === 0 ? 0 : missingCount / rows.length),
    observedCount: observedValues.length,
    sensitive: sensitiveField.isSensitive,
    typeCounts,
    uniqueCount: countUniqueValues(observedValues),
  };

  if (sensitiveField.isSensitive) {
    return {
      ...baseSummary,
      redaction: {
        applied: true,
        category: sensitiveField.category,
        reason: sensitiveField.reason,
        valuesIncluded: false,
      },
    };
  }

  if (inferredType === "number") {
    return {
      ...baseSummary,
      numericSummary: summarizeNumericValues(observedValues),
    };
  }

  if (inferredType === "date") {
    return {
      ...baseSummary,
      dateSummary: summarizeDateValues(observedValues),
    };
  }

  if (inferredType === "boolean") {
    return {
      ...baseSummary,
      booleanSummary: summarizeBooleanValues(observedValues),
    };
  }

  return {
    ...baseSummary,
    categoricalSummary: summarizeCategoricalValues(observedValues),
  };
}

function countValueTypes(values, columnName) {
  const isBooleanPreferred = isBooleanPreferredColumn(columnName);

  return values.reduce(
    (counts, value) => {
      if (isBooleanValue(value, isBooleanPreferred)) {
        counts.boolean += 1;
        return counts;
      }

      if (parseNumberValue(value)?.isValid) {
        counts.number += 1;
        return counts;
      }

      const dateValue = parseDateValue(value);
      if (dateValue?.isValid || dateValue?.isAmbiguous) {
        counts.date += 1;
        return counts;
      }

      counts.text += 1;
      return counts;
    },
    {
      boolean: 0,
      date: 0,
      number: 0,
      text: 0,
    },
  );
}

function isBooleanValue(value, isBooleanPreferred) {
  const normalizedValue = String(value ?? "").trim().toLowerCase();

  if (["true", "false", "yes", "no", "y", "n"].includes(normalizedValue)) {
    return true;
  }

  if (["1", "0"].includes(normalizedValue)) {
    return isBooleanPreferred;
  }

  return parseBooleanValue(value) !== null;
}

function isBooleanPreferredColumn(columnName) {
  const normalizedName = String(columnName ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");

  return [
    /\bis\b/,
    /\bhas\b/,
    /\bflag\b/,
    /\bactive\b/,
    /\benabled\b/,
    /\bdisabled\b/,
    /\bapproved\b/,
    /\bverified\b/,
    /\bsubscribed\b/,
    /\bboolean\b/,
  ].some((pattern) => pattern.test(normalizedName));
}

function inferColumnType(typeCounts, observedCount) {
  if (observedCount === 0) return "empty";

  const observedTypeCounts = Object.entries(typeCounts).filter(
    ([, count]) => count > 0,
  );

  if (observedTypeCounts.length === 1) return observedTypeCounts[0][0];

  const [dominantType, dominantCount] = observedTypeCounts.sort(
    ([, leftCount], [, rightCount]) => rightCount - leftCount,
  )[0];

  return dominantCount / observedCount >= 0.9 ? dominantType : "mixed";
}

function summarizeNumericValues(values) {
  const numericValues = values
    .map((value) => parseNumberValue(value))
    .filter((value) => value?.isValid)
    .map((value) => value.value)
    .sort((left, right) => left - right);

  if (numericValues.length === 0) return null;

  const total = numericValues.reduce((sum, value) => sum + value, 0);

  return {
    max: roundNumber(numericValues[numericValues.length - 1]),
    mean: roundNumber(total / numericValues.length),
    median: roundNumber(getMedian(numericValues)),
    min: roundNumber(numericValues[0]),
    outlierCount: countOutliers(numericValues),
  };
}

function summarizeDateValues(values) {
  const dateValues = values
    .map((value) => parseDateValue(value))
    .filter((value) => value?.isValid)
    .map((value) => value.isoValue)
    .sort();

  if (dateValues.length === 0) return null;

  return {
    earliestDate: dateValues[0],
    latestDate: dateValues[dateValues.length - 1],
    validDateCount: dateValues.length,
  };
}

function summarizeBooleanValues(values) {
  return values.reduce(
    (counts, value) => {
      const booleanValue = parseBooleanValue(value);

      if (booleanValue === "true") counts.trueCount += 1;
      if (booleanValue === "false") counts.falseCount += 1;

      return counts;
    },
    {
      falseCount: 0,
      trueCount: 0,
    },
  );
}

function summarizeCategoricalValues(values) {
  const valueCounts = new Map();

  values.forEach((value) => {
    const normalizedValue = limitText(String(value ?? "").trim(), MAX_VALUE_LENGTH);
    valueCounts.set(normalizedValue, (valueCounts.get(normalizedValue) || 0) + 1);
  });

  return {
    topValues: [...valueCounts.entries()]
      .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
      .slice(0, MAX_TOP_VALUES)
      .map(([value, count]) => ({ count, value })),
  };
}

function countUniqueValues(values) {
  return new Set(values.map((value) => String(value ?? "").trim())).size;
}

function countOutliers(sortedValues) {
  if (sortedValues.length < 4) return 0;

  const firstQuartile = getQuantile(sortedValues, 0.25);
  const thirdQuartile = getQuantile(sortedValues, 0.75);
  const interquartileRange = thirdQuartile - firstQuartile;

  if (interquartileRange === 0) return 0;

  const lowerBound = firstQuartile - interquartileRange * 1.5;
  const upperBound = thirdQuartile + interquartileRange * 1.5;

  return sortedValues.filter((value) => value < lowerBound || value > upperBound)
    .length;
}

function getMedian(sortedValues) {
  const middleIndex = Math.floor(sortedValues.length / 2);

  if (sortedValues.length % 2 === 1) return sortedValues[middleIndex];

  return (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
}

function getQuantile(sortedValues, quantile) {
  const position = (sortedValues.length - 1) * quantile;
  const baseIndex = Math.floor(position);
  const remainder = position - baseIndex;
  const nextValue = sortedValues[baseIndex + 1];

  if (nextValue === undefined) return sortedValues[baseIndex];

  return sortedValues[baseIndex] + remainder * (nextValue - sortedValues[baseIndex]);
}

function roundNumber(value) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(4));
}

function roundRatio(value) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(4));
}

function limitText(value, maxLength) {
  const text = String(value ?? "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}
