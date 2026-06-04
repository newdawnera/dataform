export function buildCsv({ headers = [], rows = [] }) {
  const headerLine = headers.map(escapeCsvField).join(",");
  const rowLines = rows.map((row) =>
    headers
      .map((_, columnIndex) => escapeCsvField(row[columnIndex]))
      .join(","),
  );

  return [headerLine, ...rowLines].join("\r\n");
}

export function createCleanedCsvFilename(fileName = "dataset.csv") {
  const trimmedFileName = String(fileName || "dataset.csv").trim();
  const withoutExtension = trimmedFileName.replace(/\.[^.]+$/, "");
  return `${withoutExtension || "dataset"}-cleaned.csv`;
}

function escapeCsvField(value) {
  if (value === undefined || value === null) return "";

  const textValue =
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  const escapedValue = textValue.replace(/"/g, '""');
  const requiresQuotes = /[",\r\n]/.test(escapedValue) || /^\s|\s$/.test(escapedValue);

  return requiresQuotes ? `"${escapedValue}"` : escapedValue;
}
