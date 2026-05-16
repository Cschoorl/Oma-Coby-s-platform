import type { AgendaShift, DeliveryRole } from "../types/agenda";
import type { Order } from "../types/order";

const MONTHS_NL: Record<string, number> = {
  januari: 0,
  februari: 1,
  maart: 2,
  april: 3,
  mei: 4,
  juni: 5,
  juli: 6,
  augustus: 7,
  september: 8,
  oktober: 9,
  november: 10,
  december: 11
};

const SHIFT_TIMES: Record<"ochtend" | "middag", { start: string; end: string }> = {
  ochtend: { start: "09:00", end: "12:00" },
  middag: { start: "12:00", end: "15:00" }
};

const DEFAULT_ROLE_TIMES: Record<DeliveryRole, { start: string; end: string }> = {
  Inpakken: { start: "09:00", end: "12:00" },
  Fietskoerier: { start: "09:00", end: "12:00" },
  Autokoerier: { start: "11:00", end: "16:00" },
  Oliebollenbar: { start: "11:00", end: "16:00" }
};

const ROLE_PREFIXES: Array<{ role: DeliveryRole; prefixes: string[] }> = [
  { role: "Inpakken", prefixes: ["inpakken"] },
  { role: "Fietskoerier", prefixes: ["fietskoerier"] },
  { role: "Autokoerier", prefixes: ["autokoerier"] },
  { role: "Oliebollenbar", prefixes: ["oliebollenbar"] }
];

function capitalizeMonth(monthLower: string): string {
  if (!monthLower) return monthLower;
  return monthLower.charAt(0).toUpperCase() + monthLower.slice(1);
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function splitExtrasParts(extras: string): string[] {
  return extras
    .split(/\s*\|\|\s*/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

function monthNameByIndex(monthIndex: number): string {
  return Object.keys(MONTHS_NL).find((k) => MONTHS_NL[k] === monthIndex) ?? "";
}

function parseDateToken(token: string): { day: number; monthIndex: number } | null {
  const clean = token
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  const match = clean.match(/(\d{1,2})\s+([a-zà-ÿ]+)/i);
  if (!match) return null;

  const day = Number(match[1]);
  const monthNameLower = String(match[2]).toLowerCase();
  const monthIndex = MONTHS_NL[monthNameLower];
  if (!Number.isFinite(day) || monthIndex === undefined) return null;
  return { day, monthIndex };
}

function parseTimeRange(text: string): { start: string; end: string } | null {
  const match = text.match(/(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})/i);
  if (!match) return null;
  const start = `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
  const end = `${String(Number(match[3])).padStart(2, "0")}:${match[4]}`;
  return { start, end };
}

function extractRoleSchedule(extras: string, role: DeliveryRole): string {
  const parts = splitExtrasParts(extras);
  const rolePrefixes = ROLE_PREFIXES.find((r) => r.role === role)?.prefixes ?? [role.toLowerCase()];

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (!rolePrefixes.some((prefix) => lower.startsWith(prefix + ":"))) continue;
    // Expected shapes:
    // "Fietskoerier: Ja | Vrijdag 19 december: middag, ..."
    // "Inpakken: Ja | Woensdag 17 december, Donderdag 18 december, ..."
    if (!/:\s*ja\s*\|/i.test(part)) return "";

    const match = part.match(/:\s*ja\s*\|\s*(.*)$/i);
    return match?.[1] ? normalize(match[1]) : "";
  }

  return "";
}

function parseScheduleSessions(scheduleText: string): Array<{ day: number; monthIndex: number; session: "ochtend" | "middag" }> {
  const out: Array<{ day: number; monthIndex: number; session: "ochtend" | "middag" }> = [];

  // Matches "... 17 december: ochtend" and "... 18 december: middag"
  const re = /(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s*:\s*(ochtend|middag)/gi;
  let m: RegExpExecArray | null = null;
  while ((m = re.exec(scheduleText)) !== null) {
    const day = Number(m[1]);
    const monthNameLower = String(m[2]).toLowerCase();
    const session = m[3].toLowerCase() as "ochtend" | "middag";
    const monthIndex = MONTHS_NL[monthNameLower];
    if (!Number.isFinite(day) || monthIndex === undefined) continue;

    out.push({ day, monthIndex, session });
  }

  return out;
}

function parseScheduleWithExplicitTimes(
  scheduleText: string
): Array<{ day: number; monthIndex: number; start: string; end: string }> {
  const out: Array<{ day: number; monthIndex: number; start: string; end: string }> = [];
  const chunks = scheduleText
    .split(",")
    .map((x) => normalize(x))
    .filter(Boolean);

  for (const chunk of chunks) {
    const date = parseDateToken(chunk);
    const range = parseTimeRange(chunk);
    if (!date || !range) continue;
    out.push({ day: date.day, monthIndex: date.monthIndex, start: range.start, end: range.end });
  }

  return out;
}

function parseScheduleDatesOnly(scheduleText: string): Array<{ day: number; monthIndex: number }> {
  const out: Array<{ day: number; monthIndex: number }> = [];
  const chunks = scheduleText
    .split(",")
    .map((x) => normalize(x))
    .filter(Boolean);

  for (const chunk of chunks) {
    const date = parseDateToken(chunk);
    if (date) out.push(date);
  }
  return out;
}

export function parseAgendaShifts(orders: Order[]): AgendaShift[] {
  const shifts: AgendaShift[] = [];
  const dedupe = new Set<string>();

  for (const order of orders) {
    const extras = order.extras ?? "";
    if (!extras) continue;

    const roles: DeliveryRole[] = ["Inpakken", "Fietskoerier", "Autokoerier", "Oliebollenbar"];

    for (const role of roles) {
      const scheduleText = extractRoleSchedule(extras, role);
      if (!scheduleText) continue;

      const timeRanges = parseScheduleWithExplicitTimes(scheduleText);
      const sessions = parseScheduleSessions(scheduleText);
      const datesOnly = parseScheduleDatesOnly(scheduleText);

      for (const t of timeRanges) {
        const monthNameLower = monthNameByIndex(t.monthIndex);
        const dateLabel = `${t.day} ${capitalizeMonth(monthNameLower)}`.trim();
        const dedupeKey = [order.contactPerson ?? order.supplierName, role, dateLabel.toLowerCase(), t.start, t.end].join("|");
        if (dedupe.has(dedupeKey)) continue;
        dedupe.add(dedupeKey);

        shifts.push({
          id: dedupeKey,
          personName: order.contactPerson ?? order.supplierName,
          role,
          dateLabel,
          startTime: t.start,
          endTime: t.end,
          locationName: order.locationName,
          monthIndex: t.monthIndex,
          dayOfMonth: t.day
        });
      }

      for (const s of sessions) {
        const time = SHIFT_TIMES[s.session];
        const monthNameLower = monthNameByIndex(s.monthIndex);
        const dateLabel = `${s.day} ${capitalizeMonth(monthNameLower)}`.trim();

        const dedupeKey = [
          order.contactPerson ?? order.supplierName,
          role,
          dateLabel.toLowerCase(),
          time.start,
          time.end
        ].join("|");

        if (dedupe.has(dedupeKey)) continue;
        dedupe.add(dedupeKey);

        shifts.push({
          id: dedupeKey,
          personName: order.contactPerson ?? order.supplierName,
          role,
          dateLabel,
          startTime: time.start,
          endTime: time.end,
          locationName: order.locationName,
          monthIndex: s.monthIndex,
          dayOfMonth: s.day
        });
      }

      // If only dates are present (no session/times), create default availability blocks.
      const fallbackTime = DEFAULT_ROLE_TIMES[role];
      for (const d of datesOnly) {
        const monthNameLower = monthNameByIndex(d.monthIndex);
        const dateLabel = `${d.day} ${capitalizeMonth(monthNameLower)}`.trim();
        const dedupeKey = [
          order.contactPerson ?? order.supplierName,
          role,
          dateLabel.toLowerCase(),
          fallbackTime.start,
          fallbackTime.end
        ].join("|");
        if (dedupe.has(dedupeKey)) continue;
        dedupe.add(dedupeKey);

        shifts.push({
          id: dedupeKey,
          personName: order.contactPerson ?? order.supplierName,
          role,
          dateLabel,
          startTime: fallbackTime.start,
          endTime: fallbackTime.end,
          locationName: order.locationName,
          monthIndex: d.monthIndex,
          dayOfMonth: d.day
        });
      }
    }
  }

  shifts.sort((a, b) => {
    if (a.monthIndex !== b.monthIndex) return a.monthIndex - b.monthIndex;
    if (a.dayOfMonth !== b.dayOfMonth) return a.dayOfMonth - b.dayOfMonth;
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    return a.role.localeCompare(b.role);
  });

  return shifts;
}

