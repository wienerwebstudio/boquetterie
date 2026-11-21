import { Fragment, type ReactNode } from "react";

/**
 * Fills `{name}` placeholders of a dictionary text with React nodes (links, bold
 * parts): `rich("Es gelten unsere {terms}.", { terms: <Link …>AGB</Link> })`.
 * Unknown placeholders stay as they are. Works in Server and Client Components.
 */
export function rich(template: string, parts: Record<string, ReactNode>): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of template.matchAll(/\{(\w+)\}/g)) {
    const key = match[1];
    if (!(key in parts)) continue;
    const at = match.index ?? 0;
    if (at > last) out.push(template.slice(last, at));
    out.push(<Fragment key={`${key}-${at}`}>{parts[key]}</Fragment>);
    last = at + match[0].length;
  }
  if (last < template.length) out.push(template.slice(last));
  return out.length === 1 && typeof out[0] === "string" ? out[0] : out;
}
