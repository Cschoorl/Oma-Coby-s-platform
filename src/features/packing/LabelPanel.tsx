import { useLayoutEffect, useRef, useState } from "react";
import { LABEL_SIZE, MAX_PER_DOOS } from "../../config";
import type { DashboardState } from "../../types/dashboard";
import type { Order } from "../../types/order";
import { minBoxes, splitPieces, type BoxKind } from "../../utils/boxes";
import { Icon, fieldLabel, ghostButton, primaryButton } from "../../components/ui";
import { DymoLabel, labelsFor, loadAutoPrint, printLabels, saveAutoPrint } from "./labels";

const kindLabel: Record<BoxKind, string> = { met: "MET", zonder: "ZONDER" };
const doos = (n: number) => `${n} ${n === 1 ? "doos" : "dozen"}`;

/** "3 dozen MET (40 · 40 · 40) en 1 doos ZONDER (30)": how to split an order while packing. */
export function boxPlan(order: Pick<Order, "withRaisins" | "withoutRaisins">): string {
  return (["met", "zonder"] as const)
    .map((kind) => {
      const pieces = kind === "met" ? order.withRaisins : order.withoutRaisins;
      const split = splitPieces(pieces);
      return split.length ? `${doos(split.length)} ${kindLabel[kind]} (${split.join(" · ")})` : "";
    })
    .filter(Boolean)
    .join(" en ");
}

/**
 * Print the box labels of one packed order. The number of boxes per kind starts at the fewest
 * that keep every box at or under MAX_PER_DOOS; the packer can add boxes when they used more.
 */
export function LabelPanel({ state, order, onClose }: { state: DashboardState; order: Order; onClose: () => void }) {
  const [counts, setCounts] = useState<Record<BoxKind, number>>({ met: minBoxes(order.withRaisins), zonder: minBoxes(order.withoutRaisins) });
  const [auto, setAuto] = useState(loadAutoPrint);
  const labels = labelsFor(state, order, counts);

  const rows = (["met", "zonder"] as const)
    .map((kind) => ({ kind, pieces: kind === "met" ? order.withRaisins : order.withoutRaisins }))
    .filter((r) => r.pieces > 0);

  return (
    <section className="grid gap-3 rounded-kaart bg-papier p-3.5 shadow-zwevend" aria-label="Labels printen">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-serif text-base font-bold text-krent">Labels printen</p>
        <p className="text-xs text-muted">Hooguit {MAX_PER_DOOS} per doos, MET en ZONDER apart</p>
      </div>

      <div className="grid gap-2">
        {rows.map(({ kind, pieces }) => {
          const n = counts[kind];
          const min = minBoxes(pieces);
          return (
            <div key={kind} className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className={`w-16 ${fieldLabel}`}>{kindLabel[kind]}</span>
              <span className="inline-flex items-center rounded-md bg-vul">
                <button
                  type="button"
                  className="grid h-11 w-11 place-items-center rounded-md text-lg font-bold text-krent hover:bg-vul-2 disabled:opacity-30"
                  disabled={n <= min}
                  aria-label={`Eén doos ${kindLabel[kind]} minder`}
                  onClick={() => setCounts((c) => ({ ...c, [kind]: c[kind] - 1 }))}
                >
                  −
                </button>
                <span className="min-w-[72px] text-center text-sm font-bold tabular-nums text-krent" aria-live="polite">
                  {doos(n)}
                </span>
                <button
                  type="button"
                  className="grid h-11 w-11 place-items-center rounded-md text-lg font-bold text-krent hover:bg-vul-2 disabled:opacity-30"
                  disabled={n >= pieces}
                  aria-label={`Eén doos ${kindLabel[kind]} meer`}
                  onClick={() => setCounts((c) => ({ ...c, [kind]: c[kind] + 1 }))}
                >
                  +
                </button>
              </span>
              <span className="text-xs tabular-nums text-muted">{splitPieces(pieces, n).join(" · ")}</span>
            </div>
          );
        })}
      </div>

      {labels[0] ? <LabelPreview>{<DymoLabel label={labels[0]} />}</LabelPreview> : null}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={primaryButton} onClick={() => void printLabels(labels)}>
          <Icon name="print" />
          Print {labels.length} {labels.length === 1 ? "label" : "labels"}
        </button>
        <button type="button" className={ghostButton} onClick={onClose}>
          Klaar
        </button>
      </div>
      <label className="flex items-center gap-2 text-xs text-krent">
        <input
          type="checkbox"
          className="h-4 w-4 accent-krent"
          checked={auto}
          onChange={(e) => {
            setAuto(e.target.checked);
            saveAutoPrint(e.target.checked);
          }}
        />
        Op dit apparaat meteen printen na Afronden
      </label>
      <p className="text-[11px] text-muted">
        Kies in het printvenster de DYMO LabelWriter 450 met papier {LABEL_SIZE.name} ({LABEL_SIZE.heightMm} × {LABEL_SIZE.widthMm} mm), liggend, schaal 100%.
      </p>
    </section>
  );
}

/** The first label at real proportions, scaled down to fit the card. */
function LabelPreview({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const mm = (n: number) => (n * 96) / 25.4;
    const fit = () => setScale(Math.min(1, el.clientWidth / mm(LABEL_SIZE.widthMm)));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const heightPx = (LABEL_SIZE.heightMm * 96) / 25.4;
  return (
    <div ref={wrap} className="w-full" aria-hidden="true">
      <p className={`mb-1 ${fieldLabel}`}>Voorbeeld doos 1</p>
      <div style={{ height: heightPx * scale }}>
        <div className="origin-top-left rounded-[3px] shadow-zacht ring-1 ring-lijn-2" style={{ transform: `scale(${scale})`, width: "max-content" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
