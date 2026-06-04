import { readSheet } from "read-excel-file/browser";

export async function parseExcelFile(file) {
  try {
    const worksheetRows = await readSheet(file);
    return normalizeWorksheetRows(worksheetRows);
  } catch {
    return createExcelParseResult({
      errors: [
        "This Excel workbook could not be read. Check that it is a valid .xlsx file.",
      ],
    });
  }
}

function normalizeWorksheetRows(worksheetRows) {
  const warnings = [
    "Only the first worksheet is imported in this phase.",
  ];
  const rows = worksheetRows
    .map((row) => row.map(formatCellValue))
    .map(trimTrailingEmptyCells)
    .filter((row) => !isBlankRow(row));

  if (rows.length === 0) {
    return createExcelParseResult({
      errors: ["This Excel workbook does not contain data."],
      warnings,
    });
  }

  const [headers, ...dataRows] = rows;
  const expectedColumnCount = headers.length;

  if (headers.length === 0 || headers.every((header) => !header.trim())) {
    warnings.push("No usable headers were detected in the first row.");
  } else {
    const blankHeaderCount = headers.filter((header) => !header.trim()).length;
    if (blankHeaderCount > 0) {
      warnings.push(
        `${blankHeaderCount} column ${
          blankHeaderCount === 1 ? "header is" : "headers are"
        } blank.`,
      );
    }
  }

  const rowLengthWarnings = dataRows
    .map((row, index) => ({
      actualColumns: row.length,
      expectedColumns: expectedColumnCount,
      lineNumber: index + 2,
    }))
    .filter((row) => row.actualColumns !== row.expectedColumns);

  if (rowLengthWarnings.length > 0) {
    warnings.push(
      `${rowLengthWarnings.length} row${
        rowLengthWarnings.length === 1 ? " has" : "s have"
      } an inconsistent column count.`,
    );
  }

  return createExcelParseResult({
    columnCount: expectedColumnCount,
    headers,
    rowCount: dataRows.length,
    rowLengthWarnings,
    rows: dataRows,
    warnings,
  });
}

function createExcelParseResult({
  columnCount = 0,
  errors = [],
  headers = [],
  rowCount = 0,
  rowLengthWarnings = [],
  rows = [],
  warnings = [],
} = {}) {
  return {
    columnCount,
    delimiter: null,
    errors,
    fileType: "xlsx",
    headers,
    rowCount,
    rowLengthWarnings,
    rows,
    warnings,
  };
}

function formatCellValue(value) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value);
}

function trimTrailingEmptyCells(row) {
  let lastValueIndex = row.length - 1;

  while (lastValueIndex >= 0 && row[lastValueIndex].trim() === "") {
    lastValueIndex -= 1;
  }

  return row.slice(0, lastValueIndex + 1);
}

function isBlankRow(row) {
  return row.every((cell) => !cell.trim());
}
