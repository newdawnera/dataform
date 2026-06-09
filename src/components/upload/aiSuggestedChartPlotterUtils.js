import {
  isMissingValue,
  parseDateValue,
  parseNumberValue,
} from "../../data/cleaningRules";
import { detectSensitiveField } from "../../data/sensitiveFieldDetection";

const MAX_CATEGORY_ITEMS = 8;
const MAX_SCATTER_POINTS = 120;
const MAX_TABLE_ROWS = 10;

export function buildPlotFromSuggestion({ cleaningResult, suggestion }) {
  if (!cleaningResult?.headers || !cleaningResult?.rows?.length) return null;

  const columns = summarizeColumns(cleaningResult);
  const chartType = String(suggestion?.chartType || "bar").toLowerCase();
  const matchedColumns = findSuggestedColumns(suggestion, columns);
  const matchedColumn = matchedColumns[0];
  const numericColumns = columns.filter((column) => column.isNumeric);
  const dateColumns = columns.filter((column) => column.isDate);
  const categoricalColumns = columns.filter((column) => column.isCategorical);

  if (chartType === "line") {
    return buildLinePlot({
      dateColumn: matchedColumn?.isDate ? matchedColumn : dateColumns[0],
      numericColumn: matchedColumn?.isNumeric ? matchedColumn : numericColumns[0],
      rows: cleaningResult.rows,
      suggestion,
    });
  }

  if (chartType === "scatter") {
    const { xColumn, yColumn } = selectScatterColumns({
      dateColumns,
      matchedColumns,
      numericColumns,
    });

    return buildScatterPlot({ rows: cleaningResult.rows, suggestion, xColumn, yColumn });
  }

  if (chartType === "pie") {
    const column =
      matchedColumn ||
      categoricalColumns[0] ||
      numericColumns.find((item) => item.topValues.totalUniqueCount <= 20);

    return buildDistributionPlot({ column, suggestion, type: "pie" });
  }

  if (chartType === "table") {
    return buildTablePlot({
      columns,
      rows: cleaningResult.rows,
      suggestion,
    });
  }

  const column =
    matchedColumn ||
    categoricalColumns[0] ||
    numericColumns.find((item) => item.topValues.totalUniqueCount <= 20) ||
    numericColumns[0];

  return buildDistributionPlot({ column, suggestion, type: "bar" });
}

export function formatScatterValue(value, valueType = "number") {
  if (valueType === "date") return formatDateFromTimestamp(value);
  return formatNumber(value);
}

export function buildSuggestedChartRead({ plot, suggestion }) {
  if (plot?.interpretation?.summary) return plot.interpretation.summary;

  const chartType = String(suggestion?.chartType || "").toLowerCase();

  if (chartType === "scatter") {
    return "This would test whether two fields move together, but it needs both axes to be chart-ready before plotting.";
  }

  if (chartType === "line") {
    return "This would read changes over time when a date column is available; otherwise the app only shows row-order movement.";
  }

  if (chartType === "bar" || chartType === "pie") {
    return "This would compare how rows are distributed across the cleaned values that can be grouped locally.";
  }

  if (chartType === "table") {
    return "This would support inspection of the cleaned rows rather than a statistical pattern.";
  }

  return "This suggestion needs chart-ready local columns before the app can produce a grounded interpretation.";
}

export function ensureScatterSuggestion({ cleaningResult, suggestedCharts }) {
  const charts = Array.isArray(suggestedCharts) ? [...suggestedCharts] : [];

  const alreadyHasScatter = charts.some(
    (chart) => String(chart?.chartType || "").toLowerCase() === "scatter",
  );
  if (alreadyHasScatter) return charts;

  if (!cleaningResult?.headers || !cleaningResult?.rows?.length) return charts;

  const columns = summarizeColumns(cleaningResult);
  const numericColumns = columns.filter((column) => column.isNumeric);
  const dateColumns = columns.filter((column) => column.isDate);
  const { xColumn, yColumn } = selectScatterColumns({
    dateColumns,
    matchedColumns: [],
    numericColumns,
  });

  if (!xColumn || !yColumn) return charts;

  charts.push({
    chartType: "scatter",
    isDeterministicFallback: true,
    reason: `Relationship between '${yColumn.name}' and '${xColumn.name}', plotted locally from the cleaned columns.`,
    title: `${yColumn.name} vs ${xColumn.name}`,
  });

  return charts;
}

function summarizeColumns(cleaningResult) {
  return cleaningResult.headers
    .map((name, columnIndex) => {
      const observedValues = cleaningResult.rows
        .map((row) => row[columnIndex])
        .filter((value) => !isMissingValue(value));
      const numericValues = observedValues
        .map((value) => parseNumberValue(value))
        .filter((value) => value?.isValid)
        .map((value) => value.value);
      const dateValues = observedValues
        .map((value) => parseDateValue(value))
        .filter((value) => value?.isValid)
        .map((value) => value.isoValue);
      const topValues = buildTopValues(observedValues);
      const observedCount = observedValues.length;
      const numericRatio =
        observedCount === 0 ? 0 : numericValues.length / observedCount;
      const dateRatio =
        observedCount === 0 ? 0 : dateValues.length / observedCount;
      const columnName = String(name || `Column ${columnIndex + 1}`);

      return {
        columnIndex,
        isCategorical:
          observedCount > 0 &&
          numericRatio < 0.8 &&
          dateRatio < 0.8 &&
          topValues.totalUniqueCount > 1,
        isDate: observedCount > 0 && dateRatio >= 0.8,
        isNumeric: observedCount > 0 && numericRatio >= 0.8,
        isSensitive: detectSensitiveField(columnName).isSensitive,
        name: columnName,
        normalizedName: normalizeText(columnName),
        numericValues,
        observedCount,
        topValues,
      };
    })
    .filter((column) => !column.isSensitive);
}

function findSuggestedColumns(suggestion, columns) {
  const suggestionText = normalizeText(
    `${suggestion?.title || ""} ${suggestion?.reason || ""}`,
  );

  return columns
    .map((column) => ({
      column,
      score: scoreColumnMatch(suggestionText, column.normalizedName),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .map((item) => item.column);
}

function scoreColumnMatch(suggestionText, columnName) {
  if (!suggestionText || !columnName) return 0;
  if (suggestionText.includes(columnName)) return 100 + columnName.length;

  const tokens = columnName.split(" ").filter((token) => token.length > 2);
  return tokens.reduce(
    (score, token) => score + (suggestionText.includes(token) ? 10 : 0),
    0,
  );
}

function buildDistributionPlot({ column, suggestion, type }) {
  if (!column) return null;

  const data = column.isNumeric
    ? buildNumericBuckets(column.numericValues)
    : column.topValues.items.map((item) => ({
        name: item.name,
        value: item.count,
      }));

  if (data.length === 0) return null;

  return {
    data,
    interpretation: buildDistributionInterpretation({ column, data }),
    subtitle: `Plotted locally from cleaned ${column.name} values.`,
    title: suggestion?.title || `${column.name} Distribution`,
    type,
    valueLabel: "Rows",
  };
}

function buildLinePlot({ dateColumn, numericColumn, rows, suggestion }) {
  if (dateColumn) {
    const buckets = new Map();

    rows.forEach((row) => {
      const dateValue = parseDateValue(row[dateColumn.columnIndex]);
      if (!dateValue?.isValid) return;

      const bucket = dateValue.isoValue;
      const currentBucket = buckets.get(bucket) || { count: 0, total: 0 };
      const numericValue = numericColumn
        ? parseNumberValue(row[numericColumn.columnIndex])
        : null;

      currentBucket.count += 1;
      if (numericValue?.isValid) currentBucket.total += numericValue.value;

      buckets.set(bucket, currentBucket);
    });

    const data = [...buckets.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, bucket]) => ({
        name,
        value:
          numericColumn && bucket.count > 0
            ? roundNumber(bucket.total / bucket.count)
            : bucket.count,
      }));

    if (data.length === 0) return null;

    return {
      data,
      interpretation: buildDateLineInterpretation({
        data,
        dateColumn,
        numericColumn,
      }),
      subtitle: numericColumn
        ? `Average ${numericColumn.name} by ${dateColumn.name}.`
        : `Row count by ${dateColumn.name}.`,
      title: suggestion?.title || `${dateColumn.name} Trend`,
      type: "line",
      valueLabel: numericColumn ? `Average ${numericColumn.name}` : "Rows",
    };
  }

  if (!numericColumn) return null;

  return {
    data: numericColumn.numericValues.map((value, index) => ({
      name: String(index + 1),
      value,
    })),
    interpretation: buildRowOrderLineInterpretation({
      numericColumn,
      values: numericColumn.numericValues,
    }),
    subtitle: `Cleaned ${numericColumn.name} values by row order.`,
    title: suggestion?.title || `${numericColumn.name} Sequence`,
    type: "line",
    valueLabel: numericColumn.name,
  };
}

function selectScatterColumns({ dateColumns, matchedColumns, numericColumns }) {
  const chartableMatchedColumns = matchedColumns.filter(
    (column) => column.isNumeric || column.isDate,
  );
  const mentionedDateColumn = chartableMatchedColumns.find((column) => column.isDate);
  const mentionedNumericColumns = chartableMatchedColumns.filter(
    (column) => column.isNumeric,
  );
  const mentionedNumericColumn = mentionedNumericColumns[0];
  const allChartableColumns = [...numericColumns, ...dateColumns];

  if (mentionedDateColumn && mentionedNumericColumn) {
    return {
      xColumn: mentionedDateColumn,
      yColumn: mentionedNumericColumn,
    };
  }

  if (mentionedNumericColumns.length >= 2) {
    return {
      xColumn: mentionedNumericColumns[0],
      yColumn: mentionedNumericColumns[1],
    };
  }

  if (mentionedNumericColumn) {
    const fallbackColumn =
      numericColumns.find(
        (column) => column.columnIndex !== mentionedNumericColumn.columnIndex,
      ) ||
      dateColumns.find(
        (column) => column.columnIndex !== mentionedNumericColumn.columnIndex,
      );

    return fallbackColumn?.isDate
      ? { xColumn: fallbackColumn, yColumn: mentionedNumericColumn }
      : { xColumn: mentionedNumericColumn, yColumn: fallbackColumn || null };
  }

  if (mentionedDateColumn) {
    const fallbackColumn = numericColumns.find(
      (column) => column.columnIndex !== mentionedDateColumn.columnIndex,
    );

    return {
      xColumn: mentionedDateColumn,
      yColumn: fallbackColumn || null,
    };
  }

  if (numericColumns.length >= 2) {
    return {
      xColumn: numericColumns[0],
      yColumn: numericColumns[1],
    };
  }

  if (dateColumns.length > 0 && numericColumns.length > 0) {
    return {
      xColumn: dateColumns[0],
      yColumn: numericColumns[0],
    };
  }

  return {
    xColumn: allChartableColumns[0] || null,
    yColumn: allChartableColumns[1] || null,
  };
}

function buildScatterPlot({ rows, suggestion, xColumn, yColumn }) {
  if (!xColumn || !yColumn) return null;

  const data = rows
    .map((row) => {
      const xValue = parseScatterAxisValue(row[xColumn.columnIndex], xColumn);
      const yValue = parseScatterAxisValue(row[yColumn.columnIndex], yColumn);

      if (xValue === null || yValue === null) return null;

      return {
        x: xValue,
        y: yValue,
      };
    })
    .filter(Boolean)
    .slice(0, MAX_SCATTER_POINTS);

  if (data.length === 0) return null;

  return {
    data,
    interpretation: buildScatterInterpretation({
      data,
      xColumn,
      yColumn,
    }),
    subtitle: xColumn.isDate
      ? `${yColumn.name} by ${xColumn.name}.`
      : `${xColumn.name} compared with ${yColumn.name}.`,
    title: suggestion?.title || "Numeric Relationship",
    type: "scatter",
    xLabel: xColumn.name,
    xValueType: xColumn.isDate ? "date" : "number",
    yLabel: yColumn.name,
    yValueType: yColumn.isDate ? "date" : "number",
  };
}

function parseScatterAxisValue(value, column) {
  if (column.isDate) {
    const dateValue = parseDateValue(value);
    if (!dateValue?.isValid) return null;

    const timestamp = Date.parse(`${dateValue.isoValue}T00:00:00Z`);
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  const numericValue = parseNumberValue(value);
  return numericValue?.isValid ? numericValue.value : null;
}

function buildTablePlot({ columns, rows, suggestion }) {
  const visibleColumns = columns.slice(0, 6);
  if (visibleColumns.length === 0) return null;

  return {
    columns: visibleColumns.map((column) => column.name),
    interpretation: {
      details: [
        "Use this as a quick quality check for visible cleaned fields.",
        "Look for repeated blanks, unexpected formats, or values that still need normalization.",
      ],
      summary: `Showing ${Math.min(rows.length, MAX_TABLE_ROWS)} cleaned rows across ${visibleColumns.length} non-sensitive columns.`,
    },
    rows: rows.slice(0, MAX_TABLE_ROWS).map((row) =>
      visibleColumns.map((column) =>
        limitText(String(row[column.columnIndex] ?? ""), 80),
      ),
    ),
    subtitle: `First ${Math.min(rows.length, MAX_TABLE_ROWS)} cleaned rows for non-sensitive columns.`,
    title: suggestion?.title || "Cleaned Data Table",
    type: "table",
  };
}

function buildDistributionInterpretation({ column, data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const [topItem, secondItem] = [...data].sort(
    (left, right) => right.value - left.value,
  );

  if (!topItem || total === 0) {
    return {
      details: ["No visible distribution pattern could be calculated from the plotted values."],
      summary: `The plotted ${column.name} values do not show enough local data for interpretation.`,
    };
  }

  const topShare = formatPercent(topItem.value / total);
  const spreadRead =
    secondItem && topItem.value >= secondItem.value * 1.5
      ? `${topItem.name} is noticeably ahead of the next plotted value.`
      : "The plotted values are relatively spread across the leading groups.";

  return {
    details: [
      `${topItem.name} is the largest plotted group with ${formatNumber(topItem.value)} row${topItem.value === 1 ? "" : "s"}.`,
      spreadRead,
      "Treat this as a local distribution of cleaned values, not a causal explanation.",
    ],
    summary: `${column.name} is led by ${topItem.name}, representing ${topShare} of the plotted rows.`,
  };
}

function buildDateLineInterpretation({ data, dateColumn, numericColumn }) {
  const firstPoint = data[0];
  const lastPoint = data[data.length - 1];
  const peak = getMaxPoint(data, "value");
  const low = getMinPoint(data, "value");
  const valueLabel = numericColumn ? `average ${numericColumn.name}` : "row count";

  return {
    details: [
      `${valueLabel} starts at ${formatNumber(firstPoint.value)} and ends at ${formatNumber(lastPoint.value)}.`,
      `The highest plotted point is ${formatNumber(peak.value)} on ${peak.name}; the lowest is ${formatNumber(low.value)} on ${low.name}.`,
      "Spikes or dips can flag periods worth investigating in the underlying cleaned rows.",
    ],
    summary: `${valueLabel} ${describeDelta(lastPoint.value - firstPoint.value)} across ${dateColumn.name}.`,
  };
}

function buildRowOrderLineInterpretation({ numericColumn, values }) {
  const data = values.map((value, index) => ({ name: String(index + 1), value }));
  const peak = getMaxPoint(data, "value");
  const low = getMinPoint(data, "value");

  return {
    details: [
      `${numericColumn.name} ranges from ${formatNumber(low.value)} to ${formatNumber(peak.value)} in the plotted row sequence.`,
      `The highest value appears around row ${peak.name}; the lowest appears around row ${low.name}.`,
      "Use this for sequence anomalies or repeated runs, but avoid treating it as a submission-time trend.",
    ],
    summary: `This is not a true time trend: no chart-ready date column was found locally, so ${numericColumn.name} is shown by row order.`,
  };
}

function buildScatterInterpretation({ data, xColumn, yColumn }) {
  const correlation = calculateCorrelation(data);
  const strength = describeCorrelationStrength(correlation);
  const direction = describeCorrelationDirection(correlation);
  const xRange = getRange(data.map((item) => item.x));
  const yRange = getRange(data.map((item) => item.y));

  return {
    details: [
      `${xColumn.name} spans ${formatScatterAxisRange(xRange, xColumn)}; ${yColumn.name} spans ${formatScatterAxisRange(yRange, yColumn)}.`,
      `The plotted points show a ${strength} ${direction} association.`,
      "Use this as a relationship check; correlation in the plotted rows does not prove causation.",
    ],
    summary: xColumn.isDate
      ? `${yColumn.name} shows a ${strength} ${direction} pattern across ${xColumn.name}.`
      : `${xColumn.name} and ${yColumn.name} show a ${strength} ${direction} relationship in the plotted rows.`,
  };
}

function buildTopValues(values) {
  const counts = new Map();

  values.forEach((value) => {
    const label = limitText(String(value ?? "").trim(), 32);
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return {
    items: [...counts.entries()]
      .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
      .slice(0, MAX_CATEGORY_ITEMS)
      .map(([name, count]) => ({ count, name })),
    totalUniqueCount: counts.size,
  };
}

function buildNumericBuckets(values) {
  const sortedValues = [...values].sort((left, right) => left - right);
  if (sortedValues.length === 0) return [];

  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  const bucketCount = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(sortedValues.length))));
  const bucketWidth = max === min ? 1 : (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    name:
      max === min
        ? formatNumber(min)
        : `${formatNumber(min + bucketWidth * index)}-${formatNumber(
            min + bucketWidth * (index + 1),
          )}`,
    value: 0,
  }));

  sortedValues.forEach((value) => {
    const bucketIndex =
      max === min
        ? 0
        : Math.min(Math.floor((value - min) / bucketWidth), bucketCount - 1);
    buckets[bucketIndex].value += 1;
  });

  return buckets;
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function formatNumber(value) {
  if (!Number.isFinite(Number(value))) return String(value);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDateFromTimestamp(value) {
  const date = new Date(Number(value));
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toISOString().slice(0, 10);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "percent",
  }).format(value);
}

function formatScatterAxisRange(range, column) {
  if (column.isDate) {
    return `${formatDateFromTimestamp(range.min)} to ${formatDateFromTimestamp(range.max)}`;
  }

  return `${formatNumber(range.min)} to ${formatNumber(range.max)}`;
}

function describeDelta(delta) {
  if (delta > 0) return `increases by ${formatNumber(delta)}`;
  if (delta < 0) return `decreases by ${formatNumber(Math.abs(delta))}`;
  return "stays flat";
}

function getMaxPoint(data, key) {
  return data.reduce((max, item) => (item[key] > max[key] ? item : max), data[0]);
}

function getMinPoint(data, key) {
  return data.reduce((min, item) => (item[key] < min[key] ? item : min), data[0]);
}

function getRange(values) {
  return values.reduce(
    (range, value) => ({
      max: Math.max(range.max, value),
      min: Math.min(range.min, value),
    }),
    { max: values[0], min: values[0] },
  );
}

function calculateCorrelation(data) {
  if (data.length < 2) return 0;

  const xMean = data.reduce((sum, item) => sum + item.x, 0) / data.length;
  const yMean = data.reduce((sum, item) => sum + item.y, 0) / data.length;
  const totals = data.reduce(
    (acc, item) => {
      const xDelta = item.x - xMean;
      const yDelta = item.y - yMean;

      return {
        covariance: acc.covariance + xDelta * yDelta,
        xVariance: acc.xVariance + xDelta ** 2,
        yVariance: acc.yVariance + yDelta ** 2,
      };
    },
    { covariance: 0, xVariance: 0, yVariance: 0 },
  );
  const denominator = Math.sqrt(totals.xVariance * totals.yVariance);

  if (denominator === 0) return 0;
  return totals.covariance / denominator;
}

function describeCorrelationStrength(correlation) {
  const absoluteCorrelation = Math.abs(correlation);
  if (absoluteCorrelation >= 0.7) return "strong";
  if (absoluteCorrelation >= 0.35) return "moderate";
  return "weak";
}

function describeCorrelationDirection(correlation) {
  if (correlation > 0.1) return "positive";
  if (correlation < -0.1) return "negative";
  return "flat";
}

function roundNumber(value) {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(2));
}

function limitText(value, maxLength) {
  const text = String(value ?? "");
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}
