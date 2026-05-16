import { useMemo, useState } from "react";
import type { Order } from "../../types/order";
import type { AgendaShift } from "../../types/agenda";
import { parseAgendaShifts } from "../../utils/agendaParser";

const START_HOUR = 9;
const END_HOUR = 15;
const CALENDAR_HEIGHT = 720; // pixels for 9:00 - 15:00

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function AgendaPage({ orders, contactEmail }: { orders: Order[]; contactEmail: string }) {
  const [query, setQuery] = useState<string>("");

  const shifts = useMemo<AgendaShift[]>(() => parseAgendaShifts(orders), [orders]);

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
      if (one.monthIndex !== two.monthIndex) return one.monthIndex - two.monthIndex;
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
      <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[240px] flex-1">
            <p className="text-xs uppercase tracking-wide text-stone-500">Zoek bezorger</p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bijv. Cesar Schoorl"
              type="search"
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-coby-500 focus:outline-none"
            />
          </div>
          <div className="text-sm text-stone-700">
            <span className="font-semibold text-stone-900">{filtered.length}</span> ingepland
          </div>
        </div>
      </section>

      {shifts.length === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Geen agenda-items gevonden op basis van je sheet data (vermoedelijk missen `extra_notities` met “Fietskoerier: Ja | ...” of “Autokoerier: Ja | ...”).
        </section>
      ) : (
        <section className="rounded-2xl border border-white/60 bg-white/90 p-3 shadow-card backdrop-blur sm:p-4">
          {columns.length === 0 ? (
            <p className="text-sm text-stone-600">Geen resultaten voor je zoekopdracht.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid grid-cols-[72px_repeat(var(--cols),minmax(0,1fr))]" style={{ ["--cols" as string]: columns.length }}>
                  <div className="border-b border-stone-200 p-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Tijd
                  </div>
                  {columns.map(([dateLabel]) => (
                    <div key={dateLabel} className="border-b border-l border-stone-200 p-2 text-center">
                      <p className="text-xs uppercase tracking-wide text-stone-500">Dag</p>
                      <p className="text-sm font-semibold text-stone-900">{dateLabel}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-[72px_repeat(var(--cols),minmax(0,1fr))]" style={{ ["--cols" as string]: columns.length }}>
                  <div className="relative border-r border-stone-200" style={{ height: `${CALENDAR_HEIGHT}px` }}>
                    {hourLines.map((hour) => {
                      const top = ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * CALENDAR_HEIGHT;
                      return (
                        <div key={hour} className="absolute left-0 right-0 -translate-y-1/2 pr-2 text-right text-xs text-stone-500" style={{ top }}>
                          {formatHour(hour)}
                        </div>
                      );
                    })}
                  </div>

                  {columns.map(([dateLabel, items]) => (
                    <div key={dateLabel} className="relative border-l border-stone-200 bg-white/60" style={{ height: `${CALENDAR_HEIGHT}px` }}>
                      {hourLines.map((hour) => {
                        const top = ((hour - START_HOUR) / (END_HOUR - START_HOUR)) * CALENDAR_HEIGHT;
                        return <div key={hour} className="absolute left-0 right-0 border-t border-stone-100" style={{ top }} />;
                      })}

                      {items.map((shift) => (
                        <article
                          key={shift.id}
                          className="absolute left-1 right-1 rounded-lg border border-coby-300 bg-coby-100/95 p-2 shadow-sm"
                          style={{ top: `${eventTopPx(shift)}px`, height: `${eventHeightPx(shift)}px` }}
                        >
                          <p className="truncate text-xs font-semibold text-coby-900">{shift.personName}</p>
                          <p className="text-[11px] text-coby-800">
                            {shift.startTime} - {shift.endTime}
                          </p>
                          <p className="text-[11px] text-coby-700">{shift.role}</p>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-dashed border-stone-300 bg-white/40 p-4 text-sm text-stone-700">
        Niet kunnen of anders plannen? Mail dan naar{" "}
        <a className="font-semibold text-coby-700 underline decoration-coby-300 underline-offset-2" href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>
        .
      </section>
    </section>
  );
}

