const BOOLEAN_VALUES = new Set(["true", "false", "yes", "no", "y", "n"]);

export function profileDataset({
  delimiter,
  file,
  fileType,
  headers,
  rowLengthWarnings = [],
  rows,
}) {
  const duplicateColumnNames = findDuplicateColumnNames(headers);
  const warnings = [];

  if (duplicateColumnNames.length > 0) {
    warnings.push(
      `${duplicateColumnNames.length} duplicate column ${
        duplicateColumnNames.length === 1 ? "name was" : "names were"
      } detected.`,
    );
  }

  if (rowLengthWarnings.length > 0) {
    warnings.push("Some rows may be incomplete or have extra cells.");
  }

  const columns = headers.map((name, index) => {
    const missingCount = countMissingCells(rows, index);
    const filledCount = rows.length - missingCount;

    return {
      filledCount,
      index,
      missingCount,
      name,
      type: inferColumnType(rows, index),
    };
  });

  return {
    columnCount: headers.length,
    columnNames: headers,
    columns,
    delimiter,
    duplicateColumnNames,
    fileName: file?.name || "Untitled dataset",
    fileSize: file?.size || 0,
    fileType,
    missingCellCounts: columns.map((column) => ({
      columnIndex: column.index,
      columnName: column.name,
      missingCount: column.missingCount,
    })),
    rowCount: rows.length,
    warnings,
  };
}

export function getColumnLabel(columnName, index) {
  const label = String(columnName ?? "").trim();
  return label ? label : `Column ${index + 1}`;
}

function countMissingCells(rows, columnIndex) {
  return rows.reduce((count, row) => {
    const value = row[columnIndex];
    return isEmpty(value) ? count + 1 : count;
  }, 0);
}

function inferColumnType(rows, columnIndex) {
  const observedTypes = new Set();

  rows.forEach((row) => {
    const value = row[columnIndex];
    if (isEmpty(value)) return;
    observedTypes.add(classifyValue(value));
  });

  if (observedTypes.size === 0) return "empty";
  if (observedTypes.size === 1) return [...observedTypes][0];
  return "mixed";
}

function classifyValue(value) {
  if (value instanceof Date) return "date";

  const trimmedValue = String(value).trim();
  const normalizedValue = trimmedValue.toLowerCase();

  if (BOOLEAN_VALUES.has(normalizedValue)) return "boolean";
  if (isNumericValue(trimmedValue)) return "number";
  if (isDateValue(trimmedValue)) return "date";
  return "text";
}

function isNumericValue(value) {
  const withoutPercent = value.endsWith("%") ? value.slice(0, -1).trim() : value;
  const withoutCurrency = withoutPercent.replace(/^\$\s*/, "");

  if (withoutCurrency.includes(",")) {
    const hasValidSeparators = /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(
      withoutCurrency,
    );
    if (!hasValidSeparators) return false;
  }

  const normalizedValue = withoutCurrency.replace(/,/g, "");
  return /^[-+]?(\d+(\.\d+)?|\.\d+)(e[-+]?\d+)?$/i.test(normalizedValue);
}

function isDateValue(value) {
  const looksLikeDate =
    /^\d{4}-\d{1,2}-\d{1,2}(?:[T\s]\d{1,2}:\d{2}(?::\d{2})?)?$/.test(
      value,
    ) || /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value);

  if (!looksLikeDate) return false;
  return !Number.isNaN(Date.parse(value));
}

function findDuplicateColumnNames(headers) {
  const seenNames = new Set();
  const duplicateNames = new Set();

  headers.forEach((header) => {
    const normalizedHeader = header.trim().toLowerCase();
    if (!normalizedHeader) return;

    if (seenNames.has(normalizedHeader)) {
      duplicateNames.add(header.trim());
      return;
    }

    seenNames.add(normalizedHeader);
  });

  return [...duplicateNames];
}

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === "";
}
