import { useMemo, useState } from "react";
import type { Order } from "../../types/order";
import type { AgendaShift } from "../../types/agenda";
import { parseAgendaShifts, parseVolunteerShifts, seasonMonth } from "../../utils/agendaParser";
import type { Volunteer } from "../../types/dashboard";
import { StaffingCalendar } from "../../components/StaffingCalendar";
import { countSignups } from "../../utils/staffing";
import { Card, CopyButton, EmptyState, Icon, SectionTitle, inputClass, taskClass, textAction } from "../../components/ui";

const START_HOUR = 9;
const END_HOUR = 17;
const CALENDAR_HEIGHT = 960; // pixels for 9:00 - 17:00

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Puts overlapping shifts side by side: returns each shift's lane and the day's lane count. */
function assignLanes(items: AgendaShift[]): { lanes: Map<string, number>; laneCount: number } {
  const laneEnds: number[] = [];
  const lanes = new Map<string, number>();
  const sorted = [...items].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  for (const shift of sorted) {
    const start = toMinutes(shift.startTime);
    let lane = laneEnds.findIndex((end) => end <= start);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = toMinutes(shift.endTime);
    lanes.set(shift.id, lane);
  }
  return { lanes, laneCount: Math.max(1, laneEnds.length) };
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function AgendaPage({ orders, volunteers, contactEmail }: { orders: Order[]; volunteers: Volunteer[]; contactEmail: string }) {
  const [query, setQuery] = useState<string>("");

  // Signups from the volunteer form are leading; older order rows with schedules are the fallback.
  const shifts = useMemo<AgendaShift[]>(
    () => (volunteers.length > 0 ? parseVolunteerShifts(volunteers) : parseAgendaShifts(orders)),
    [orders, volunteers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shifts;
    return shifts.filter((s) => {
      return s.personName.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || (s.locationName ?? "").toLowerCase().includes(q);
    });
  }, [query, shifts]);

  const columns = useMemo(() => {
    const map = new Map<string, AgendaShift[]>();
    for (const shift of filtered) {
      const key = shift.dateLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(shift);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const one = a[1][0];
      const two = b[1][0];
      if (!one || !two) return 0;
      if (one.monthIndex !== two.monthIndex) return seasonMonth(one.monthIndex) - seasonMonth(two.monthIndex);
      return one.dayOfMonth - two.dayOfMonth;
    });
  }, [filtered]);

  const hourLines = useMemo(() => {
    const out: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h += 1) out.push(h);
    return out;
  }, []);

  function eventTopPx(shift: AgendaShift): number {
    const dayStart = START_HOUR * 60;
    const dayEnd = END_HOUR * 60;
    const minutes = Math.max(dayStart, Math.min(dayEnd, toMinutes(shift.startTime)));
    const ratio = (minutes - dayStart) / (dayEnd - dayStart);
    return ratio * CALENDAR_HEIGHT;
  }

  function eventHeightPx(shift: AgendaShift): number {
    const dayStart = START_HOUR * 60;
    const dayEnd = END_HOUR * 60;
    const start = Math.max(dayStart, Math.min(dayEnd, toMinutes(shift.startTime)));
    const end = Math.max(dayStart, Math.min(dayEnd, toMinutes(shift.endTime)));
    const ratio = Math.max(0.08, (end - start) / (dayEnd - dayStart));
    return ratio * CALENDAR_HEIGHT;
  }

  return (
    <section className="grid gap-4">
      {volunteers.length > 0 ? (
        <Card>
          <SectionTitle title="Waar is nog plek?" subtitle="Met een ! zijn er die dag nog weinig mensen. Kun je dan? Laat het de planning weten." />
          <StaffingCalendar counts={countSignups(volunteers)} />
        </Card>
      ) : null}
      {shifts.length === 0 ? (
        <EmptyState title="Nog niemand ingepland." text="Oma Coby bakt ze niet alleen. Zodra vrijwilligers zich aanmelden, verschijnen ze hier." />
      ) : (
        <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <label className="relative min-w-[240px] flex-1 sm:max-w-sm">
              <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek een naam of taak" aria-label="Zoek in de agenda" type="search" className={`${inputClass} pl-9`} />
            </label>
            <p className="text-sm text-muted">
              <b className="tabular-nums text-krent">{filtered.length}</b> ingepland
            </p>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
            {(["Inpakken", "Fietskoerier", "Autokoerier", "Oliebollenbar"] as const).map((r) => (
              <span key={r} className={`rounded px-2 py-0.5 ${taskClass[r.toLowerCase()]}`}>
                {r}
              </span>
            ))}
          </div>
          {columns.length === 0 ? (
            <EmptyState title="Niemand gevonden." text="Probeer een andere naam of taak." />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[72px_repeat(var(--cols),minmax(0,1fr))]" style={{ ["--cols" as string]: columns.length }}>
                  <div className="border-b border-lijn-2 p-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    Tijd
                  </div>
                  {columns.map(([dateLabel]) => (
                    <div key={dateLabel} className="border-b border-lijn-2 p-2 text-center">
                      <p className="text-sm font-bold text-krent">{dateLabel}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[72px_repeat(var(--cols),minmax(0,1fr))]" style={{ ["--cols" as string]: columns.length }}>
                  <div className="relative border-r border-lijn" style={{ height: `${CALENDAR_HEIGHT}px` }}>
                    {hourLines.map((hour) => {
                      const top = ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * CALENDAR_HEIGHT;
                      return (
                        <div key={hour} className="absolute left-0 right-0 -translate-y-1/2 pr-2 text-right text-xs tabular-nums text-muted" style={{ top }}>
                          {formatHour(hour)}
                        </div>
                      );
                    })}
                  </div>

                  {columns.map(([dateLabel, items]) => {
                    const { lanes, laneCount } = assignLanes(items);
                    return (
                    <div key={dateLabel} className="relative border-r border-lijn last:border-r-0" style={{ height: `${CALENDAR_HEIGHT}px` }}>
                      {hourLines.map((hour) => {
                        const top = ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * CALENDAR_HEIGHT;
                        return <div key={hour} className="absolute left-0 right-0 border-t border-lijn/70" style={{ top }} />;
                      })}

                      {items.map((shift) => (
                        <article
                          key={shift.id}
                          className={`absolute overflow-hidden rounded-md p-2 ${taskClass[shift.role.toLowerCase()] ?? taskClass.inpakken}`}
                          style={{
                            top: `${eventTopPx(shift)}px`,
                            height: `${eventHeightPx(shift)}px`,
                            left: `calc(${((lanes.get(shift.id) ?? 0) / laneCount) * 100}% + 2px)`,
                            width: `calc(${100 / laneCount}% - 4px)`
                          }}
                        >
                          <p className="truncate text-xs font-bold">{shift.personName}</p>
                          <p className="text-[11px] tabular-nums">
                            {shift.startTime}–{shift.endTime}
                          </p>
                          <p className="text-[11px] opacity-80">{shift.role}</p>
                        </article>
                      ))}
                    </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      <p className="text-center text-sm text-muted">
        Niet kunnen of anders plannen? Mail naar{" "}
        <a className={textAction} href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>{" "}
        <CopyButton text={contactEmail} label="Kopieer" done="Gekopieerd" className={textAction} icon={false} />
      </p>
    </section>
  );
}

