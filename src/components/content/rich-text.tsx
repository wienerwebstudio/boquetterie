import { Fragment, type ReactNode } from "react";

/**
 * Like `fmt()`, but placeholders can be filled with elements (links, <strong>):
 * `fmtRich("… an {email}.", { email: <strong>{email}</strong> })`. Pure and client-safe.
 */
export function fmtRich(template: string, values: Record<string, ReactNode>): ReactNode {
  const parts = template.split(/\{(\w+)\}/);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 0 ? part : <Fragment key={i}>{part in values ? values[part] : `{${part}}`}</Fragment>))}
    </>
  );
}
