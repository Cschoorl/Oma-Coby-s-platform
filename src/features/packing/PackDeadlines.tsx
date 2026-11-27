import { useEffect, useMemo, useState } from "react";
import type { DashboardState } from "../../types/dashboard";
import { Badge, cardClass, formatNumber, todayIso, type BadgeTone } from "../../components/ui";
import { formatTravelTime } from "../routes/routeUtils";
import { packDeadlines, type PackDeadline } from "./packTimes";

/** The clock in minutes after midnight; ticks along so "nog 20 min" stays true without a reload. */
function useMinuteClock(): number {
  const read = () => new Date().getHours() * 60 + new Date().getMinutes();
  const [now, setNow] = useState(read);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(read()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** Soon enough to say so: within this many minutes of the time it has to be ready. */
const SOON_MINUTES = 30;

function statusOf(group: PackDeadline, isToday: boolean, now: number): { tone: BadgeTone; text: string } | null {
  if (group.packedOrders === group.orders.length) return { tone: "klaar", text: "✓ klaar" };
  if (!isToday) return null;
  const left = group.minutes - now;
  if (left <= 0) return { tone: "probleem", text: "! had al klaar moeten zijn" };
  if (left <= SOON_MINUTES) return { tone: "aandacht", text: `~ nog ${formatTravelTime(left)}` };
  return { tone: "zacht", text: `over ${formatTravelTime(left)}` };
}

/** "Anna de Vries 2 stops · Bram Jansen 1 stop · 1 afhalen": who and what leaves at this time. */
function leaving(group: PackDeadline): string {
  const n = group.counts;
  return [
    ...group.trips.map((t) => `${t.courier} ${t.stops} ${t.stops === 1 ? "stop" : "stops"}`),
    n["zonder-route"] ? `${n["zonder-route"]} nog zonder route` : "",
    n["niet-ingedeeld"] ? `${n["niet-ingedeeld"]} nog niet ingedeeld` : "",
    n.afhalen ? `${n.afhalen} afhalen` : "",
    n.popup ? "pop-upvoorraad" : ""
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Inpakken: how much has to be packed by which time, live. The times come from the routes of the day
 * (departure of each trip) and, where there is no route yet, from the bezorgmoment; see packTimes.ts.
 */
export function PackDeadlines({ state, date }: { state: DashboardState; date: string }) {
  const groups = useMemo(() => packDeadlines(state, date), [state, date]);
  const now = useMinuteClock();
  const isToday = date === todayIso();
  if (groups.length === 0) return null;
  // The first time that is not done yet is the one to work on.
  const next = groups.find((g) => g.packedOrders < g.orders.length);
  const estimated = groups.some((g) => g.counts["zonder-route"] + g.counts["niet-ingedeeld"] > 0);

  return (
    <section className={cardClass} aria-label="Klaar vóór">
      <h2 className="font-serif text-xl font-bold leading-tight text-krent">Klaar vóór</h2>
      <ol className="mt-1">
        {groups.map((g) => {
          const status = statusOf(g, isToday, now);
          const done = g.packedOrders === g.orders.length;
          const pct = g.total ? Math.round((g.packedTotal / g.total) * 100) : done ? 100 : 0;
          return (
            <li key={g.time} className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 border-b border-lijn py-3 last:border-0 last:pb-0">
              <p className={`font-serif text-[26px] font-bold leading-8 tabular-nums ${done ? "text-muted" : g === next ? "text-feest-ink" : "text-krent"}`}>{g.time}</p>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className={`text-sm ${done ? "text-muted" : "text-krent"}`}>
                    <b className="font-serif text-lg tabular-nums">{formatNumber(g.total)}</b> oliebollen
                    <span className="text-muted">
                      {" "}
                      · met {formatNumber(g.withRaisins)} · zonder {formatNumber(g.withoutRaisins)}
                    </span>
                  </p>
                  {status ? <Badge tone={status.tone}>{status.text}</Badge> : null}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {done ? (
                    `${g.orders.length} ${g.orders.length === 1 ? "order" : "orders"} ingepakt`
                  ) : (
                    <>
                      <b className="tabular-nums text-krent">nog {formatNumber(g.total - g.packedTotal)}</b> in te pakken · {g.packedOrders} van {g.orders.length} {g.orders.length === 1 ? "order" : "orders"} klaar
                    </>
                  )}
                  {leaving(g) ? ` · ${leaving(g)}` : ""}
                </p>
                <div className="mt-2 h-[3px] overflow-hidden rounded bg-vul" role="progressbar" aria-valuemin={0} aria-valuemax={g.total} aria-valuenow={g.packedTotal} aria-label={`Ingepakt voor ${g.time}`}>
                  <div className="h-full rounded bg-kerst transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {estimated ? <p className="mt-3 text-xs text-muted">Zonder berekende route geldt het begin van het dagdeel uit het bezorgmoment.</p> : null}
    </section>
  );
}
