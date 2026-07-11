import type { Scan } from "../types";
import { prettyHost } from "./format";

/** Trigger a client-side download of `data` as a pretty-printed JSON file. */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Export a scan's dossier as a tidy JSON file named after the site. */
export function downloadDossier(scan: Scan): void {
  const payload = {
    generator: "SiteSense",
    url: scan.url,
    title: scan.title,
    scanned_at: scan.created_at,
    dossier: scan.dossier,
  };
  const slug = prettyHost(scan.url).replace(/[^a-z0-9.]+/gi, "-").replace(/^-+|-+$/g, "");
  downloadJson(`${slug || "site"}-dossier.json`, payload);
}
