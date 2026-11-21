import { NextResponse } from "next/server";

/**
 * Redirect to a path on this site with a relative `Location` header.
 *
 * On Netlify, `req.url` of a route handler carries the internal deploy host
 * (`<deploy-id>--<site>.netlify.app`), not the domain the visitor used. An
 * absolute redirect built from it leaves blumora.at: cookies set on the way are
 * not sent there, and after a form post the browser blocks the navigation
 * altogether (CSP `form-action 'self'`), so the visitor sees nothing happen.
 * A relative location always resolves against the address in the browser.
 */
export function redirectLocal(path: string, status: 302 | 303 | 307 = 303) {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) {
    throw new Error(`redirectLocal expects a site path, got ${JSON.stringify(path)}`);
  }
  return new NextResponse(null, { status, headers: { location: path, "cache-control": "no-store" } });
}
