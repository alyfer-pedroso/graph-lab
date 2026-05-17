export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function projectFileName(name: string): string {
  const safe = name.trim().replace(/\s+/g, "_") || "projeto";
  return `${safe}_${new Date().toISOString().slice(0, 10)}.graphlab.json`;
}
