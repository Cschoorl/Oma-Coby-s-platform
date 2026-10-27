import { useState } from "react";
import type { SignupCounts } from "../data/backend";
import { VOLUNTEER_ROLES, volunteerRoleLabel } from "../types/dashboard";
import { OPTION_TIMES, SIGNUP_OPTIONS } from "../config";
import { dayKey, optionKey, staffingForDay, type DayStaffing, type StaffingStatus } from "../utils/staffing";
import { EmptyState, Segmented, taskClass } from "./ui";

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const WEEKDAYS = ["zo", "ma", "di", "wo", "do", "vr", "za"];

const statusPill: Record<StaffingStatus, string> = {
  weinig: "bg-feest-50 text-feest-ink",
  bijna: "bg-gouwe-100 text-gouwe-ink",
  genoeg: "bg-kerst-50 text-kerst-ink"
};
const statusIcon: Record<StaffingStatus, string> = { weinig: "!", bijna: "~", genoeg: "✓" };

interface SeasonDay {
  key: string;
  date: Date;
  roles: DayStaffing[];
  /** People still needed that day, over all tasks and dagdelen. */
  open: number;
}

/** Season year from the configured options, e.g. "Dinsdag 15 december". */
function seasonDays(counts: SignupCounts): SeasonDay[] {
  const year = Number(import.meta.env.VITE_SEASON_YEAR) || inferYear();
  const keys = Array.from(new Set(Object.values(SIGNUP_OPTIONS).flat().map(dayKey)));
  return keys
    .map((key) => {
      const [d, m] = key.split(" ");
      const month = MONTHS.indexOf(m);
      if (month === -1) return null;
      const roles = staffingForDay(counts, key);
      const open = roles.reduce((sum, r) => sum + r.parts.reduce((s, p) => s + Math.max(0, p.target - p.count), 0), 0);
      return { key, date: new Date(month < 6 ? year + 1 : year, month, Number(d), 12), roles, open };
    })
    .filter((d): d is SeasonDay => d !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
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

/** "ochtend" → "Ochtend"; no dagdeel → the start time from the agenda, or "Hele dag". */
function partLabel(label: string, option: string): string {
  if (label) return label[0].toUpperCase() + label.slice(1);
  return OPTION_TIMES[optionKey(option)] ? `Vanaf ${OPTION_TIMES[optionKey(option)]}` : "Hele dag";
}

/**
 * Per season day, per task and dagdeel: how many people signed up against what is needed.
 * Shows counts only (no names), so it can also be shown to volunteers. With `onPick` the days are buttons.
 */
export function StaffingOverview({ counts, selected, onPick }: { counts: SignupCounts; selected?: string; onPick?: (day: string) => void }) {
  const [view, setView] = useState<"open" | "alle">("open");
  const days = seasonDays(counts);
  if (days.length === 0) return null;

  const shortDays = days.filter((d) => d.open > 0);
  const totalOpen = shortDays.reduce((sum, d) => sum + d.open, 0);
  const shown = view === "open" ? shortDays : days;
  const roles = VOLUNTEER_ROLES.filter((role) => days.some((d) => d.roles.some((r) => r.role === role)));
  const cols = `7.5rem repeat(${roles.length}, minmax(0, 1fr))`;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-krent">
          {totalOpen > 0 ? (
            <>
              Nog <span className="font-serif text-lg font-bold tabular-nums">{totalOpen}</span> {totalOpen === 1 ? "plek" : "plekken"} open op{" "}
              <span className="font-bold">
                {shortDays.length} van de {days.length}
              </span>{" "}
              dagen.
            </>
          ) : (
            <span className="font-bold text-kerst-ink">✓ Alle dagen zijn bezet.</span>
          )}
        </p>
        <Segmented
          label="Welke dagen"
          value={view}
          onChange={setView}
          options={[
            ["open", "Nog plek", shortDays.length],
            ["alle", "Alle dagen", days.length]
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <EmptyState title="Overal genoeg mensen" text="Elke dag en elk dagdeel is bezet. Oma Coby is trots op jullie." />
      ) : (
        <div>
          {/* Column heads: one per task, in the task colour. */}
          <div className="hidden gap-3 border-b border-lijn-2 pb-2 sm:grid" style={{ gridTemplateColumns: cols }}>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Dag</span>
            {roles.map((role) => (
              <span key={role}>
                <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold ${taskClass[role]}`}>{volunteerRoleLabel[role]}</span>
              </span>
            ))}
          </div>
          <ul>
            {shown.map((day) => (
              <li key={day.key} className="border-b border-lijn py-3 last:border-0">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:[grid-template-columns:var(--cols)]" style={{ ["--cols" as string]: cols }}>
                  <DayHead
                    pick={onPick ? () => onPick(day.key) : undefined}
                    pressed={selected === day.key}
                    className={`col-span-2 flex items-baseline justify-between gap-2 rounded-md text-left sm:col-span-1 sm:block ${onPick ? "-m-1.5 p-1.5 hover:bg-gouwe-50" : ""} ${selected === day.key ? "ring-2 ring-krent" : ""}`}
                  >
                    <p className="font-serif text-base font-bold text-krent">
                      {WEEKDAYS[day.date.getDay()]} {day.date.getDate()} {MONTHS[day.date.getMonth()].slice(0, 3)}
                    </p>
                    <p className={`text-xs font-bold ${day.open > 0 ? "text-feest-ink" : "text-kerst-ink"}`}>{day.open > 0 ? `nog ${day.open} nodig` : "✓ bezet"}</p>
                  </DayHead>
                  {roles.map((role) => {
                    const parts = day.roles.find((r) => r.role === role)?.parts ?? [];
                    return (
                      <div key={role} className="grid content-start gap-1">
                        <span className={`w-fit rounded px-1.5 py-0.5 text-[11px] font-bold sm:hidden ${taskClass[role]}`}>{volunteerRoleLabel[role]}</span>
                        {parts.length === 0 ? <span className="text-xs text-muted">–</span> : null}
                        {parts.map((p) => (
                          <div key={p.option} className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-oliebol">{partLabel(p.label, p.option)}</span>
                            <span
                              className={`inline-flex min-w-[52px] items-center justify-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold tabular-nums ${statusPill[p.status]}`}
                              title={`${volunteerRoleLabel[role]} ${partLabel(p.label, p.option).toLowerCase()}: ${p.count} van ${p.target} aangemeld`}
                            >
                              {/* Vollkorn: in Arvo a "!" reads like a "1" at this size. */}
                              <span className="font-serif">{statusIcon[p.status]}</span>
                              {p.count}/{p.target}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted">
        <span className="font-serif font-bold text-feest-ink">!</span> weinig · <span className="font-serif font-bold text-gouwe-ink">~</span> bijna ·{" "}
        <span className="font-serif font-bold text-kerst-ink">✓</span> genoeg. 0/4 = aangemeld van nodig, zoals in het tabblad Agenda. Telt aanmeldingen (beschikbaarheid), niet het definitieve rooster.
      </p>
    </div>
  );
}

function DayHead({ pick, pressed, className, children }: { pick?: () => void; pressed: boolean; className: string; children: React.ReactNode }) {
  if (!pick) return <div className={className}>{children}</div>;
  return (
    <button type="button" className={className} onClick={pick} aria-pressed={pressed}>
      {children}
    </button>
  );
}
