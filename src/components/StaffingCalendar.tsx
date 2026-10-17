import type { SignupCounts } from "../data/backend";
import { volunteerRoleLabel } from "../types/dashboard";
import { SIGNUP_OPTIONS, STAFFING_TARGETS } from "../config";
import { dayKey, staffingForDay, statusLabel, type StaffingStatus } from "../utils/staffing";

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

const statusClass: Record<StaffingStatus, string> = {
  weinig: "bg-red-100 text-red-800",
  bijna: "bg-amber-100 text-amber-900",
  genoeg: "bg-emerald-100 text-emerald-800"
};
const statusIcon: Record<StaffingStatus, string> = { weinig: "!", bijna: "~", genoeg: "✓" };

/** Season year from the configured options, e.g. "Dinsdag 15 december". */
function seasonDates(): Date[] {
  const year = Number(import.meta.env.VITE_SEASON_YEAR) || inferYear();
  const keys = Array.from(new Set(SIGNUP_OPTIONS.inpakken.concat(SIGNUP_OPTIONS.fietskoerier).map(dayKey)));
  return keys
    .map((k) => {
      const [d, m] = k.split(" ");
      const month = MONTHS.indexOf(m);
      return month === -1 ? null : new Date(month < 6 ? year + 1 : year, month, Number(d), 12);
    })
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());
}

/** The weekday names in the options pin down the year (e.g. "Dinsdag 15 december" → 2026). */
function inferYear(): number {
  const names = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const sample = SIGNUP_OPTIONS.inpakken[0]?.toLowerCase().match(/^([a-z]+)\s+(\d{1,2})\s+([a-z]+)/);
  const now = new Date().getFullYear();
  if (!sample) return now;
  for (let y = now - 1; y <= now + 2; y++) {
    const date = new Date(y, MONTHS.indexOf(sample[3]), Number(sample[2]), 12);
    if (names[date.getDay()] === sample[1]) return y;
  }
  return now;
}

/**
 * Month-style calendar: per season day how many people signed up per role, against the target.
 * Shows counts only, so it can also be shown on public pages.
 */
export function StaffingCalendar({ counts }: { counts: SignupCounts }) {
  const dates = seasonDates();
  if (dates.length === 0) return null;

  // Pad to whole weeks starting on Monday.
  const first = new Date(dates[0]);
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const last = new Date(dates[dates.length - 1]);
  last.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7)));
  const inSeason = new Set(dates.map((d) => d.toDateString()));
  const cells: Date[] = [];
  for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) cells.push(new Date(d));

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-stone-700">
        {(["weinig", "bijna", "genoeg"] as StaffingStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${statusClass[s]}`}>{statusIcon[s]}</span>
            {statusLabel[s]}
          </span>
        ))}
        <span className="text-stone-500">
          Nodig per dag(deel): inpakken {STAFFING_TARGETS.inpakken}, fiets {STAFFING_TARGETS.fietskoerier}, auto {STAFFING_TARGETS.autokoerier}, bar{" "}
          {STAFFING_TARGETS.oliebollenbar}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
              {w}
            </div>
          ))}
          {cells.map((date) => {
            const active = inSeason.has(date.toDateString());
            const key = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
            return (
              <div key={date.toISOString()} className={`min-h-[96px] rounded-lg border p-1.5 ${active ? "border-stone-200 bg-white" : "border-transparent bg-stone-50/60"}`}>
                <p className={`text-xs font-semibold ${active ? "text-stone-900" : "text-stone-400"}`}>
                  {date.getDate()} {date.getDate() === 1 || date === cells[0] ? MONTHS[date.getMonth()].slice(0, 3) : ""}
                </p>
                {active ? (
                  <div className="mt-1 grid gap-0.5">
                    {staffingForDay(counts, key).map(({ role, parts }) => (
                      <div key={role} className="flex flex-wrap items-center gap-0.5 text-[10px] leading-tight">
                        <span className="w-[42px] shrink-0 text-stone-600">{volunteerRoleLabel[role].replace("koerier", "").slice(0, 6)}</span>
                        {parts.map((p) => (
                          <span
                            key={p.label || "dag"}
                            className={`rounded px-1 font-semibold tabular-nums ${statusClass[p.status]}`}
                            title={`${volunteerRoleLabel[role]}${p.label ? ` ${p.label}` : ""}: ${p.count} aangemeld (${statusLabel[p.status].toLowerCase()})`}
                          >
                            {statusIcon[p.status]} {p.label ? `${p.label[0]}${p.count}` : p.count}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-stone-500">o = ochtend, m = middag. Telt aanmeldingen (beschikbaarheid), niet het definitieve rooster.</p>
    </div>
  );
}
