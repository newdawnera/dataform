const CATEGORY_LABEL_MAX_LENGTH = 32;

// Normalizes a raw cell value into the label shown on the categorical charts.
// Both the chart builder and the cross-filter matcher use this so that a
// clicked bar/slice label always maps back to the same rows.
export function categoryLabel(value) {
  const text = String(value ?? "").trim();
  if (text.length <= CATEGORY_LABEL_MAX_LENGTH) return text;
  return `${text.slice(0, CATEGORY_LABEL_MAX_LENGTH - 1)}...`;
}

// Returns true when a cross-filter is set and points at a real column.
export function isActiveCrossFilter(filter) {
  return Boolean(
    filter &&
      Number.isInteger(filter.columnIndex) &&
      filter.columnIndex >= 0 &&
      filter.value != null,
  );
}

// Returns a result whose rows are limited to those matching the cross-filter.
// The headers and other metadata are preserved. When there is no active
// filter, the original result is returned unchanged.
export function applyCrossFilter(result, filter) {
  if (!result || !Array.isArray(result.rows)) return result;
  if (!isActiveCrossFilter(filter)) return result;

  const rows = result.rows.filter(
    (row) => categoryLabel(row[filter.columnIndex]) === filter.value,
  );

  return { ...result, rows };
}

// Toggles the filter for a clicked category: selecting the already-active
// value clears it, otherwise it sets a new filter on that column/value.
export function toggleCrossFilter(filter, { columnIndex, columnName, value }) {
  if (
    isActiveCrossFilter(filter) &&
    filter.columnIndex === columnIndex &&
    filter.value === value
  ) {
    return null;
  }

  return { columnIndex, columnName, value };
}
