/** Minimal robots.txt check for the "*" user-agent group. Returns disallowed path prefixes. */
export async function disallowedPrefixes(origin: string): Promise<string[]> {
  try {
    const res = await fetch(origin + '/robots.txt');
    if (!res.ok) return [];
    const lines = (await res.text()).split(/\r?\n/).map((l) => l.trim());
    const out: string[] = [];
    let applies = false;
    for (const l of lines) {
      const [k, ...rest] = l.split(':');
      const v = rest.join(':').trim();
      if (/^user-agent$/i.test(k)) applies = v === '*';
      else if (applies && /^disallow$/i.test(k) && v) out.push(v);
    }
    return out;
  } catch { return []; }
}
export const isAllowed = (path: string, disallowed: string[]) => !disallowed.some((d) => path.startsWith(d));
