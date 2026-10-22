import { useEffect, useState, type ReactNode } from "react";
import brandmarkUrl from "../assets/brandmark-o.svg";

// Bouwstenen in de huisstijl. Regels: docs/huisstijl-regels.md.
// Kort: geen vakken in vakken, kaarten zonder rand met zachte schaduw, randen alleen op invoervelden.

export const cardClass = "rounded-kaart bg-papier p-4 shadow-zacht sm:p-5";

export const inputClass =
  "w-full rounded-md border border-lijn-2 bg-papier px-3 py-2 text-sm text-krent placeholder:text-muted/70 hover:border-[#c4b282] focus:border-krent focus:outline-none focus:ring-2 focus:ring-krent/20 disabled:bg-vul";

const buttonBase =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0";

/** Hoofdactie: krent met meel-tekst. Eén per kaart of scherm. */
export const primaryButton = `${buttonBase} bg-krent text-meel hover:bg-krent-hover`;

/** Tweede actie: zachte vulling, geen rand. */
export const secondaryButton = `${buttonBase} bg-vul text-krent hover:bg-vul-2`;

/** Derde actie: alleen tekst. */
export const ghostButton =
  "inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold text-oliebol transition hover:text-krent hover:underline hover:underline-offset-4 disabled:cursor-not-allowed disabled:opacity-40";

/** Snelknoppen zoals +10 / +50. */
export const quickButton = `${buttonBase} min-h-[32px] bg-gouwe px-2.5 py-1 text-xs text-krent hover:bg-gouwe-hover`;

/** Onomkeerbare actie (persoonsgegevens wissen). */
export const dangerButton = `${buttonBase} bg-feest-50 text-feest-ink hover:bg-[#f8d6ca]`;

/** De grote knop op telefoon (Afgeleverd). Bangers vanaf 24px: dan is meel op feest leesbaar. */
export const bigButton =
  "inline-flex min-h-[58px] w-full items-center justify-center gap-2 rounded-md bg-feest px-4 font-display text-[26px] uppercase leading-none tracking-wide text-meel transition hover:bg-feest-hover active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40";

/** Kleine tekstactie (Heropenen, Ongedaan maken). */
export const textAction =
  "text-xs font-bold text-oliebol underline decoration-lijn-2 underline-offset-4 hover:text-krent hover:decoration-current disabled:opacity-40";

export const fieldLabel = "text-[11px] font-bold uppercase tracking-[0.14em] text-muted";

export function Card({ children, className = "", tone }: { children: ReactNode; className?: string; tone?: "danger" }) {
  const base = tone === "danger" ? "rounded-kaart bg-[#fdf3ee] p-4 sm:p-5" : cardClass;
  return <section className={`${base} ${className}`}>{children}</section>;
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="font-serif text-xl font-bold leading-tight text-krent">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type NoticeTone = "info" | "warning" | "error" | "success";

const noticeStyle: Record<NoticeTone, { box: string; dot: string; sign: string }> = {
  info: { box: "bg-vul", dot: "bg-oliebol-50 text-oliebol", sign: "i" },
  warning: { box: "bg-gouwe-50", dot: "bg-gouwe text-krent", sign: "~" },
  error: { box: "bg-feest-50", dot: "bg-feest text-meel", sign: "!" },
  success: { box: "bg-kerst-50", dot: "bg-kerst text-meel", sign: "✓" }
};

/** Melding: alleen een tint en een teken, geen rand. Fouten zonder grap. */
export function Notice({ tone = "info", children }: { tone?: NoticeTone; children: ReactNode }) {
  const s = noticeStyle[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`grid grid-cols-[22px_minmax(0,1fr)] gap-2 rounded-kaart px-3 py-2.5 text-sm ${s.box}`}>
      <span aria-hidden="true" className={`grid h-[22px] w-[22px] place-items-center rounded-full text-xs font-bold ${s.dot}`}>
        {s.sign}
      </span>
      <div className="min-w-0 self-center">{children}</div>
    </div>
  );
}

/** Opmerking van de klant: gouwe ouwe-tint, krent-tekst. */
export function Note({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`rounded-md bg-gouwe-50 px-2.5 py-1.5 text-[13px] leading-snug text-krent ${className}`}>
      <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gouwe-ink">Opmerking</span>
      {children}
    </p>
  );
}

export type BadgeTone = "neutral" | "klaar" | "aandacht" | "probleem" | "zacht";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-oliebol-50 text-oliebol",
  klaar: "bg-kerst-50 text-kerst-ink",
  aandacht: "bg-gouwe-100 text-gouwe-ink",
  probleem: "bg-feest-50 text-feest-ink",
  zacht: "bg-vul text-oliebol"
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-bold ${badgeTones[tone]}`}>{children}</span>;
}

/** Elke taak heeft overal dezelfde kleur: in de agenda, op de vrijwilligerskaart en in de bezetting. */
export const taskClass: Record<string, string> = {
  inpakken: "bg-gouwe-100 text-gouwe-ink",
  fietskoerier: "bg-kerst-50 text-kerst-ink",
  autokoerier: "bg-feest-50 text-feest-ink",
  oliebollenbar: "bg-oliebol-50 text-oliebol"
};

/** Het schuine ovaal van de naamsticker. Tekst op feest/kerstbomen alleen in deze grootte (Bangers 24px). */
export function Sticker({ children, tone = "feest", slap = false, className = "" }: { children: ReactNode; tone?: "feest" | "kerst" | "gouwe"; slap?: boolean; className?: string }) {
  const tones = { feest: "bg-feest text-meel", kerst: "bg-kerst text-meel", gouwe: "bg-gouwe text-krent" };
  return (
    <span className={`inline-block -rotate-6 whitespace-nowrap rounded-[50%] px-5 py-3 font-display text-2xl uppercase leading-none tracking-wide ${tones[tone]} ${slap ? "oc-slap" : ""} ${className}`}>
      {children}
    </span>
  );
}

/** Klein schuin ovaal voor JIJ of initialen. */
export function Oval({ children }: { children: ReactNode }) {
  return <span className="inline-flex h-8 w-11 shrink-0 -rotate-6 items-center justify-center rounded-[50%] bg-gouwe text-[13px] font-bold text-krent">{children}</span>;
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <article className="rounded-kaart bg-papier p-4 shadow-zacht">
      <p className={fieldLabel}>{label}</p>
      <p className="mt-1 font-serif text-3xl font-bold tabular-nums text-krent">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </article>
  );
}

export interface Delta {
  tone: "up" | "down" | "flat";
  text: string;
}

const deltaTones = { up: "bg-kerst-50 text-kerst-ink", down: "bg-feest-50 text-feest-ink", flat: "bg-vul text-muted" };

/** Kerncijfers in één vlak; verschil met vorig jaar als chip. */
export function StatStrip({ items }: { items: Array<{ label: string; value: ReactNode; hint?: ReactNode; delta?: Delta }> }) {
  return (
    <section className="grid grid-cols-2 gap-1 rounded-kaart bg-papier p-1 shadow-zacht sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-3.5 py-3">
          <p className={`flex items-center justify-between gap-2 ${fieldLabel}`}>
            <span className="truncate">{item.label}</span>
            {item.delta ? <span className={`rounded px-1.5 text-[11px] normal-case tracking-normal ${deltaTones[item.delta.tone]}`}>{item.delta.text}</span> : null}
          </p>
          <p className="mt-0.5 truncate font-serif text-[28px] font-bold leading-9 tabular-nums text-krent">{item.value}</p>
          {item.hint ? <p className="mt-0.5 text-xs text-muted">{item.hint}</p> : null}
        </div>
      ))}
    </section>
  );
}

/** MET / ZONDER / TOTAAL, altijd in die volgorde en met die woorden. */
export function Bollenteller({ cells, compact = false }: { cells: Array<{ label: string; value: number; sub?: ReactNode }>; compact?: boolean }) {
  if (compact) {
    return (
      <div className="grid grid-cols-3 text-center">
        {cells.map((c, i) => (
          <div key={c.label} className={`rounded-md py-1.5 ${i === cells.length - 1 ? "bg-gouwe-50" : ""}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{c.label}</p>
            <p className="font-serif text-[22px] font-bold leading-7 tabular-nums text-krent">{c.value}</p>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-1 rounded-kaart bg-papier p-1 shadow-zacht">
      {cells.map((c, i) => (
        <div key={c.label} className={`min-w-0 px-3 py-2.5 sm:px-4 ${i === cells.length - 1 ? "rounded-[7px] bg-gouwe-50" : ""}`}>
          <p className={fieldLabel}>{c.label}</p>
          <p className="font-serif text-2xl font-bold tabular-nums text-krent sm:text-[32px] sm:leading-10">{formatNumber(c.value)}</p>
          {c.sub ? <div className="text-[11px] leading-snug sm:text-xs">{c.sub}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function ProgressBar({ label, done, total, showPercent = true }: { label: string; done: number; total: number; showPercent?: boolean }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2 text-xs text-muted">
        <span>
          {label}: <b className="tabular-nums text-krent">{done} van {total}</b>
        </span>
        {showPercent ? <span className="tabular-nums">{pct}%</span> : null}
      </div>
      <div className="h-2 overflow-hidden rounded bg-vul" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label={label}>
        <div className="h-full rounded bg-kerst transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Lege staat zonder kader: brandmark-O en een korte zin met knipoog. */
export function EmptyState({ title, text, action }: { title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 px-4 py-8 text-center">
      <img src={brandmarkUrl} alt="" className="h-auto w-11" />
      <p className="font-serif text-lg font-bold text-krent">{title}</p>
      {text ? <p className="max-w-sm text-sm text-muted">{text}</p> : null}
      {action}
    </div>
  );
}

export function Skeleton({ lines = 3 }: { lines?: number }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), 1000);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <div className="grid gap-2 rounded-kaart bg-papier p-4 shadow-zacht" aria-busy="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="oc-skel h-3.5" style={{ width: `${[45, 100, 75, 90][i % 4]}%` }} />
      ))}
      <p className={`text-xs text-muted ${slow ? "" : "invisible"}`}>Even de olie opwarmen…</p>
    </div>
  );
}

/** Bevestigen in de pagina zelf, in plaats van window.confirm/prompt. */
export function ConfirmPanel({
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  danger = false,
  disabled = false
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3 rounded-kaart bg-papier p-3.5 text-sm shadow-zwevend">
      {children}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={danger ? `${buttonBase} bg-feest-ink text-meel hover:bg-feest-hover` : primaryButton} disabled={busy || disabled} onClick={onConfirm}>
          {busy ? "Bezig…" : confirmLabel}
        </button>
        <button type="button" className={ghostButton} disabled={busy} onClick={onCancel}>
          Annuleren
        </button>
      </div>
    </div>
  );
}

/** Drie stipjes met één woord, voor de declaratiestatus. */
export function StatusTrack({ step, labels, hint }: { step: number; labels: string[]; hint?: string }) {
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
      <span className="inline-flex items-center" aria-hidden="true">
        {labels.map((l, i) => (
          <span key={l} className="inline-flex items-center">
            {i > 0 ? <span className={`h-px w-3.5 ${i <= step ? "bg-kerst" : "bg-lijn-2"}`} /> : null}
            <span className={`h-[7px] w-[7px] rounded-full ${i <= step ? "bg-kerst" : "bg-lijn-2"}`} />
          </span>
        ))}
      </span>
      <b className="text-krent">{labels[step]}</b>
      {hint ? <span>· {hint}</span> : null}
    </p>
  );
}

// ---------- iconen (dun, in tekstkleur) ----------

const iconPaths: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  whatsapp: <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" />,
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />,
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="1" />
      <path d="M5 15V4a1 1 0 0 1 1-1h11" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V3h10v6M7 17H4V9h16v8h-3" />
      <rect x="7" y="14" width="10" height="7" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <path d="m3 6 9 7 9-7" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  check: <path d="m5 12 5 5 9-10" />,
  download: <path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" />
};

export function Icon({ name, className = "h-4 w-4" }: { name: keyof typeof iconPaths | string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`shrink-0 fill-none stroke-current ${className}`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name]}
    </svg>
  );
}

/** Kopieerknop die altijd laat zien dat het gelukt is. */
export function CopyButton({ text, label, done = "Gekopieerd", className = secondaryButton, icon = true }: { text: string; label: ReactNode; done?: string; className?: string; icon?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("Kopiëren lukte niet. Selecteer de tekst en kopieer hem zelf.");
    }
  }
  return (
    <button type="button" className={className} onClick={() => void copy()}>
      {icon ? <Icon name={copied ? "check" : "copy"} /> : null}
      {copied ? done : label}
    </button>
  );
}

// ---------- toast ----------

type ToastListener = (text: string) => void;
const toastListeners = new Set<ToastListener>();

/** Korte melding onderin. Voor knipogen na een gelukte actie; fouten horen in een Notice. */
export function toast(text: string) {
  toastListeners.forEach((fn) => fn(text));
}

export function Toaster() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    let timer: number | undefined;
    const listener: ToastListener = (t) => {
      setText(t);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setText(null), 2800);
    };
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
      window.clearTimeout(timer);
    };
  }, []);
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-[min(92vw,460px)] -translate-x-1/2 rounded-md bg-krent px-4 py-2.5 text-sm text-meel shadow-zwevend transition duration-200 print:hidden ${
        text ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      {text}
    </div>
  );
}

// ---------- knipogen ----------

/** Eerlijk gerekend: per 10 oliebollen één oudje op de dansvloer. */
export function oudjesLine(oliebollen: number): string {
  const n = Math.floor(oliebollen / 10);
  return n >= 1 ? `Goed voor ${formatNumber(n)} ${n === 1 ? "oudje" : "oudjes"} op de dansvloer.` : "Weer een stapje richting de dansvloer.";
}

/** The drawn oliebol (powdered sugar, raisins); also used for the rolling wink and the exported stand. */
export const OLIEBOL_SVG =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M33 5c8 0 12 4 17 7 6 4 10 10 9 18 0 9-3 15-8 20-6 6-13 9-21 8-8-1-15-4-20-10C5 42 4 35 6 28c2-8 7-13 13-18 4-3 9-5 14-5z" fill="#b5763c" stroke="#261f1f" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 40c4 8 12 13 21 13 8 0 15-4 19-11" fill="none" stroke="#7d4a22" stroke-width="3" stroke-linecap="round" opacity=".55"/><path d="M17 19c3-5 8-8 14-8" fill="none" stroke="#e8b97d" stroke-width="3" stroke-linecap="round"/><g fill="#fffdf6"><circle cx="24" cy="14" r="2"/><circle cx="31" cy="11" r="1.6"/><circle cx="38" cy="14" r="2.2"/><circle cx="44" cy="19" r="1.5"/><circle cx="20" cy="22" r="1.4"/><circle cx="34" cy="18" r="1.3"/><circle cx="28" cy="20" r="1.7"/><ellipse cx="42" cy="11" rx="2" ry="1.3"/></g><g fill="#261f1f"><ellipse cx="26" cy="33" rx="2.6" ry="1.8" transform="rotate(-20 26 33)"/><ellipse cx="40" cy="30" rx="2.3" ry="1.6" transform="rotate(25 40 30)"/><ellipse cx="33" cy="42" rx="2.4" ry="1.7"/><ellipse cx="47" cy="40" rx="1.9" ry="1.4"/><ellipse cx="18" cy="38" rx="1.8" ry="1.3"/></g></svg>';

/**
 * Laat een getekende oliebol over de onderkant van het scherm rollen.
 * Alleen bij iets bijzonders: alles ingepakt, laatste stop afgeleverd, mijlpaal, aanmelding binnen.
 */
export function rollOliebol() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const w = window.innerWidth;
  const lane = document.createElement("div");
  lane.className = "oc-roll-lane";
  lane.setAttribute("aria-hidden", "true");
  lane.style.setProperty("--w", `${w}px`);
  lane.style.setProperty("--deg", `${Math.round(((w + 80) / (Math.PI * 56)) * 360)}deg`);
  lane.innerHTML = `<div class="oc-roll">${OLIEBOL_SVG}</div>`;
  document.body.appendChild(lane);
  window.setTimeout(() => lane.remove(), 2100);
}

/** Segmented filter: zachte track, actief segment als wit pilletje. Aantal als losse teller. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label
}: {
  value: T;
  options: Array<[T, string] | [T, string, number]>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-0.5 rounded-lg bg-vul p-[3px]">
      {options.map(([v, text, count]) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] transition ${active ? "bg-papier font-bold text-krent shadow-zacht" : "text-oliebol hover:text-krent"}`}
          >
            {text}
            {count !== undefined ? (
              <span className={`min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-bold leading-4 tabular-nums ${active ? "bg-gouwe-100" : "bg-vul"}`}>{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function formatEuro(value: number): string {
  return value.toLocaleString("nl-NL", { style: "currency", currency: "EUR" });
}

export function formatNumber(value: number): string {
  return value.toLocaleString("nl-NL");
}

export function formatDayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

export function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Today if there are deliveries today, otherwise the next delivery day, otherwise the last one. */
export function pickInitialDate(dates: string[]): string {
  const today = todayIso();
  return dates.find((date) => date >= today) ?? dates[dates.length - 1] ?? today;
}
