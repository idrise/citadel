/** Local user-initiated download; the object URL is always released. */
export function downloadJSON(report: unknown, filename: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(report, null, 2) + "\n"], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
