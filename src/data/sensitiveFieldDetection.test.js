import { describe, expect, it } from "vitest";

import {
  detectSensitiveField,
  summarizeSensitiveFields,
} from "./sensitiveFieldDetection.js";

describe("detectSensitiveField", () => {
  it("flags names, emails, and phone numbers", () => {
    expect(detectSensitiveField("Customer Name").category).toBe("name");
    expect(detectSensitiveField("email").category).toBe("email");
    expect(detectSensitiveField("Mobile").category).toBe("phone");
  });

  it("flags government and financial identifiers", () => {
    expect(detectSensitiveField("SSN").category).toBe("government_id");
    expect(detectSensitiveField("passport").category).toBe("government_id");
    expect(detectSensitiveField("Card Number").category).toBe("financial_account");
    expect(detectSensitiveField("IBAN").category).toBe("financial_account");
    expect(detectSensitiveField("customer_id").category).toBe("user_identifier");
  });

  it("normalizes separators and casing before matching", () => {
    expect(detectSensitiveField("first-name").isSensitive).toBe(true);
    expect(detectSensitiveField("ACCOUNT.NUMBER").isSensitive).toBe(true);
  });

  it("does not flag ordinary analytical columns", () => {
    expect(detectSensitiveField("revenue").isSensitive).toBe(false);
    expect(detectSensitiveField("region").isSensitive).toBe(false);
    expect(detectSensitiveField("").isSensitive).toBe(false);
  });
});

describe("summarizeSensitiveFields", () => {
  it("returns only sensitive columns with their indices", () => {
    const summary = summarizeSensitiveFields(["name", "revenue", "email"]);
    expect(summary).toHaveLength(2);
    expect(summary.map((f) => f.columnIndex)).toEqual([0, 2]);
    expect(summary.every((f) => f.isSensitive)).toBe(true);
  });
});
