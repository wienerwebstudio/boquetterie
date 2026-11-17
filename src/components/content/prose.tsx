import Link from "next/link";
import { cn } from "@/lib/format";

/**
 * Typographic wrapper for editorial body copy.
 * Narrow measure, 15–16px, relaxed leading, muted body colour; headings in ink.
 */
export function Prose({ children, className, as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "article" | "section" }) {
  return (
    <Tag
      className={cn(
        "max-w-2xl text-[15px] leading-relaxed text-ink-muted sm:text-base",
        "[&_p+p]:mt-4 [&_ul+p]:mt-4 [&_p]:text-pretty",
        "[&_h2]:mt-10 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:leading-snug [&_h2]:text-ink [&_h2+p]:mt-3 sm:[&_h2]:text-3xl",
        "[&_h3]:mt-8 [&_h3]:font-sans [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_h3+p]:mt-2",
        "[&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
        "[&_a]:text-forest [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-forest-700",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

const BULLET = /^[•-] /;

/**
 * One paragraph of admin text: line breaks are kept (addresses), and lines that
 * start with "• " (or "- ") become a bullet list after the paragraph's lead-in.
 */
export function ParagraphBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  const firstBullet = lines.findIndex((l) => BULLET.test(l));
  const lead = (firstBullet === -1 ? lines : lines.slice(0, firstBullet)).filter((l) => l.trim());
  const bullets = firstBullet === -1 ? [] : lines.slice(firstBullet).filter((l) => l.trim()).map((l) => l.replace(BULLET, ""));
  return (
    <>
      {lead.length > 0 && (
        <p>
          {lead.map((l, i) => (
            <span key={i}>{i > 0 && <br />}<InlineText text={l} /></span>
          ))}
        </p>
      )}
      {bullets.length > 0 && (
        <ul>
          {bullets.map((l, i) => <li key={i}><InlineText text={l} /></li>)}
        </ul>
      )}
    </>
  );
}

/** Renders a list of plain-text paragraphs inside a Prose block. Links are recognised, see `InlineText`. */
export function Paragraphs({ items, className }: { items: string[]; className?: string }) {
  return (
    <Prose className={className}>
      {items.map((text, i) => <ParagraphBlock key={i} text={text} />)}
    </Prose>
  );
}

/**
 * Plain admin text with clickable links – no HTML is ever interpreted:
 * `[Label](https://…)`, `[Label](/pfad)` for pages of the shop, bare `https://…` / `www.…`
 * URLs, e-mail addresses and phone numbers after "Telefon:" become links. External links
 * open in a new tab, shop pages in the same tab.
 */
const TOKEN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/(?!\/)[^\s)]*)\)|(https?:\/\/[^\s)]+|www\.[^\s)]+)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|(\+\d[\d ]{6,}\d)/g;

export function InlineText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const index = m.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const [whole, label, labelUrl, url, email, phone] = m;
    if (label && labelUrl?.startsWith("/")) parts.push(<Link key={index} href={labelUrl}>{label}</Link>);
    else if (label && labelUrl) parts.push(<ExternalLink key={index} href={labelUrl}>{label}</ExternalLink>);
    else if (url) {
      // Keep a trailing full stop or comma outside the link.
      const clean = url.replace(/[.,;:]+$/, "");
      parts.push(<ExternalLink key={index} href={clean.startsWith("http") ? clean : `https://${clean}`}>{clean}</ExternalLink>);
      if (clean.length < url.length) parts.push(url.slice(clean.length));
    } else if (email) parts.push(<a key={index} href={`mailto:${email}`}>{email}</a>);
    else if (phone) parts.push(<a key={index} href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>);
    else parts.push(whole);
    last = index + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener">{children}</a>;
}
