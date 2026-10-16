import type { ReactNode } from "react";

export const cardClass = "rounded-2xl border border-white/60 bg-white/85 p-4 shadow-card backdrop-blur";

export const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-coby-500 focus:outline-none disabled:bg-stone-100";

export const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-coby-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coby-700 disabled:cursor-not-allowed disabled:opacity-50";

export const secondaryButton =
  "inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:border-coby-300 hover:bg-coby-50 disabled:cursor-not-allowed disabled:opacity-50";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`${cardClass} ${className}`}>{children}</section>;
}

export function SectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold text-stone-900">{title}</h2>
        {subtitle ? <p className="text-sm text-stone-600">{subtitle}</p> : null}
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
  return <div className={`rounded-xl border p-3 text-sm ${noticeClasses[tone]}`}>{children}</div>;
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <article className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-card backdrop-blur">
      <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-stone-900 sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-600">{hint}</p> : null}
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
