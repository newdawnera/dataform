const SENSITIVE_FIELD_RULES = [
  {
    category: "name",
    label: "Personal name",
    patterns: [
      /\bname\b/,
      /\bfull name\b/,
      /\bfirst name\b/,
      /\blast name\b/,
      /\bcustomer name\b/,
      /\bclient name\b/,
      /\bcontact name\b/,
    ],
  },
  {
    category: "email",
    label: "Email address",
    patterns: [/\bemail\b/, /\be mail\b/, /\bmail address\b/],
  },
  {
    category: "phone",
    label: "Phone number",
    patterns: [/\bphone\b/, /\bmobile\b/, /\btelephone\b/, /\bcontact number\b/],
  },
  {
    category: "address",
    label: "Address",
    patterns: [
      /\baddress\b/,
      /\bstreet\b/,
      /\bpostcode\b/,
      /\bpostal code\b/,
      /\bzip\b/,
    ],
  },
  {
    category: "government_id",
    label: "Government identifier",
    patterns: [
      /\bssn\b/,
      /\bsocial security\b/,
      /\bnational insurance\b/,
      /\bni number\b/,
      /\bnino\b/,
      /\bpassport\b/,
    ],
  },
  {
    category: "financial_account",
    label: "Financial account identifier",
    patterns: [
      /\baccount number\b/,
      /\bacct number\b/,
      /\bbank account\b/,
      /\bcard number\b/,
      /\bcredit card\b/,
      /\bdebit card\b/,
      /\bsort code\b/,
      /\biban\b/,
      /\brouting number\b/,
      /\baba number\b/,
    ],
  },
  {
    category: "user_identifier",
    label: "User or customer identifier",
    patterns: [
      /\bcustomer id\b/,
      /\bclient id\b/,
      /\buser id\b/,
      /\bmember id\b/,
      /\bperson id\b/,
      /\baccount id\b/,
    ],
  },
];

export function detectSensitiveField(columnName) {
  const normalizedName = normalizeColumnName(columnName);

  if (!normalizedName) {
    return {
      category: null,
      isSensitive: false,
      reason: null,
    };
  }

  const matchedRule = SENSITIVE_FIELD_RULES.find((rule) =>
    rule.patterns.some((pattern) => pattern.test(normalizedName)),
  );

  if (!matchedRule) {
    return {
      category: null,
      isSensitive: false,
      reason: null,
    };
  }

  return {
    category: matchedRule.category,
    isSensitive: true,
    reason: `${matchedRule.label} column name match`,
  };
}

export function summarizeSensitiveFields(headers = []) {
  return headers
    .map((header, columnIndex) => ({
      columnIndex,
      columnName: String(header ?? ""),
      ...detectSensitiveField(header),
    }))
    .filter((field) => field.isSensitive);
}

function normalizeColumnName(columnName) {
  return String(columnName ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, "")
    .replace(/\s+/g, " ");
}
