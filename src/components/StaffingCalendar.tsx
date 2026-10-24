import type { SignupCounts } from "../data/backend";
import { volunteerRoleLabel } from "../types/dashboard";
import { OPTION_TARGETS, SIGNUP_OPTIONS, STAFFING_TARGETS } from "../config";
import { dayKey, staffingForDay, statusLabel, type StaffingStatus } from "../utils/staffing";

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

const statusClass: Record<StaffingStatus, string> = {
  weinig: "bg-feest-50 text-feest-ink",
  bijna: "bg-gouwe-100 text-gouwe-ink",
  genoeg: "bg-kerst-50 text-kerst-ink"
};
/** In the cells only the number is coloured, so a quiet season does not turn the calendar into a wall of red. */
const statusText: Record<StaffingStatus, string> = {
  weinig: "text-feest-ink",
  bijna: "text-gouwe-ink",
  genoeg: "text-kerst-ink"
};
const statusIcon: Record<StaffingStatus, string> = { weinig: "!", bijna: "~", genoeg: "✓" };

/** Season year from the configured options, e.g. "Dinsdag 15 december". */
function seasonDates(): Date[] {
  const year = Number(import.meta.env.VITE_SEASON_YEAR) || inferYear();
  const keys = Array.from(new Set(Object.values(SIGNUP_OPTIONS).flat().map(dayKey)));
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
  const sample = Object.values(SIGNUP_OPTIONS).flat()[0]?.toLowerCase().match(/^([a-z]+)\s+(\d{1,2})\s+([a-z]+)/);
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
 * Shows counts only, so it can also be shown on public pages. With `onPick` the days are buttons.
 */
export function StaffingCalendar({ counts, selected, onPick }: { counts: SignupCounts; selected?: string; onPick?: (day: string) => void }) {
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
      <div className="mb-2 flex flex-wrap gap-3 text-xs text-krent">
        {(["weinig", "bijna", "genoeg"] as StaffingStatus[]).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <span className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold ${statusClass[s]}`}>{statusIcon[s]}</span>
            {statusLabel[s]}
          </span>
        ))}
        <span className="text-muted">
          {Object.keys(OPTION_TARGETS).length > 0
            ? "Nodig per dag(deel): zoals in het tabblad Agenda."
            : `Nodig per dag: inpakken ${STAFFING_TARGETS.inpakken}, auto ${STAFFING_TARGETS.autokoerier}, bar ${STAFFING_TARGETS.oliebollenbar}`}
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              {w}
            </div>
          ))}
          {cells.map((date) => {
            const active = inSeason.has(date.toDateString());
            const key = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
            return (
              <Cell
                key={date.toISOString()}
                pick={active && onPick ? () => onPick(key) : undefined}
                className={`min-h-[92px] rounded-md p-1.5 text-left ${active ? "bg-meel/70" : "bg-transparent"} ${selected === key ? "ring-2 ring-krent" : ""} ${active && onPick ? "hover:bg-gouwe-50" : ""}`}
                pressed={selected === key}
              >
                <p className={`text-xs font-bold ${active ? "text-krent" : "text-muted/50"}`}>
                  {date.getDate()} {date.getDate() === 1 || date === cells[0] ? MONTHS[date.getMonth()].slice(0, 3) : ""}
                </p>
                {active ? (
                  <div className="mt-1 grid gap-0.5">
                    {staffingForDay(counts, key).map(({ role, parts }) => (
                      <div key={role} className="flex flex-wrap items-center gap-1 text-[11px] leading-tight">
                        <span className="w-[42px] shrink-0 text-muted">{volunteerRoleLabel[role].replace("koerier", "").slice(0, 6)}</span>
                        {parts.map((p) => (
                          <span
                            key={p.label || "dag"}
                            className={`font-bold tabular-nums ${statusText[p.status]}`}
                            title={`${volunteerRoleLabel[role]}${p.label ? ` ${p.label}` : ""}: ${p.count} van ${p.target} aangemeld (${statusLabel[p.status].toLowerCase()})`}
                          >
                            {/* Vollkorn: in Arvo a "!" reads like a "1" at this size. */}
                            {p.status !== "bijna" ? <span className="mr-px font-serif">{p.status === "weinig" ? "!" : "✓"}</span> : null}
                            {p.label ? `${p.label[0]}${p.count}` : p.count}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Cell>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">o = ochtend, m = middag, a = avond. Telt aanmeldingen (beschikbaarheid), niet het definitieve rooster.</p>
    </div>
  );
}

function Cell({ pick, pressed, className, children }: { pick?: () => void; pressed: boolean; className: string; children: React.ReactNode }) {
  if (!pick) return <div className={className}>{children}</div>;
  return (
    <button type="button" className={`${className} block w-full align-top`} onClick={pick} aria-pressed={pressed}>
      {children}
    </button>
  );
}
