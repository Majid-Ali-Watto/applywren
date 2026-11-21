import { apiFetch } from "./api";

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function base64ToBlob(base64, type = "application/pdf") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** Decoded size of a base64 string, in bytes. */
export function base64Size(base64) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`;
}

export function uploadFiles(files) {
  return Promise.all(
    files.map(async (file) =>
      apiFetch("/api/documents", {
        method: "POST",
        body: { type: "file", name: file.name, content: await readFileAsBase64(file) },
      })
    )
  );
}

export function downloadText(filename, text, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  link.click();
  URL.revokeObjectURL(url);
}

/** Plain-text excerpt of stored letter HTML. */
export function htmlToText(html) {
  if (typeof window === "undefined") return "";
  return (new DOMParser().parseFromString(html || "", "text/html").body.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
}
