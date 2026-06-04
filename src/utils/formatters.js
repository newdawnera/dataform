const toFiniteNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(toFiniteNumber(value));

export const formatCompact = (value) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    style: "currency",
    currency: "USD",
  }).format(toFiniteNumber(value));

export const formatShare = (part, total, digits = 1) => {
  const safeTotal = toFiniteNumber(total);
  if (safeTotal === 0) return (0).toFixed(digits);
  return ((toFiniteNumber(part) / safeTotal) * 100).toFixed(digits);
};
