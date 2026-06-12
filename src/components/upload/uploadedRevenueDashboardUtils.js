import {
  isMissingValue,
  parseDateValue,
  parseNumberValue,
} from "../../data/cleaningRules";
import { detectSensitiveField } from "../../data/sensitiveFieldDetection";

const MAX_CATEGORY_ITEMS = 8;
const MAX_TREND_POINTS = 18;
const MAX_BUCKETS = 6;

export function buildUploadedRevenueDashboard(result) {
  if (!result?.headers?.length || !result?.rows?.length) return null;

  const columns = summarizeColumns(result);
  const revenueColumn = selectRevenueColumn(columns.filter((column) => column.isNumeric));
  if (!revenueColumn) return null;

  const dateColumn = selectDateColumn(columns.filter((column) => column.isDate));
  const categoryColumn = selectCategoryColumn(
    columns.filter((column) => column.isCategorical),
  );
  const revenueRows = buildRevenueRows({
    categoryColumn,
    dateColumn,
    revenueColumn,
    rows: result.rows,
  });

  if (revenueRows.length === 0) return null;

  const totalRevenue = revenueRows.reduce((sum, row) => sum + row.revenue, 0);
  const categoryData = categoryColumn
    ? buildCategoryData(revenueRows, categoryColumn.name)
    : [];
  const trendData = dateColumn ? buildTrendData(revenueRows) : [];
  const distributionData = buildRevenueDistribution(revenueRows);
  const topCategory = categoryData[0] || null;
  const latestPeriod = trendData[trendData.length - 1] || null;
  const firstPeriod = trendData[0] || null;

  return {
    categoryData,
    columns: {
      category: categoryColumn?.name || null,
      date: dateColumn?.name || null,
      revenue: revenueColumn.name,
    },
    distributionData,
    interpretation: buildDashboardInterpretation({
      categoryColumn,
      firstPeriod,
      latestPeriod,
      revenueColumn,
      rowCount: revenueRows.length,
      topCategory,
      totalRevenue,
      trendData,
    }),
    metrics: {
      averageRevenue: totalRevenue / revenueRows.length,
      firstPeriod,
      latestPeriod,
      recordCount: revenueRows.length,
      topCategory,
      totalRevenue,
    },
    trendData,
  };
}

function summarizeColumns(result) {
  return result.headers
    .map((name, columnIndex) => {
      const columnName = String(name || `Column ${columnIndex + 1}`);
      const observedValues = result.rows
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
      const observedCount = observedValues.length;
      const uniqueValues = new Set(
        observedValues.map((value) => normalizeCategoryLabel(value)),
      );
      const numericRatio =
        observedCount === 0 ? 0 : numericValues.length / observedCount;
      const dateRatio =
        observedCount === 0 ? 0 : dateValues.length / observedCount;

      return {
        columnIndex,
        dateValues,
        isCategorical:
          observedCount > 0 &&
          numericRatio < 0.8 &&
          dateRatio < 0.8 &&
          uniqueValues.size > 1 &&
          uniqueValues.size <= 50,
        isDate: observedCount > 0 && dateRatio >= 0.8,
        isNumeric: observedCount > 0 && numericRatio >= 0.8,
        isSensitive: detectSensitiveField(columnName).isSensitive,
        name: columnName,
        normalizedName: normalizeText(columnName),
        numericValues,
        observedCount,
        uniqueCount: uniqueValues.size,
      };
    })
    .filter((column) => !column.isSensitive);
}

function selectRevenueColumn(numericColumns) {
  const scoredColumns = numericColumns
    .map((column) => ({
      column,
      score: scoreRevenueColumn(column.normalizedName),
    }))
    .filter((item) => item.score >= 35)
    .sort((left, right) => right.score - left.score);

  return scoredColumns[0]?.column || null;
}

function scoreRevenueColumn(name) {
  let score = 0;

  if (hasToken(name, "revenue")) score += 120;
  if (hasToken(name, "sales")) score += 100;
  if (hasToken(name, "turnover")) score += 90;
  if (hasToken(name, "income")) score += 85;
  if (hasToken(name, "amount")) score += 75;
  if (hasToken(name, "total")) score += 45;
  if (hasToken(name, "value")) score += 40;
  if (hasToken(name, "price")) score += 35;

  if (hasToken(name, "id")) score -= 100;
  if (hasToken(name, "count")) score -= 80;
  if (hasToken(name, "quantity") || hasToken(name, "qty")) score -= 70;
  if (hasToken(name, "score") || hasToken(name, "risk")) score -= 70;
  if (hasToken(name, "rate") || hasToken(name, "percent")) score -= 70;

  return score;
}

function selectDateColumn(dateColumns) {
  return dateColumns
    .map((column) => ({
      column,
      score: scoreDateColumn(column.normalizedName),
    }))
    .sort((left, right) => right.score - left.score)[0]?.column || null;
}

function scoreDateColumn(name) {
  let score = 0;

  if (hasToken(name, "date")) score += 80;
  if (hasToken(name, "month")) score += 70;
  if (hasToken(name, "period")) score += 60;
  if (hasToken(name, "timestamp")) score += 55;
  if (hasToken(name, "created")) score += 35;
  if (hasToken(name, "submitted")) score += 35;

  return score;
}

function selectCategoryColumn(categoricalColumns) {
  return categoricalColumns
    .map((column) => ({
      column,
      score: scoreCategoryColumn(column.normalizedName, column.uniqueCount),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.column || null;
}

function scoreCategoryColumn(name, uniqueCount) {
  let score = uniqueCount <= 12 ? 10 : 0;

  if (hasToken(name, "region")) score += 100;
  if (hasToken(name, "country")) score += 90;
  if (hasToken(name, "market")) score += 80;
  if (hasToken(name, "segment")) score += 75;
  if (hasToken(name, "channel")) score += 70;
  if (hasToken(name, "product")) score += 65;
  if (hasToken(name, "category")) score += 60;
  if (hasToken(name, "department")) score += 55;
  if (hasToken(name, "title")) score += 20;

  if (uniqueCount > 30) score -= 60;
  return score;
}

function buildRevenueRows({ categoryColumn, dateColumn, revenueColumn, rows }) {
  return rows
    .map((row) => {
      const revenueValue = parseNumberValue(row[revenueColumn.columnIndex]);
      if (!revenueValue?.isValid) return null;

      const dateValue = dateColumn
        ? parseDateValue(row[dateColumn.columnIndex])
        : null;
      const category = categoryColumn
        ? normalizeCategoryLabel(row[categoryColumn.columnIndex])
        : "All revenue";

      return {
        category,
        date: dateValue?.isValid ? dateValue.isoValue : null,
        revenue: revenueValue.value,
      };
    })
    .filter(Boolean);
}

function buildCategoryData(rows, categoryLabel) {
  const totals = rows.reduce((map, row) => {
    map.set(row.category, (map.get(row.category) || 0) + row.revenue);
    return map;
  }, new Map());
  const sortedItems = [...totals.entries()].sort(([, left], [, right]) => right - left);
  const visibleItems = sortedItems.slice(0, MAX_CATEGORY_ITEMS);
  const hiddenRevenue = sortedItems
    .slice(MAX_CATEGORY_ITEMS)
    .reduce((sum, [, revenue]) => sum + revenue, 0);
  const data = visibleItems.map(([name, revenue]) => ({ name, revenue }));

  if (hiddenRevenue > 0) {
    data.push({ name: "Other", revenue: hiddenRevenue });
  }

  return data.map((item) => ({
    ...item,
    label: categoryLabel,
  }));
}

function buildTrendData(rows) {
  const totals = rows.reduce((map, row) => {
    if (!row.date) return map;

    const month = row.date.slice(0, 7);
    map.set(month, (map.get(month) || 0) + row.revenue);
    return map;
  }, new Map());

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(-MAX_TREND_POINTS)
    .map(([name, revenue]) => ({ name, revenue }));
}

function buildRevenueDistribution(rows) {
  const values = rows.map((row) => row.revenue).sort((left, right) => left - right);
  if (values.length === 0) return [];

  const min = values[0];
  const max = values[values.length - 1];
  const bucketCount = Math.min(
    MAX_BUCKETS,
    Math.max(3, Math.ceil(Math.sqrt(values.length))),
  );
  const bucketWidth = max === min ? 1 : (max - min) / bucketCount;
  const buckets = Array.from({ length: bucketCount }, (_, index) => ({
    count: 0,
    max: max === min ? max : min + bucketWidth * (index + 1),
    min: max === min ? min : min + bucketWidth * index,
    name:
      max === min
        ? formatBucketValue(min)
        : `${formatBucketValue(min + bucketWidth * index)}-${formatBucketValue(
            min + bucketWidth * (index + 1),
          )}`,
    revenue: 0,
  }));

  values.forEach((value) => {
    const bucketIndex =
      max === min
        ? 0
        : Math.min(Math.floor((value - min) / bucketWidth), bucketCount - 1);
    buckets[bucketIndex].count += 1;
    buckets[bucketIndex].revenue += value;
  });

  return buckets;
}

function buildDashboardInterpretation({
  categoryColumn,
  firstPeriod,
  latestPeriod,
  revenueColumn,
  rowCount,
  topCategory,
  totalRevenue,
  trendData,
}) {
  const details = [
    `Detected ${revenueColumn.name} as the revenue measure across ${rowCount} cleaned row${rowCount === 1 ? "" : "s"}.`,
  ];

  if (topCategory && categoryColumn) {
    details.push(
      `${topCategory.name} is the leading ${categoryColumn.name} group at ${formatPercent(topCategory.revenue / totalRevenue)} of revenue.`,
    );
  }

  if (trendData.length >= 2 && firstPeriod && latestPeriod) {
    details.push(
      `Revenue ${describeRevenueDelta(latestPeriod.revenue - firstPeriod.revenue)} from ${firstPeriod.name} to ${latestPeriod.name}.`,
    );
  }

  details.push("This dashboard is generated locally from cleaned upload data.");

  return {
    details,
    summary: topCategory
      ? `${topCategory.name} currently leads uploaded revenue, with ${trendData.length >= 2 ? "trend context available" : "no chart-ready time trend available"}.`
      : `Uploaded revenue totals are available, with ${trendData.length >= 2 ? "a chart-ready trend" : "no chart-ready trend"} in the cleaned data.`,
  };
}

function describeRevenueDelta(delta) {
  if (delta > 0) return `increased by ${formatBucketValue(delta)}`;
  if (delta < 0) return `decreased by ${formatBucketValue(Math.abs(delta))}`;
  return "held flat";
}

function hasToken(normalizedName, token) {
  return normalizedName.split(" ").includes(token);
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}

function normalizeCategoryLabel(value) {
  const label = String(value ?? "").trim();
  if (!label || isMissingValue(label)) return "Unspecified";
  if (label.length <= 32) return label;
  return `${label.slice(0, 31)}...`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value);
}

function formatBucketValue(value) {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
  }).format(value);
}
