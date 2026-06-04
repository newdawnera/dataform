import { describe, expect, it } from "vitest";

import { getColumnLabel, profileDataset } from "./datasetProfiler.js";

describe("profileDataset", () => {
  const base = {
    delimiter: ",",
    file: { name: "people.csv", size: 1024 },
    fileType: "csv",
    headers: ["name", "age", "active", "joined"],
    rows: [
      ["Alice", "30", "yes", "2024-01-01"],
      ["Bob", "40", "no", "2024-02-15"],
      ["Cara", "", "yes", "2024-03-20"],
    ],
  };

  it("reports file metadata and dimensions", () => {
    const profile = profileDataset(base);
    expect(profile.fileName).toBe("people.csv");
    expect(profile.fileSize).toBe(1024);
    expect(profile.rowCount).toBe(3);
    expect(profile.columnCount).toBe(4);
  });

  it("infers per-column types and counts missing cells", () => {
    const profile = profileDataset(base);
    const byName = Object.fromEntries(profile.columns.map((c) => [c.name, c]));
    expect(byName.name.type).toBe("text");
    expect(byName.age.type).toBe("number");
    expect(byName.active.type).toBe("boolean");
    expect(byName.joined.type).toBe("date");
    expect(byName.age.missingCount).toBe(1);
  });

  it("classifies columns with conflicting values as mixed", () => {
    const profile = profileDataset({
      ...base,
      headers: ["val"],
      rows: [["10"], ["hello"], ["20"]],
    });
    expect(profile.columns[0].type).toBe("mixed");
  });

  it("detects duplicate column names and surfaces a warning", () => {
    const profile = profileDataset({
      ...base,
      headers: ["id", "id"],
      rows: [["1", "2"]],
    });
    expect(profile.duplicateColumnNames).toContain("id");
    expect(profile.warnings.some((w) => w.includes("duplicate"))).toBe(true);
  });

  it("falls back to a default name for untitled files", () => {
    const profile = profileDataset({ ...base, file: null });
    expect(profile.fileName).toBe("Untitled dataset");
  });
});

describe("getColumnLabel", () => {
  it("uses the header when present and a positional label otherwise", () => {
    expect(getColumnLabel("Revenue", 0)).toBe("Revenue");
    expect(getColumnLabel("   ", 2)).toBe("Column 3");
  });
});
