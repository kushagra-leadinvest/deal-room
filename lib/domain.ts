/** Mirror of the SQL normalize_domain(): "https://www.Acme.com/about" → "acme.com" */
export function normalizeDomain(url: string): string | null {
  const d = url
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\.|[/?#].*$/g, "");
  return d || null;
}
