import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getSettings, getSubscription } from "@/lib/cms";

export const dynamic = "force-dynamic";

/** Runtime data dir – consistent with src/lib/cms.ts (data/*.json, git-ignored). */
const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "subscription-requests.json");

interface SubscriptionRequest {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  plan: string;
  frequency: string;
  message: string;
}

async function readRequests(): Promise<SubscriptionRequest[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SubscriptionRequest[]) : [];
  } catch {
    return [];
  }
}

async function appendRequest(entry: SubscriptionRequest) {
  const list = await readRequests();
  list.unshift(entry);
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(list, null, 2) + "\n", "utf8");
  await fs.rename(tmp, FILE);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** POST /api/subscription-request { name, email, plan, frequency, message? } */
export async function POST(req: Request) {
  const [settings, config] = await Promise.all([getSettings(), getSubscription()]);
  if (!settings.subscriptionEnabled || !config.enabled) {
    return NextResponse.json({ ok: false, message: "Das Blumen-Abo ist derzeit nicht verfügbar." }, { status: 404 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (typeof parsed !== "object" || parsed === null) throw new Error("invalid");
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Ungültige Anfrage." }, { status: 400 });
  }

  const name = str(body.name, 120);
  const email = str(body.email, 254);
  const plan = str(body.plan, 40);
  const frequency = str(body.frequency, 40);
  const message = str(body.message, 1000);

  if (name.length < 2) return NextResponse.json({ ok: false, message: "Bitte gib deinen Namen ein." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, message: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  if (!config.plans.some((p) => p.id === plan)) return NextResponse.json({ ok: false, message: "Bitte wähle ein Abo." }, { status: 400 });
  if (!config.frequencies.some((f) => f.id === frequency)) return NextResponse.json({ ok: false, message: "Bitte wähle einen Rhythmus." }, { status: 400 });

  const entry: SubscriptionRequest = {
    id: `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    name, email, plan, frequency, message,
  };
  await appendRequest(entry);
  return NextResponse.json({ ok: true, id: entry.id });
}
