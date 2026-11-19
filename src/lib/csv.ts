/** RFC 4180 CSV with protection against spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  const looksNumeric = /^[+-]?\d[\d\s().-]*$/.test(text);
  if (!looksNumeric && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: unknown[][]): string {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
