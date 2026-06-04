import { describe, expect, it } from "vitest";

import { buildCsv, createCleanedCsvFilename } from "./csvExporter.js";

describe("buildCsv", () => {
  it("joins rows with CRLF and a header line", () => {
    const csv = buildCsv({ headers: ["a", "b"], rows: [["1", "2"], ["3", "4"]] });
    expect(csv).toBe("a,b\r\n1,2\r\n3,4");
  });

  it("quotes fields containing commas, quotes, or newlines", () => {
    const csv = buildCsv({
      headers: ["text"],
      rows: [["a,b"], ['she said "hi"'], ["line1\nline2"]],
    });
    expect(csv).toBe('text\r\n"a,b"\r\n"she said ""hi"""\r\n"line1\nline2"');
  });

  it("quotes values with leading or trailing whitespace", () => {
    const csv = buildCsv({ headers: ["x"], rows: [[" pad "]] });
    expect(csv).toBe('x\r\n" pad "');
  });

  it("renders empty strings for null and undefined cells", () => {
    const csv = buildCsv({ headers: ["a", "b"], rows: [[null, undefined]] });
    expect(csv).toBe("a,b\r\n,");
  });

  it("formats Date cells as ISO calendar dates", () => {
    const csv = buildCsv({
      headers: ["d"],
      rows: [[new Date(Date.UTC(2024, 0, 5))]],
    });
    expect(csv).toBe("d\r\n2024-01-05");
  });
});

describe("createCleanedCsvFilename", () => {
  it("appends -cleaned and strips the original extension", () => {
    expect(createCleanedCsvFilename("data.csv")).toBe("data-cleaned.csv");
    expect(createCleanedCsvFilename("report.xlsx")).toBe("report-cleaned.csv");
  });

  it("falls back to a default base name", () => {
    expect(createCleanedCsvFilename("")).toBe("dataset-cleaned.csv");
  });
});
