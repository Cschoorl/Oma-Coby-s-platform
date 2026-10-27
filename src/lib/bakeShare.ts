import type { BakeShare, DashboardState } from "../types/dashboard";
import { formatChangeTime } from "./orderChanges";

/*
 * Beheer › Bakkerij: the bake counts of one delivery day, passed on by WhatsApp, e-mail or the
 * phone's share menu. Every share is saved (tab "Bakkerij doorgegeven"), so the platform can warn
 * when the counts changed afterwards.
 */

export type ShareChannel = BakeShare["channel"];

export const channelLabel: Record<ShareChannel, string> = { whatsapp: "WhatsApp", email: "e-mail", deelmenu: "deelmenu van de telefoon" };

export interface BakeCounts {
  withRaisins: number;
  withoutRaisins: number;
}

/** "2026-10-27" + 1 → "2026-10-28" (calendar days, no time zone trouble). */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

/** What has to be baked for a delivery day: all orders, pop-up stock included. */
export function bakeCounts(state: Pick<DashboardState, "orders">, date: string): BakeCounts {
  const out = { withRaisins: 0, withoutRaisins: 0 };
  for (const o of state.orders) {
    if (o.deliveryDate !== date) continue;
    out.withRaisins += o.withRaisins;
    out.withoutRaisins += o.withoutRaisins;
  }
  return out;
}

/** The shares of one day, newest first. */
export function sharesFor(state: Pick<DashboardState, "bakeShares">, date: string): BakeShare[] {
  return (state.bakeShares ?? []).filter((s) => s.date === date);
}

export interface BakeDiff {
  withRaisins: number;
  withoutRaisins: number;
  total: number;
  changed: boolean;
}

/** Now minus what was last passed on, per product. */
export function diffSince(last: BakeShare, now: BakeCounts): BakeDiff {
  const withRaisins = now.withRaisins - last.withRaisins;
  const withoutRaisins = now.withoutRaisins - last.withoutRaisins;
  return { withRaisins, withoutRaisins, total: withRaisins + withoutRaisins, changed: withRaisins !== 0 || withoutRaisins !== 0 };
}

/** Delivery days whose counts changed since they were last passed on (all orders, pop-ups included). */
export function changedDays(state: Pick<DashboardState, "bakeShares" | "orders">): string[] {
  const latest = new Map<string, BakeShare>();
  for (const s of state.bakeShares ?? []) if (!latest.has(s.date)) latest.set(s.date, s);
  const out: string[] = [];
  for (const [date, last] of latest) {
    if (diffSince(last, bakeCounts(state, date)).changed) out.push(date);
  }
  return out.sort();
}

/** "+10", "−4" or "0". */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0";
}

function dayName(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

/** The message as it goes out. Mentions the change when counts were passed on before. */
export function shareText(date: string, now: BakeCounts, last?: BakeShare, today = ""): string {
  const total = now.withRaisins + now.withoutRaisins;
  const when = today && addDays(today, 1) === date ? `morgen, ${dayName(date)}` : dayName(date);
  const lines = [
    `Oma Coby's Oliebollenbar – bestellijst voor ${when}`,
    "",
    `Met krenten: ${now.withRaisins}`,
    `Zonder krenten: ${now.withoutRaisins}`,
    `Totaal: ${total} oliebollen`
  ];
  if (last) {
    const d = diffSince(last, now);
    if (d.changed) {
      lines.push("", `Gewijzigd sinds ${formatChangeTime(last.at)} (toen ${last.total}): met ${signed(d.withRaisins)}, zonder ${signed(d.withoutRaisins)}, totaal ${signed(d.total)}.`);
    }
  }
  return lines.join("\n");
}

/** "06 12345678" → "31612345678" for wa.me; empty stays empty (WhatsApp then asks for a chat). */
export function waNumber(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `31${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(text: string, phone = ""): string {
  return `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
}

export function mailLink(text: string, subject: string, to = ""): string {
  return `mailto:${to.trim()}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
