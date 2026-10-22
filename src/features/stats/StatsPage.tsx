import { useMemo, useRef, useState } from "react";
import type { DashboardState } from "../../types/dashboard";
import { Card, Icon, Notice, SectionTitle, Segmented, StatStrip, formatEuro, formatNumber, secondaryButton, toast, todayIso, type Delta } from "../../components/ui";
import { Discozaal, Rollatorbalk, Verkoopteller } from "./Discozaal";
import { exportStand } from "./exportStand";

type Metric = "oliebollen" | "orders" | "revenue";

interface DayPoint {
  /** Days before 31 december (0 = oudjaarsdag, 10 = 21 december). */
  daysBefore: number;
  orders: number;
  oliebollen: number;
  revenue: number | null;
}

interface Season {
  year: number;
  days: DayPoint[];
  current: boolean;
}

/** This year in feest (solid), last year in oliebol and older years in grey (both dashed). */
const SERIES_COLORS = ["#d05438", "#5c4238", "#b6a68e"];

const metricLabel: Record<Metric, string> = { oliebollen: "Oliebollen", orders: "Bestellingen", revenue: "Omzet" };

function daysBeforeNewYearsEve(isoDate: string): { year: number; daysBefore: number } | null {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  // Orders placed in early January still count for the season that just ended.
  const seasonYear = date.getMonth() === 0 ? date.getFullYear() - 1 : date.getFullYear();
  const eve = new Date(seasonYear, 11, 31, 12);
  return { year: seasonYear, daysBefore: Math.round((eve.getTime() - date.getTime()) / 86400000) };
}

function metricValue(point: DayPoint, metric: Metric): number {
  if (metric === "revenue") return point.revenue ?? 0;
  return point[metric];
}

function cumulativeUpTo(season: Season, cutoff: number, metric: Metric): number {
  return season.days.filter((d) => d.daysBefore >= cutoff).reduce((sum, d) => sum + metricValue(d, metric), 0);
}

export function StatsPage({ state }: { state: DashboardState }) {
  const [metric, setMetric] = useState<Metric>("oliebollen");
  const [exporting, setExporting] = useState(false);

  const { seasons, revenueSource, currentYear, cutoff } = useMemo(() => {
    const byYear = new Map<number, Map<number, DayPoint>>();
    const add = (year: number, daysBefore: number, orders: number, oliebollen: number, revenue: number | null) => {
      if (!byYear.has(year)) byYear.set(year, new Map());
      const days = byYear.get(year)!;
      const point = days.get(daysBefore) ?? { daysBefore, orders: 0, oliebollen: 0, revenue: null };
      point.orders += orders;
      point.oliebollen += oliebollen;
      if (revenue !== null) point.revenue = (point.revenue ?? 0) + revenue;
      days.set(daysBefore, point);
    };

    const hasAmounts = state.orders.some((o) => o.amount !== undefined);
    const source: "amount" | "estimate" | "none" = hasAmounts ? "amount" : state.pricePerPiece ? "estimate" : "none";

    const placed = state.orders
      .map((order) => ({ order, at: daysBeforeNewYearsEve(order.orderDate || order.deliveryDate) }))
      .filter((x): x is { order: (typeof state.orders)[number]; at: { year: number; daysBefore: number } } => x.at !== null);
    const current = placed.length > 0 ? Math.max(...placed.map((x) => x.at.year)) : new Date().getFullYear();
    const todayAt = daysBeforeNewYearsEve(todayIso());
    const seasonCutoff = todayAt && todayAt.year === current ? Math.max(0, todayAt.daysBefore) : 0;

    for (const { order, at } of placed) {
      const pieces = order.withRaisins + order.withoutRaisins;
      const revenue = source === "amount" ? order.amount ?? 0 : source === "estimate" ? pieces * (state.pricePerPiece ?? 0) : null;
      // An order dated in the future (only a leverdatum known) is already sold, so it counts as today.
      const daysBefore = at.year === current ? Math.max(at.daysBefore, seasonCutoff) : at.daysBefore;
      add(at.year, daysBefore, 1, pieces, revenue);
    }

    for (const row of state.history) {
      if (row.year === current) continue; // the live orders are leading for this season
      const at = daysBeforeNewYearsEve(row.date);
      if (!at) continue;
      add(row.year, at.daysBefore, row.orders, row.oliebollen, row.revenue);
    }

    const list: Season[] = Array.from(byYear.entries())
      .map(([year, days]) => ({ year, current: year === current, days: Array.from(days.values()).sort((a, b) => b.daysBefore - a.daysBefore) }))
      .sort((a, b) => b.year - a.year);
    return { seasons: list, revenueSource: source, currentYear: current, cutoff: seasonCutoff };
  }, [state.orders, state.history, state.pricePerPiece]);

  const thisSeason = seasons.find((s) => s.current);
  const pastSeasons = seasons.filter((s) => !s.current);

  // "Dezelfde periode": up to today's distance from oudjaarsdag; after the season, the whole season.

  const totals = (season: Season | undefined) => ({
    orders: season ? cumulativeUpTo(season, cutoff, "orders") : 0,
    oliebollen: season ? cumulativeUpTo(season, cutoff, "oliebollen") : 0,
    revenue: season ? cumulativeUpTo(season, cutoff, "revenue") : 0,
    hasRevenue: season ? season.days.some((d) => d.revenue !== null) : false
  });
  const now = totals(thisSeason);
  const last = totals(pastSeasons[0]);

  // Compared with the same period last season. A tiny base reads "was N" in grey, never a red -100%.
  const delta = (current: number, previous: number): Delta | undefined => {
    if (!pastSeasons[0] || previous === 0) return undefined;
    if (previous < 5) return { tone: "flat", text: `was ${formatNumber(previous)}` };
    const pct = Math.round(((current - previous) / previous) * 100);
    return { tone: pct > 0 ? "up" : pct < 0 ? "down" : "flat", text: `${pct > 0 ? "+" : pct < 0 ? "−" : "±"}${Math.abs(pct)}%` };
  };
  // Before the season starts, "same period" last year is often 0; then also show the whole season.
  const lastHint = (previous: number, metric: Metric, format: (n: number) => string = formatNumber) => {
    if (!pastSeasons[0]) return undefined;
    const whole = cumulativeUpTo(pastSeasons[0], 0, metric);
    const base = `${pastSeasons[0].year}: ${format(previous)}`;
    return cutoff > 0 && whole !== previous ? `${base} · hele seizoen ${format(whole)}` : base;
  };

  const seasonOliebollen = thisSeason ? cumulativeUpTo(thisSeason, 0, "oliebollen") : 0;

  async function onExport() {
    setExporting(true);
    try {
      const comparison = delta(now.oliebollen, last.oliebollen);
      await exportStand({
        date: todayIso(),
        oliebollen: seasonOliebollen,
        orders: thisSeason ? cumulativeUpTo(thisSeason, 0, "orders") : 0,
        revenue: revenueSource === "none" || !thisSeason ? null : cumulativeUpTo(thisSeason, 0, "revenue"),
        revenueIsEstimate: revenueSource === "estimate",
        comparison: comparison && pastSeasons[0] ? `${comparison.text}` : undefined
      });
      toast("De stand van vandaag staat in je downloads.");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Exporteren lukte niet.");
    } finally {
      setExporting(false);
    }
  }

  const periodLabel = cutoff === 0 ? "hele seizoen t/m 31 december" : `t/m ${cutoff} ${cutoff === 1 ? "dag" : "dagen"} voor oudjaarsdag`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <p className="-mt-2 text-sm text-muted">
        Seizoen {currentYear}, {periodLabel}. Telt op besteldatum (of leverdatum als die ontbreekt).
      </p>
      {pastSeasons.length === 0 ? (
        <Notice tone="warning">
          Er zijn nog geen cijfers van voorgaande jaren. Vul het tabblad <code>Historie</code> in de Sheet (jaar, datum, bestellingen, oliebollen, omzet) om te vergelijken.
        </Notice>
      ) : null}

      {/* The stand as a disco: one oudje per ten oliebollen sold this season. */}
      <Verkoopteller oliebollen={seasonOliebollen} />
      <Rollatorbalk oliebollen={seasonOliebollen} />
      <Discozaal oliebollen={seasonOliebollen} />

      <StatStrip
        items={[
          { label: "Bestellingen", value: formatNumber(now.orders), hint: lastHint(last.orders, "orders"), delta: delta(now.orders, last.orders) },
          { label: "Oliebollen verkocht", value: formatNumber(now.oliebollen), hint: lastHint(last.oliebollen, "oliebollen"), delta: delta(now.oliebollen, last.oliebollen) },
          {
            label: revenueSource === "estimate" ? "Omzet (schatting)" : "Omzet",
            value: revenueSource === "none" ? "—" : formatEuro(now.revenue),
            hint:
              revenueSource === "none"
                ? "Geen bedragen of prijs in de Sheet"
                : revenueSource === "estimate"
                  ? `Oliebollen × ${formatEuro(state.pricePerPiece ?? 0)}${last.hasRevenue ? ` · ${lastHint(last.revenue, "revenue", formatEuro)}` : ""}`
                  : last.hasRevenue
                    ? lastHint(last.revenue, "revenue", formatEuro)
                    : undefined,
            delta: revenueSource !== "none" && last.hasRevenue ? delta(now.revenue, last.revenue) : undefined
          }
        ]}
      />

      <ProgressCard state={state} revenue={revenueSource === "none" ? null : now.revenue} revenueIsEstimate={revenueSource === "estimate"} />

      <Card>
        <SectionTitle
          title={`${metricLabel[metric]} opgeteld per dag`}
          subtitle="Horizontaal: dagen tot oudjaarsdag. Beweeg over de grafiek voor de waarden."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="Metriek"
                value={metric}
                onChange={setMetric}
                options={(Object.keys(metricLabel) as Metric[]).filter((m) => m !== "revenue" || revenueSource !== "none").map((m) => [m, metricLabel[m]] as [Metric, string])}
              />
              <button type="button" className={secondaryButton} disabled={exporting} onClick={() => void onExport()} title="Bewaar de stand van vandaag als afbeelding">
                <Icon name="download" />
                {exporting ? "Bezig…" : "Exporteer stand"}
              </button>
            </div>
          }
        />
        <CumulativeChart seasons={seasons.slice(0, 3)} metric={metric} cutoff={cutoff} />
      </Card>

      <Card>
        <SectionTitle title="Per seizoen" subtitle={`Zelfde periode (${periodLabel}) naast het hele seizoen t/m 31 december.`} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="pt-1 pr-3" />
                <th colSpan={3} className="pt-1 pr-3 text-right font-bold">Zelfde periode</th>
                <th colSpan={3} className="border-l border-lijn-2 pt-1 pl-3 text-right font-bold">Hele seizoen</th>
              </tr>
              <tr className="border-b border-lijn-2 text-left text-[11px] uppercase tracking-[0.12em] text-muted">
                <th className="py-2 pr-3 font-bold">Seizoen</th>
                <th className="py-2 pr-3 text-right font-bold">Bestellingen</th>
                <th className="py-2 pr-3 text-right font-bold">Oliebollen</th>
                <th className="py-2 pr-3 text-right font-bold">Omzet</th>
                <th className="border-l border-lijn-2 py-2 pl-3 pr-3 text-right font-bold">Bestellingen</th>
                <th className="py-2 pr-3 text-right font-bold">Oliebollen</th>
                <th className="py-2 pr-3 text-right font-bold">Omzet</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {seasons.map((season) => {
                const t = totals(season);
                return (
                  <tr key={season.year} className="border-b border-lijn last:border-0">
                    <td className="py-2 pr-3 font-bold text-krent">{season.year}{season.current ? " (nu)" : ""}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(t.orders)}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(t.oliebollen)}</td>
                    <td className="py-2 pr-3 text-right">{t.hasRevenue ? formatEuro(t.revenue) : "–"}</td>
                    <td className="border-l border-lijn-2 py-2 pl-3 pr-3 text-right">{formatNumber(cumulativeUpTo(season, 0, "orders"))}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(cumulativeUpTo(season, 0, "oliebollen"))}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{t.hasRevenue ? formatEuro(cumulativeUpTo(season, 0, "revenue")) : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/** Where the action stands now: packed, delivered, and revenue against approved costs. */
function ProgressCard({ state, revenue, revenueIsEstimate }: { state: DashboardState; revenue: number | null; revenueIsEstimate: boolean }) {
  const orders = state.orders;
  const packed = orders.filter((o) => state.packing[o.id]?.packedBy).length;
  const piecesTotal = orders.reduce((sum, o) => sum + o.withRaisins + o.withoutRaisins, 0);
  const piecesPacked = orders.filter((o) => state.packing[o.id]?.packedBy).reduce((sum, o) => sum + o.withRaisins + o.withoutRaisins, 0);
  const deliveries = orders.filter((o) => o.fulfilment === "bezorgen");
  const delivered = deliveries.filter((o) => state.delivery[o.id]).length;
  const approved = state.costs.filter((c) => c.status === "goedgekeurd" || c.status === "uitbetaald").reduce((sum, c) => sum + c.amount, 0);
  const pending = state.costs.filter((c) => c.status === "ingediend").reduce((sum, c) => sum + c.amount, 0);

  return (
    <StatStrip
      items={[
        { label: "Besteld", value: formatNumber(orders.length), hint: `${formatNumber(piecesTotal)} oliebollen` },
        { label: "Ingepakt", value: `${packed} / ${orders.length}`, hint: `${formatNumber(piecesPacked)} oliebollen` },
        { label: "Bezorgd", value: `${delivered} / ${deliveries.length}`, hint: `${orders.length - deliveries.length} worden afgehaald` },
        {
          label: "Omzet min kosten",
          value: revenue === null ? "n.v.t." : formatEuro(revenue - approved),
          hint: `${revenue === null ? "omzet onbekend" : `omzet ${formatEuro(revenue)}${revenueIsEstimate ? " (schatting)" : ""}`} · kosten ${formatEuro(approved)}${pending ? ` (+ ${formatEuro(pending)} te beoordelen)` : ""}`
        }
      ]}
    />
  );
}

const WIDTH = 960;
const HEIGHT = 340;
const PAD = { top: 16, right: 64, bottom: 32, left: 56 };

function CumulativeChart({ seasons, metric, cutoff }: { seasons: Season[]; metric: Metric; cutoff: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const series = useMemo(
    () =>
      seasons.map((season, i) => {
        let running = 0;
        const points = season.days.map((d) => {
          running += metricValue(d, metric);
          return { x: d.daysBefore, y: running };
        });
        // The current season stops at today; earlier seasons run to the end.
        return { season, color: SERIES_COLORS[i], points: season.current ? points.filter((p) => p.x >= cutoff) : points };
      }),
    [seasons, metric, cutoff]
  );

  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) return <p className="text-sm text-muted">Nog geen gegevens om te tonen.</p>;

  const maxX = Math.max(7, ...allPoints.map((p) => p.x));
  const maxY = Math.max(1, ...allPoints.map((p) => p.y));
  const niceMax = niceCeil(maxY);
  const sx = (x: number) => PAD.left + ((maxX - x) / maxX) * (WIDTH - PAD.left - PAD.right);
  const sy = (y: number) => HEIGHT - PAD.bottom - (y / niceMax) * (HEIGHT - PAD.top - PAD.bottom);
  const format = (v: number) => (metric === "revenue" ? formatEuro(v) : formatNumber(Math.round(v)));

  const valueAt = (points: Array<{ x: number; y: number }>, x: number) => {
    const before = points.filter((p) => p.x >= x);
    return before.length ? before[before.length - 1].y : 0;
  };

  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax);
  const ticksX = xTicks(maxX);

  function onMove(event: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const x = Math.round(maxX - ((px - PAD.left) / (WIDTH - PAD.left - PAD.right)) * maxX);
    setHover(Math.min(maxX, Math.max(0, x)));
  }

  return (
    <div className="relative">
      <div className="mb-2 flex flex-wrap gap-4 text-xs text-krent" aria-hidden="true">
        {series.map((s) => (
          <span key={s.season.year} className="inline-flex items-center gap-2">
            <svg width="22" height="8">
              <line x1="0" x2="22" y1="4" y2="4" stroke={s.color} strokeWidth="2" strokeDasharray={s.season.current ? undefined : "5 3"} />
            </svg>
            {s.season.year}
          </span>
        ))}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full touch-none"
        role="img"
        aria-label={`Opgetelde ${metricLabel[metric].toLowerCase()} per seizoen`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={WIDTH - PAD.right} y1={sy(t)} y2={sy(t)} stroke="#ebe1bf" strokeWidth="1" />
            <text x={PAD.left - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#6d5a4f">
              {metric === "revenue" ? `€${formatNumber(Math.round(t))}` : formatNumber(Math.round(t))}
            </text>
          </g>
        ))}
        {ticksX.map((t) => (
          <text key={t} x={sx(t)} y={HEIGHT - 10} textAnchor="middle" fontSize="11" fill="#6d5a4f">
            {t === 0 ? "31 dec" : `-${t} d`}
          </text>
        ))}
        {series.map((s) => (
          <polyline
            key={s.season.year}
            fill="none"
            stroke={s.color}
            strokeWidth={s.season.current ? 3 : 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.season.current ? undefined : "6 4"}
            points={stepPoints(s.points, maxX).map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ")}
          />
        ))}
        {series.map((s) => {
          const lastPoint = s.points[s.points.length - 1];
          if (!lastPoint) return null;
          return (
            <g key={`end-${s.season.year}`}>
              <circle cx={sx(lastPoint.x)} cy={sy(lastPoint.y)} r="4" fill={s.color} stroke="#fffdf6" strokeWidth="2" />
              <text x={sx(lastPoint.x) + 8} y={sy(lastPoint.y)} dominantBaseline="middle" fontSize="11" fontWeight="600" fill="#261f1f">
                {s.season.year}
              </text>
            </g>
          );
        })}
        {hover !== null ? (
          <g>
            <line x1={sx(hover)} x2={sx(hover)} y1={PAD.top} y2={HEIGHT - PAD.bottom} stroke="#d8c998" strokeWidth="1" />
            {series.map((s) =>
              s.season.current && hover < cutoff ? null : (
                <circle key={s.season.year} cx={sx(hover)} cy={sy(valueAt(s.points, hover))} r="4" fill={s.color} stroke="#fffdf6" strokeWidth="2" />
              )
            )}
          </g>
        ) : null}
      </svg>
      {hover !== null ? (
        <div
          className="pointer-events-none absolute top-8 rounded-md bg-papier px-3 py-2 text-xs shadow-zwevend"
          style={{ left: `${Math.min(70, (sx(hover) / WIDTH) * 100)}%` }}
        >
          <p className="mb-1 font-bold text-krent">{hover === 0 ? "31 december" : `${hover} dagen voor 31 december`}</p>
          {series.map((s) => (
            <p key={s.season.year} className="flex items-center gap-2 text-krent">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.season.year}: <span className="font-bold tabular-nums text-krent">{s.season.current && hover < cutoff ? "–" : format(valueAt(s.points, hover))}</span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Cumulative totals change per day, so draw them as steps from the left edge. */
function stepPoints(points: Array<{ x: number; y: number }>, maxX: number) {
  if (points.length === 0) return [];
  const out = [{ x: maxX, y: 0 }, { x: points[0].x, y: 0 }];
  points.forEach((p, i) => {
    if (i > 0) out.push({ x: p.x, y: points[i - 1].y });
    out.push(p);
  });
  return out;
}

function niceCeil(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;
  return step * magnitude;
}

function xTicks(maxX: number): number[] {
  const step = maxX > 40 ? 10 : maxX > 14 ? 5 : maxX > 7 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= maxX; t += step) ticks.push(t);
  return ticks;
}
