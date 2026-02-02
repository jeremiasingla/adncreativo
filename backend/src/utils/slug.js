export function generateWorkspaceSlug(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname.replace(/^www\./, "");
  const base = hostname.split(".")[0] || "workspace";
  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const timestamp = Math.floor(Date.now() / 1000);
  return `${safeBase}-s-workspace-${timestamp}`;
}
