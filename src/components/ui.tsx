import type { ReactNode } from "react";

export const cardClass = "rounded-xl border border-stone-200 bg-white p-4 sm:p-5";

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-coby-500 focus:outline-none focus:ring-2 focus:ring-coby-100 disabled:bg-stone-100";

export const primaryButton =
  "inline-flex items-center justify-center rounded-lg bg-coby-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coby-700 disabled:cursor-not-allowed disabled:opacity-40";

export const secondaryButton =
  "inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${cardClass} ${className}`}>{children}</section>;
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-stone-900">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type NoticeTone = "info" | "warning" | "error" | "success";

const noticeClasses: Record<NoticeTone, string> = {
  info: "border-coby-300 bg-coby-50 text-coby-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  error: "border-red-300 bg-red-50 text-red-800",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800"
};

export function Notice({ tone = "info", children }: { tone?: NoticeTone; children: ReactNode }) {
  return <div className={`rounded-lg border px-3 py-2.5 text-sm ${noticeClasses[tone]}`}>{children}</div>;
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-stone-900 sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </article>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "coby" | "green" | "blue" | "amber" }) {
  const tones = {
    neutral: "bg-stone-100 text-stone-700",
    coby: "bg-coby-100 text-coby-900",
    green: "bg-emerald-100 text-emerald-800",
    blue: "bg-sky-100 text-sky-800",
    amber: "bg-amber-100 text-amber-900"
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
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

/** Compact segmented control for filters: one choice from a few options. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label
}: {
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-lg bg-stone-100 p-0.5">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${value === v ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

export const ghostButton =
  "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40";

/** Several key numbers in one calm card instead of a row of separate tiles. */
export function StatStrip({ items }: { items: Array<{ label: string; value: ReactNode; hint?: ReactNode }> }) {
  return (
    <section className="grid grid-cols-2 gap-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:flex sm:divide-x sm:divide-stone-100 sm:p-5">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-0 sm:flex-1 sm:px-5 sm:first:pl-0 sm:last:pr-0">
          <p className="text-xs font-medium text-stone-500">{item.label}</p>
          <p className="mt-0.5 truncate text-xl font-semibold tabular-nums text-stone-900 sm:text-2xl">{item.value}</p>
          {item.hint ? <p className="mt-0.5 text-xs text-stone-500">{item.hint}</p> : null}
        </div>
      ))}
    </section>
  );
}
