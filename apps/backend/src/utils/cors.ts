export function parseCorsOrigins(raw: string | undefined): string[] {
  if (raw == null) return [];

  let s = raw.trim();

  if (s.length === 0) return [];

  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    s = s.slice(1, -1).trim();
  }

  return s
    .split(',')
    .map((segment) => {
      let o = segment.trim();

      if ((o.startsWith("'") && o.endsWith("'")) || (o.startsWith('"') && o.endsWith('"'))) {
        o = o.slice(1, -1).trim();
      }

      return o;
    })
    .filter(Boolean);
}
