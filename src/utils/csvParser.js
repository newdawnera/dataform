export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_CSV_FILE_SIZE_BYTES = MAX_UPLOAD_FILE_SIZE_BYTES;
export const PREVIEW_ROW_LIMIT = 50;
export const ACCEPTED_DATASET_FILE_TYPES =
  ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const CANDIDATE_DELIMITERS = [",", ";", "\t", "|"];
const CSV_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
]);
const XLSX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function formatFileSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDatasetFileType(file) {
  const fileName = file?.name?.toLowerCase() || "";
  const mimeType = (file?.type || "").toLowerCase();

  if (fileName.endsWith(".xls")) {
    return "xls";
  }

  if (fileName.endsWith(".csv")) {
    return "csv";
  }

  if (fileName.endsWith(".xlsx")) {
    return "xlsx";
  }

  if (CSV_MIME_TYPES.has(mimeType)) {
    return "csv";
  }

  if (XLSX_MIME_TYPES.has(mimeType)) {
    return "xlsx";
  }

  return "unsupported";
}

export function validateDatasetFile(file) {
  if (!file) {
    return {
      isValid: false,
      error: "Choose a CSV or Excel file before importing.",
    };
  }

  const fileType = getDatasetFileType(file);

  if (fileType === "xls") {
    return {
      isValid: false,
      error:
        "Legacy .xls workbooks are not supported yet. Save the file as .xlsx or CSV and try again.",
    };
  }

  if (fileType === "unsupported") {
    return {
      isValid: false,
      error: "Upload a CSV file or a modern Excel workbook (.xlsx).",
    };
  }

  if (file.size === 0) {
    return {
      isValid: false,
      error: "This file is empty.",
    };
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `This file is ${formatFileSize(
        file.size,
      )}. The upload limit is ${formatFileSize(MAX_UPLOAD_FILE_SIZE_BYTES)}.`,
    };
  }

  return { isValid: true, error: null, fileType };
}

export function validateCsvFile(file) {
  return validateDatasetFile(file);
}

export function detectDelimiter(csvText) {
  const sampleLines = getSampleLines(csvText);
  if (sampleLines.length === 0) return ",";

  const scoredDelimiters = CANDIDATE_DELIMITERS.map((delimiter) => {
    const counts = sampleLines
      .map((line) => countDelimiterOutsideQuotes(line, delimiter))
      .filter((count) => count > 0);

    if (counts.length === 0) {
      return { delimiter, score: 0 };
    }

    const average =
      counts.reduce((total, count) => total + count, 0) / counts.length;
    const variance =
      counts.reduce((total, count) => total + Math.abs(count - average), 0) /
      counts.length;

    return {
      delimiter,
      score: counts.length * 10 + average - variance,
    };
  }).sort((left, right) => right.score - left.score);

  return scoredDelimiters[0]?.score > 0 ? scoredDelimiters[0].delimiter : ",";
}

export function parseCsv(csvText, options = {}) {
  const errors = [];
  const warnings = [];

  if (typeof csvText !== "string") {
    return createParseResult({ errors: ["CSV content must be text."] });
  }

  if (!csvText.trim()) {
    return createParseResult({ errors: ["This CSV file does not contain data."] });
  }

  const delimiter = options.delimiter || detectDelimiter(csvText);
  const parsedRows = parseDelimitedRows(csvText, delimiter, errors).filter(
    (row) => !isBlankRow(row.cells),
  );

  if (parsedRows.length === 0) {
    return createParseResult({
      delimiter,
      errors: ["This CSV file does not contain data."],
    });
  }

  const [headerRow, ...dataRows] = parsedRows;
  const headers = headerRow.cells;
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
    .filter((row) => row.cells.length !== expectedColumnCount)
    .map((row) => ({
      lineNumber: row.lineNumber,
      expectedColumns: expectedColumnCount,
      actualColumns: row.cells.length,
    }));

  if (rowLengthWarnings.length > 0) {
    warnings.push(
      `${rowLengthWarnings.length} row${
        rowLengthWarnings.length === 1 ? " has" : "s have"
      } an inconsistent column count.`,
    );
  }

  return createParseResult({
    columnCount: expectedColumnCount,
    delimiter,
    errors,
    headers,
    rowCount: dataRows.length,
    rowLengthWarnings,
    rows: dataRows.map((row) => row.cells),
    warnings,
  });
}

function createParseResult({
  columnCount = 0,
  delimiter = ",",
  errors = [],
  headers = [],
  rowCount = 0,
  rowLengthWarnings = [],
  rows = [],
  warnings = [],
} = {}) {
  return {
    columnCount,
    delimiter,
    errors,
    headers,
    rowCount,
    rowLengthWarnings,
    rows,
    warnings,
  };
}

function parseDelimitedRows(csvText, delimiter, errors) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;
  let lineNumber = 1;
  let rowStartLine = 1;

  const pushField = () => {
    currentRow.push(currentField);
    currentField = "";
  };

  const pushRow = () => {
    pushField();
    rows.push({ cells: currentRow, lineNumber: rowStartLine });
    currentRow = [];
  };

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else if (char === "\r") {
        currentField += nextChar === "\n" ? "\n" : char;
        if (nextChar === "\n") index += 1;
        lineNumber += 1;
      } else if (char === "\n") {
        currentField += char;
        lineNumber += 1;
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      if (currentField.length === 0 || !currentField.trim()) {
        inQuotes = true;
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === delimiter) {
      pushField();
      continue;
    }

    if (char === "\r" || char === "\n") {
      if (char === "\r" && nextChar === "\n") index += 1;
      pushRow();
      lineNumber += 1;
      rowStartLine = lineNumber;
      continue;
    }

    currentField += char;
  }

  if (inQuotes) {
    errors.push("CSV parsing stopped because a quoted field was not closed.");
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    pushRow();
  }

  return rows;
}

function getSampleLines(csvText, maxLines = 20) {
  const lines = [];
  let currentLine = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentLine += char + nextChar;
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
      continue;
    }

    if (!inQuotes && (char === "\r" || char === "\n")) {
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = "";
      if (char === "\r" && nextChar === "\n") index += 1;
      if (lines.length >= maxLines) break;
      continue;
    }

    currentLine += char;
  }

  if (currentLine.trim() && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

function countDelimiterOutsideQuotes(line, delimiter) {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      count += 1;
    }
  }

  return count;
}

function isBlankRow(cells) {
  return cells.every((cell) => !cell.trim());
}
