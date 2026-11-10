import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { backend } from "../../data/backend";
import type { BusinessArea, BusinessInfo, BusinessMoment, BusinessOrderInput, BusinessPackage, BusinessPackageKey, BusinessTotals } from "../../types/business";
import { Card, Notice, OLIEBOL_SVG, Segmented, Sticker, fieldLabel, ghostButton, inputClass, primaryButton, quickButton, rollOliebol, secondaryButton } from "../../components/ui";
import { BUSINESS_DEFAULTS, BUSINESS_PER_COLLEAGUE } from "../../config";
import { DiscoHall, DiscoOudje } from "../stats/Discozaal";
import {
  businessTotals,
  chosenPackage,
  colleaguesFor,
  dayOpen,
  emptyBusinessInput,
  formatPostcode,
  guessArea,
  nextTier,
  packageSplit,
  tierFor,
  validateBusiness,
  type BusinessField
} from "./business";
import { setLang, useLang, useT, type Lang } from "./teksten";

/*
 * Zakelijk bestellen: het Google Formulier van Mark als één overzichtelijke pagina.
 * Stap 1 begint met de pakketten Brons, Zilver en Goud (of zelf samenstellen), daarna wanneer Oma langskomt en je gegevens.
 * Een pakket geldt vanaf zijn aantal: meer blijft dat pakket, minder valt terug naar het pakket eronder. Afhalen kan niet.
 * Rechts (op telefoon onderaan) het overzicht dat meerekent, met de oudjes als knipoog.
 * Na het versturen kan de klant met één klik een volgend adres toevoegen; gegevens en aantallen blijven staan.
 * Alle teksten komen uit teksten.ts (Nederlands of Engels, met de taalknop rechtsboven).
 */

const field = `${inputClass} min-h-[44px]`;

/** Volgorde van de velden op de pagina: daar springen we heen bij versturen met fouten. */
const FIELD_ORDER: BusinessField[] = [
  "pakket", "withRaisins", "withoutRaisins", "donation", "street", "postalCode", "city", "area", "date",
  "company", "contact", "phone", "email", "invoiceEmail"
];

function StepHead({ n, title, sub, done }: { n: number; title: string; sub: ReactNode; done: boolean }) {
  const t = useT();
  return (
    <header className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-serif text-base font-bold tabular-nums ${done ? "bg-kerst-50 text-kerst-ink" : "bg-krent text-meel"}`}
      >
        {done ? "✓" : n}
      </span>
      <div>
        <h2 className="font-serif text-xl font-bold leading-tight text-krent">
          <span className="sr-only">{t.step(n)}</span>
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-muted">{sub}</p>
      </div>
    </header>
  );
}

function Step({ n, title, sub, done, children }: { n: number; title: string; sub: ReactNode; done: boolean; children: ReactNode }) {
  return (
    <Card className="grid gap-5">
      <StepHead n={n} title={title} sub={sub} done={done} />
      {children}
    </Card>
  );
}

function Field({ id, label, optional, hint, error, children }: { id: string; label: string; optional?: boolean; hint?: ReactNode; error?: string; children: ReactNode }) {
  const t = useT();
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className={fieldLabel}>
        {label}
        {optional ? <span className="ml-1 normal-case tracking-normal text-muted/80">{t.optional}</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-fout`} className="text-xs font-bold text-feest-ink">
          ! {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** De oliebol MET krenten (de tekening uit ui.tsx, met een paar krenten extra) en ZONDER: puur, alleen poedersuiker. */
const RAISINS = /<g fill="#261f1f">.*?<\/g>/;
const BOL_MET = OLIEBOL_SVG.replace(
  RAISINS,
  (g) => g.replace("</g>", '<ellipse cx="31" cy="50" rx="2.2" ry="1.6"/><ellipse cx="13" cy="30" rx="1.8" ry="1.3"/><ellipse cx="52" cy="28" rx="1.9" ry="1.4"/></g>')
);
const BOL_ZONDER = OLIEBOL_SVG.replace(RAISINS, "");

/** Kleine of grote oliebol, met of zonder krenten. */
function Bol({ krenten, className }: { krenten: boolean; className: string }) {
  return <span aria-hidden="true" className={`block shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`} dangerouslySetInnerHTML={{ __html: krenten ? BOL_MET : BOL_ZONDER }} />;
}

function Counter({
  id,
  label,
  sub,
  art,
  value,
  onChange,
  quick,
  max = 10000,
  error
}: {
  id: string;
  label: ReactNode;
  sub?: ReactNode;
  /** Met een tekening wordt het een tegel: plaatje boven, naam klein eronder, teller onderaan. */
  art?: ReactNode;
  value: number;
  onChange: (n: number) => void;
  quick: number[];
  max?: number;
  error?: string;
}) {
  const t = useT();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const set = (n: number) => onChange(Math.max(0, Math.min(max, n)));
  const step = `grid h-11 ${art ? "w-9 sm:w-11" : "w-11"} place-items-center rounded-md bg-vul text-xl font-bold text-krent transition hover:bg-vul-2 active:translate-y-px disabled:opacity-40`;
  const stepper = (
    <div className={`flex flex-wrap items-center ${art ? "justify-center gap-1 sm:gap-2" : "gap-1.5 sm:gap-2"}`}>
      <button type="button" className={`${step} ${art ? "bg-papier hover:bg-papier/70" : ""}`} onClick={() => set(value - 10)} disabled={value <= 0} aria-label={t.less10}>
        −
      </button>
      <input
        id={id}
        inputMode="numeric"
        value={draft}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-fout` : undefined}
        onChange={(e) => {
          const clean = e.target.value.replace(/\D/g, "").slice(0, 5);
          setDraft(clean);
          set(Number(clean) || 0);
        }}
        onBlur={() => setDraft(String(value))}
        className={`h-11 ${art ? "w-[3.25rem] text-lg sm:w-[4.5rem] sm:text-xl" : "w-[4.5rem] text-xl"} rounded-md border bg-papier text-center font-serif font-bold tabular-nums text-krent focus:border-krent focus:outline-none focus:ring-2 focus:ring-krent/20 ${error ? "border-feest" : "border-lijn-2"}`}
      />
      <button type="button" className={`${step} ${art ? "bg-papier hover:bg-papier/70" : ""}`} onClick={() => set(value + 10)} disabled={value >= max} aria-label={t.more10}>
        +
      </button>
      {quick.length ? (
        <span className={`flex gap-1.5 ${art ? "mt-1 basis-full justify-center" : "sm:ml-1"}`}>
          {quick.map((q) => (
            <button key={q} type="button" className={`${quickButton} min-h-[44px] min-w-[48px] px-2`} onClick={() => set(value + q)}>
              +{q}
            </button>
          ))}
        </span>
      ) : null}
    </div>
  );
  const fout = error ? (
    <p id={`${id}-fout`} className="text-xs font-bold text-feest-ink sm:col-span-2">
      ! {error}
    </p>
  ) : null;
  if (art) {
    return (
      <div className="grid content-start justify-items-center gap-2.5 rounded-md bg-vul px-2 pb-3.5 pt-4 text-center sm:px-3">
        {art}
        <label htmlFor={id} className="text-sm font-bold text-krent">
          {label}
        </label>
        {stepper}
        {fout}
      </div>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-6">
      <div>
        <label htmlFor={id} className="font-bold text-krent">
          {label}
        </label>
        {sub ? <p className="text-sm text-muted">{sub}</p> : null}
      </div>
      {stepper}
      {fout}
    </div>
  );
}

/** De verhouding met en zonder als balk, met de oliebolletjes erbij. */
function SplitBar({ met, zonder }: { met: number; zonder: number }) {
  const t = useT();
  const total = met + zonder;
  if (!total) return null;
  const pct = Math.round((met / total) * 100);
  return (
    <div className="grid gap-1.5" aria-label={t.splitAria(pct)}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-gouwe-100">
        <div className="bg-oliebol transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <Bol krenten className="h-4 w-4" />
          {t.pctWith(pct)}
        </span>
        <span className="flex items-center gap-1.5">
          {t.pctWithout(100 - pct)}
          <Bol krenten={false} className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}

/** Keuzetegel: zacht vlak, gekozen = krent. */
function Choice({ active, onClick, title, sub, aside }: { active: boolean; onClick: () => void; title: ReactNode; sub?: ReactNode; aside?: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`flex min-h-[56px] items-center justify-between gap-3 rounded-md px-3.5 py-2.5 text-left transition active:translate-y-px ${
        active ? "bg-krent text-meel shadow-zacht" : "bg-vul text-krent hover:bg-vul-2"
      }`}
    >
      <span className="grid">
        <span className="text-sm font-bold">{title}</span>
        {sub ? <span className={`text-xs ${active ? "text-meel/75" : "text-muted"}`}>{sub}</span> : null}
      </span>
      {aside ? <span className={`shrink-0 text-xs font-bold tabular-nums ${active ? "text-gouwe" : "text-oliebol"}`}>{aside}</span> : null}
    </button>
  );
}

function Check({ id, checked, onChange, children, error }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode; error?: string }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md bg-vul px-3.5 py-2.5 text-sm text-krent hover:bg-vul-2">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          className="h-[18px] w-[18px] shrink-0 accent-krent"
        />
        <span>{children}</span>
      </label>
      {error ? <p className="text-xs font-bold text-feest-ink">! {error}</p> : null}
    </div>
  );
}

/** Dagknoppen per maand. Te snel = doorgestreept en niet te kiezen. */
function DayPicker({ days, value, onChange, info, error }: { days: string[]; value: string; onChange: (d: string) => void; info: BusinessInfo; error?: string }) {
  const t = useT();
  const months = new Map<string, string[]>();
  for (const d of days) months.set(d.slice(0, 7), [...(months.get(d.slice(0, 7)) ?? []), d]);
  const anyClosed = days.some((d) => !dayOpen(d, info));
  return (
    <div id="f-date" tabIndex={-1} className="grid gap-3 focus:outline-none" role="radiogroup" aria-label={t.deliveryDay} aria-invalid={error ? true : undefined}>
      {[...months].map(([key, list]) => {
        const month = new Date(`${key}-15T12:00:00`).toLocaleDateString(t.locale, { month: "long", year: "numeric" });
        return (
          <div key={key} className="grid gap-1.5">
            <p className="text-xs font-bold text-oliebol">
              {month.charAt(0).toUpperCase() + month.slice(1)}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {list.map((d) => {
                const open = dayOpen(d, info);
                const active = value === d;
                const date = new Date(`${d}T12:00:00`);
                return (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${t.longDay(d)}${open ? "" : t.tooSoon}`}
                    title={open ? t.longDay(d) : t.tooSoonTitle(t.lead(info))}
                    disabled={!open}
                    onClick={() => onChange(d)}
                    className={`grid min-h-[52px] min-w-[52px] place-items-center rounded-md px-2 py-1.5 leading-none transition active:translate-y-px disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                      active ? "bg-krent text-meel shadow-zacht" : "bg-vul text-krent hover:bg-vul-2"
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${active ? "text-meel/75" : "text-muted"}`}>
                      {date.toLocaleDateString(t.locale, { weekday: "short" }).replace(".", "")}
                    </span>
                    <span className="font-serif text-lg font-bold tabular-nums">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {anyClosed ? <p className="text-xs text-muted">{t.crossedOut(t.lead(info))}</p> : null}
      {error ? <p className="text-xs font-bold text-feest-ink">! {error}</p> : null}
    </div>
  );
}

/** Rijtje oudjes uit de discozaal: één per tien oliebollen, de rest als getal. Met `dance` gaan ze kort na elkaar swingen. */
function Oudjes({ count, dance = false }: { count: number; dance?: boolean }) {
  const t = useT();
  const shown = Math.min(count, 7);
  return (
    <span className="flex items-end">
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={`${i ? "-ml-1" : ""} ${dance ? "oc-dance" : ""}`} style={dance ? { animationDelay: `${120 + i * 55}ms` } : undefined}>
          <DiscoOudje cast={i} className="h-10" />
        </span>
      ))}
      {count > shown ? (
        <span className="ml-1 self-center rounded-full bg-gouwe-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-gouwe-ink">+{t.num(count - shown)}</span>
      ) : null}
    </span>
  );
}

const SPARKS = ["bg-feest", "bg-gouwe", "bg-kerst", "bg-gouwe"];

/** Oliebollen en confetti die als vuurwerk uit de medaille ploffen. Goud krijgt er een dubbele. */
function Burst({ big }: { big: boolean }) {
  const n = big ? 26 : 14;
  return (
    <span className="oc-burst" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        // Big ones get a second, wider ring a beat later.
        const ring = big && i >= n / 2 ? 1 : 0;
        const inRing = big ? n / 2 : n;
        const angle = ((i % inRing) / inRing) * Math.PI * 2 + ring * 0.25;
        const dist = (ring ? 92 : 58) * (0.75 + ((i * 37) % 10) / 30);
        const bol = i % 4 === 0;
        const style = {
          "--x": `${Math.round(Math.cos(angle) * dist)}px`,
          "--y": `${Math.round(Math.sin(angle) * dist * 0.8 - 14)}px`,
          "--r": `${(i * 67) % 360}deg`,
          animationDelay: `${ring * 180 + (i % 3) * 30}ms`
        } as CSSProperties;
        return bol ? (
          <span key={i} className="oc-spark-bol" style={style} dangerouslySetInnerHTML={{ __html: OLIEBOL_SVG }} />
        ) : (
          <span key={i} className={SPARKS[i % SPARKS.length]} style={style} />
        );
      })}
    </span>
  );
}

/** Metaalkleuren van de medailles; net als bij de poppetjes alleen voor deze tekening. */
const MEDAL: Record<BusinessPackageKey, [string, string, string]> = {
  brons: ["#e7b184", "#b8743f", "#83491f"],
  zilver: ["#f4f2ec", "#c9c4b8", "#868072"],
  goud: ["#f7e6a0", "#dcc05d", "#a3842a"]
};

/** Medaille aan een lint in feest-rood: Brons, Zilver of Goud. */
function Medal({ tier, className = "" }: { tier: BusinessPackageKey; className?: string }) {
  const id = useId().replace(/:/g, "");
  const [light, base, dark] = MEDAL[tier];
  return (
    <svg viewBox="0 0 44 54" width="44" height="54" aria-hidden="true" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id={`m${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <path d="M9 0h10l6 16h-10z" fill="#bf4a30" />
      <path d="M35 0H25l-6 16h10z" fill="#d05438" />
      <circle cx="22" cy="35" r="17" fill={`url(#m${id})`} />
      <circle cx="22" cy="35" r="12.5" fill="none" stroke={light} strokeOpacity="0.75" strokeWidth="1.5" />
      <path d="M22 26.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill={dark} fillOpacity="0.55" />
    </svg>
  );
}

/**
 * Een pakketkaart, zo rustig mogelijk: naam en bereik, hoeveel ouderen er dansen, drie korte extra's en de prijs met
 * één knop. Geen tussenkopjes; hogere pakketten beginnen met "Alles van Brons". Goud is de donkere kaart.
 */
function PackageCard({ pkg, info, below, active, tip, onPick }: { pkg: BusinessPackage; info: BusinessInfo; below?: BusinessPackage; active: boolean; tip: boolean; onPick: () => void }) {
  // Counts the picks, so the little party plays again each time this card is chosen.
  const [play, setPlay] = useState(0);
  const t = useT();
  const name = t.tier[pkg.key];
  const gold = pkg.key === "goud";
  const ouderen = Math.floor(pkg.oliebollen / 10);
  const next = nextTier(pkg.oliebollen, info);
  const ink = gold ? "text-meel" : "text-krent";
  const soft = gold ? "text-meel/70" : "text-muted";
  const check = gold ? "text-gouwe" : "text-kerst-ink";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={t.cardAria(name, t.range(pkg, info), ouderen, t.euro(pkg.oliebollen * info.price))}
      onClick={() => {
        if (!active) setPlay((n) => n + 1);
        onPick();
      }}
      className={`relative flex flex-col gap-4 rounded-kaart p-4 text-left transition duration-200 sm:p-5 ${gold ? "bg-krent" : "bg-papier"} ${
        active ? `shadow-zwevend ring-2 ${gold ? "ring-gouwe" : "ring-krent"}` : "shadow-zacht hover:-translate-y-0.5 hover:shadow-zwevend"
      }`}
    >
      {tip ? (
        <span className="absolute -top-2.5 right-4 -rotate-3 rounded bg-gouwe px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-krent shadow-zacht">{t.tip}</span>
      ) : null}
      <span className="flex items-center gap-3">
        <span className="relative">
          <Medal key={`medaille-${play}`} tier={pkg.key} className={play ? "oc-medal" : ""} />
          {play ? <Burst key={`vuurwerk-${play}`} big={gold} /> : null}
        </span>
        <span className="grid">
          <span className={`font-display text-[34px] uppercase leading-none tracking-wide ${gold ? "text-gouwe" : "text-krent"}`}>{name}</span>
          <span className={`text-xs tabular-nums ${soft}`}>{t.rangeShort(pkg, info)}</span>
        </span>
      </span>

      <span className="grid gap-1">
        <span className="flex items-end gap-2">
          <span className={`font-serif text-[40px] font-bold leading-none tabular-nums ${ink}`}>
            {ouderen}
            {next ? "" : "+"}
          </span>
          <span className={`text-sm font-bold leading-tight ${ink}`}>
            {t.cardSeniors[0]}
            <br />
            {t.cardSeniors[1]}
          </span>
        </span>
        <span className="oc-floor flex h-11 items-end pb-1.5">
          <Oudjes key={play} count={ouderen} dance={play > 0} />
        </span>
      </span>

      <span className="grid gap-1.5 text-sm leading-snug">
        {below ? (
          <span className={`flex gap-2 ${soft}`}>
            <span aria-hidden="true" className={check}>
              ✓
            </span>
            {t.allOf(t.tier[below.key])}
          </span>
        ) : null}
        {t.perksShort[pkg.key].map((perk) => (
          <span key={perk} className={`flex gap-2 ${ink}`}>
            <span aria-hidden="true" className={check}>
              ✓
            </span>
            {perk}
          </span>
        ))}
      </span>

      <span className={`mt-auto grid gap-3 border-t pt-3 ${gold ? "border-meel/15" : "border-lijn"}`}>
        <span className="grid gap-1">
          <span className="flex flex-wrap items-baseline gap-x-1.5">
            <span className={`text-xs ${soft}`}>{t.from}</span>
            <span className={`font-serif text-2xl font-bold leading-none tabular-nums ${ink}`}>{t.euroRound(pkg.oliebollen * info.price)}</span>
            <span className={`text-xs ${soft}`}>{t.exclVatShort}</span>
          </span>
          <span className={`text-xs ${soft}`}>{t.fits(t.num(colleaguesFor(pkg.oliebollen)), !next)}</span>
        </span>
        <span
          className={`inline-flex min-h-[44px] items-center justify-center rounded-md px-4 text-sm font-bold transition ${
            gold ? (active ? "bg-gouwe text-krent" : "bg-meel/10 text-gouwe") : active ? "bg-krent text-meel" : "bg-vul text-krent"
          }`}
        >
          {active ? t.chosen : t.choose(name)}
        </span>
      </span>
    </button>
  );
}

/**
 * Onder de aantallen: bij welk pakket je nu zit. Zak je onder het pakket dat je koos, dan zeggen we dat eerlijk;
 * zit je vlak onder het volgende pakket (vanaf 75%), dan een duwtje met wat je erbij krijgt.
 */
function TierStatus({ input, info, onSet }: { input: BusinessOrderInput; info: BusinessInfo; onSet: (n: number) => void }) {
  const t = useT();
  const total = input.withRaisins + input.withoutRaisins;
  const tier = tierFor(total, info);
  const picked = info.packages.find((p) => p.key === input.pakket);
  const next = nextTier(total, info);
  if (!tier) return null;
  const fell = picked && picked.oliebollen > total ? picked : undefined;
  const nudge = !fell && next && total >= next.oliebollen * 0.75 ? next : undefined;
  const target = fell ?? nudge;
  return (
    <div className="grid gap-2 rounded-md bg-vul px-3.5 py-3 text-sm">
      <p className="flex items-center gap-2 text-krent">
        <Medal tier={tier.key} className="h-7 w-6" />
        <span>
          {t.tierIs(t.num(total))}
          <b>{t.tier[tier.key]}</b>
          {next ? t.upTo(t.num(next.oliebollen - 1)) : ""}.
        </span>
      </p>
      {target ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="max-w-md text-oliebol">
            {fell ? (
              t.fell(t.num(fell.oliebollen), t.tier[fell.key], t.tier[tier.key])
            ) : (
              t.nudge(t.num(target.oliebollen - total), t.tier[target.key], t.perks[target.key][0], t.num(Math.floor(target.oliebollen / 10) - Math.floor(total / 10)))
            )}
          </p>
          <button type="button" className={`${secondaryButton} min-h-[44px] bg-papier`} onClick={() => onSet(target.oliebollen)}>
            {t.makeIt(t.num(target.oliebollen))}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Line({ label, value, strong = false, muted = false }: { label: ReactNode; value: ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "font-bold text-krent" : muted ? "text-muted" : "text-oliebol"}`}>
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0 tabular-nums">{value}</dd>
    </div>
  );
}

function Summary({ input, totals, info }: { input: BusinessOrderInput; totals: BusinessTotals; info: BusinessInfo }) {
  const t = useT();
  const short = Math.max(0, info.minimum - totals.oliebollen);
  const pkg = chosenPackage(input, info);
  return (
    <dl className="grid gap-1.5 text-sm">
      {pkg ? (
        <div className="mb-1 flex items-center justify-between gap-3">
          <dt className="text-oliebol">{t.package}</dt>
          <dd className="flex items-center gap-1.5 font-bold text-krent">
            {pkg ? <Medal tier={pkg.key} className="h-6 w-5" /> : null}
            {t.tier[pkg.key]}
          </dd>
        </div>
      ) : null}
      <Line label={t.withRaisins} value={t.num(input.withRaisins)} />
      <Line label={t.withoutRaisins} value={t.num(input.withoutRaisins)} />
      <div className="my-1.5 border-t border-lijn" />
      <Line label={t.bollenLine(t.num(totals.oliebollen), t.euro(info.price))} value={t.euro(totals.bollen)} />
      <Line label={input.area ? t.deliveryTo(t.area[input.area]) : t.delivery} value={input.area ? t.euro(totals.delivery) : "–"} />
      {totals.surcharge ? <Line label={t.moment[input.moment]} value={t.euro(totals.surcharge)} /> : null}
      <Line label={t.subtotal} value={t.euro(totals.subtotal)} muted />
      <Line label={t.vat(Math.round(info.vatRate * 100))} value={t.euro(totals.vat)} muted />
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <dt className="font-bold text-krent">{t.total}</dt>
        <dd className="font-serif text-2xl font-bold tabular-nums text-krent">{t.euro(totals.total)}</dd>
      </div>
      {totals.donation ? (
        <>
          <Line label={t.donationLine(t.num(input.donation))} value={t.euro(totals.donation)} />
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-bold text-krent">{t.onInvoice}</dt>
            <dd className="font-serif text-xl font-bold tabular-nums text-krent">{t.euro(totals.invoice)}</dd>
          </div>
        </>
      ) : null}
      {short > 0 ? (
        <p className="mt-1 rounded-md bg-gouwe-50 px-2.5 py-1.5 text-xs text-gouwe-ink">
          {t.short(t.num(short), info.minimum)}
        </p>
      ) : null}
    </dl>
  );
}

/** NL of EN, rechtsboven in de kopbalk van het bestelformulier. Zonder vlaggen: een taal is geen land. */
export function LangSwitch() {
  const lang = useLang();
  const t = useT();
  return (
    <Segmented<Lang>
      label={t.switchLabel}
      value={lang}
      onChange={setLang}
      options={[
        ["nl", <><span aria-hidden="true">NL</span><span lang="nl" className="sr-only">Nederlands</span></>],
        ["en", <><span aria-hidden="true">EN</span><span lang="en" className="sr-only">English</span></>]
      ]}
    />
  );
}

interface Done {
  id: string;
  warning?: string;
  input: BusinessOrderInput;
  totals: BusinessTotals;
}

export function BusinessOrderPage() {
  const t = useT();
  const lang = useLang();
  // The page says which language it is in, for screen readers and translation tools; the rest of the site is Dutch.
  useEffect(() => {
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = "nl";
    };
  }, [lang]);
  const [info, setInfo] = useState<BusinessInfo>(BUSINESS_DEFAULTS);
  const [input, setInput] = useState<BusinessOrderInput>(emptyBusinessInput);
  const [sameInvoice, setSameInvoice] = useState(true);
  const [areaChosen, setAreaChosen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const [website, setWebsite] = useState("");
  const [summaryVisible, setSummaryVisible] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    backend
      .getBusinessInfo()
      .then((next) => live && setInfo(next))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  // The bottom bar on a phone hides once the overview itself is in view.
  useEffect(() => {
    const el = summaryRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setSummaryVisible(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [done]);

  const order: BusinessOrderInput = { ...input, invoiceEmail: sameInvoice ? input.email : input.invoiceEmail };
  const totals = businessTotals(order, info);
  const errors = validateBusiness(order, info, new Date(), t.validation);
  // With the same address, a wrong e-mail is one mistake, not two.
  if (sameInvoice) delete errors.invoiceEmail;
  const shown = showErrors ? errors : {};
  const missing = FIELD_ORDER.filter((f) => errors[f]);

  function update<K extends keyof BusinessOrderInput>(key: K, value: BusinessOrderInput[K]) {
    setInput((prev) => {
      const next = { ...prev, [key]: value };
      // Area follows the town until someone picks it themselves.
      if (key === "city" && !areaChosen) next.area = guessArea(String(value));
      return next;
    });
  }

  /** Pakket kiezen: het aantal wordt het pakketaantal, verdeeld 70% met en 30% zonder. Zit je er al in, dan blijft je aantal. */
  function pickPackage(p: BusinessPackage) {
    if (chosenPackage(input, info)?.key === p.key) {
      setInput((prev) => ({ ...prev, pakket: p.key }));
      return;
    }
    setInput((prev) => ({ ...prev, pakket: p.key, ...packageSplit(p.oliebollen) }));
  }

  /** Naar een pakketaantal (het duwtje of terug naar je pakket): de verdeling blijft ongeveer gelijk. */
  function setTotal(n: number) {
    setInput((prev) => {
      const total = prev.withRaisins + prev.withoutRaisins;
      const withRaisins = total ? Math.min(n, Math.round((n * prev.withRaisins) / total / 10) * 10) : packageSplit(n).withRaisins;
      const tier = tierFor(n, info);
      return { ...prev, pakket: tier?.key ?? prev.pakket, withRaisins, withoutRaisins: n - withRaisins };
    });
  }

  /** Zelf samenstellen: de aantallen van het pakket blijven staan als begin. */
  function composeYourself() {
    setInput((prev) => ({ ...prev, pakket: "zelf" }));
    window.setTimeout(() => document.getElementById("f-withRaisins")?.focus({ preventScroll: true }), 30);
    window.setTimeout(() => document.getElementById("samenstellen")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 30);
  }

  const pkg = chosenPackage(order, info);
  const step1 = !errors.pakket && !errors.withRaisins && !errors.withoutRaisins && !errors.donation;
  const step2 = !(["street", "postalCode", "city", "area", "date"] as BusinessField[]).some((f) => errors[f]);
  const step3 = !(["company", "contact", "phone", "email", "invoiceEmail"] as BusinessField[]).some((f) => errors[f]);

  async function submit() {
    setShowErrors(true);
    setError("");
    if (missing.length) {
      const el = document.getElementById(`f-${missing[0]}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }
    setBusy(true);
    try {
      // The package is the one the number reaches, whatever card was clicked.
      const clean: BusinessOrderInput = { ...order, fulfilment: "bezorgen", pakket: tierFor(totals.oliebollen, info)?.key ?? "zelf", postalCode: formatPostcode(order.postalCode) };
      const { id, warning } = await backend.submitBusinessOrder({ ...clean, website });
      setDone({ id, warning, input: clean, totals });
      window.scrollTo({ top: 0, behavior: "smooth" });
      rollOliebol();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  /** Volgend adres: gegevens en aantallen blijven, adres en dag zijn leeg. */
  function anotherAddress() {
    if (!done) return;
    setInput({ ...done.input, street: "", postalCode: "", city: "", area: "", date: "", remark: "" });
    setAreaChosen(false);
    setShowErrors(false);
    setDone(null);
    window.setTimeout(() => document.getElementById("stap-2")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function startOver() {
    setInput(emptyBusinessInput());
    setSameInvoice(true);
    setAreaChosen(false);
    setShowErrors(false);
    setDone(null);
  }

  const mailLink = `mailto:${info.email}?subject=${encodeURIComponent(t.mailSubject)}`;

  // Proef met de letter Jost: #/bestellen?letter=jost.
  const jost = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("letter") === "jost";

  if (done) return <Confirmation done={done} info={info} onAnother={anotherAddress} onRestart={startOver} />;

  return (
    <div className={`grid gap-6 pb-24 lg:pb-0 ${jost ? "oc-jost" : ""}`}>
      <section className="grid gap-4 pt-2">
        <div className="grid gap-2">
          <h1 className="max-w-3xl font-display text-[40px] uppercase leading-[0.95] tracking-wide text-krent sm:text-[56px]">
            {t.title}
          </h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-oliebol">
            {t.intro}
          </p>
        </div>
        {/* Prijs, minimum en de ruil: 10 oliebollen = 1 oudere, met het oudje ernaast op eigen benen, niet over de tekst. */}
        <dl className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.3fr)] gap-3 py-1 sm:max-w-2xl sm:grid-cols-3 sm:gap-6">
          {(
            [
              [t.euro(info.price), t.perOliebol(Math.round(info.vatRate * 100))],
              [String(info.minimum), t.minimum]
            ] as Array<[string, string]>
          ).map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="font-serif text-2xl font-bold leading-tight tabular-nums text-krent sm:text-[28px]">{value}</dd>
              <dd className="text-xs leading-snug text-muted">{label}</dd>
            </div>
          ))}
          <div className="flex items-end gap-1.5 sm:gap-2.5">
            <div className="min-w-0">
              <dt className="sr-only">{t.tenIsOne}</dt>
              <dd aria-hidden="true" className="flex items-center gap-1 font-serif text-2xl font-bold leading-tight tabular-nums text-krent sm:text-[28px]">
                10
                <Bol krenten className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="font-normal text-muted">=</span>1
              </dd>
              <dd className="text-xs leading-snug text-muted">{t.seniorOnFloor}</dd>
            </div>
            <DiscoOudje className="h-12 sm:h-14" />
          </div>
        </dl>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          className="grid gap-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <section className="grid gap-4" aria-labelledby="stap-1-titel">
            <div id="stap-1-titel">
              <StepHead
                n={1}
                title={t.step1}
                sub={t.step1Sub(BUSINESS_PER_COLLEAGUE)}
                done={step1 && totals.oliebollen > 0}
              />
            </div>
            <div id="f-pakket" tabIndex={-1} role="radiogroup" aria-label={t.packages} className="grid gap-4 pt-1 focus:outline-none md:grid-cols-3 md:gap-3 xl:gap-4">
              {info.packages.map((p, i) => (
                <PackageCard key={p.key} pkg={p} info={info} below={info.packages[i - 1]} active={pkg?.key === p.key} tip={i === 1} onPick={() => pickPackage(p)} />
              ))}
            </div>
            {shown.pakket ? <p className="text-xs font-bold text-feest-ink">! {shown.pakket}</p> : null}
            <p className="text-center text-sm text-muted">
              {t.otherAmount}{" "}
              <button
                type="button"
                className="min-h-[44px] font-bold text-krent underline decoration-lijn-2 underline-offset-4 hover:decoration-krent"
                aria-pressed={input.pakket === "zelf"}
                onClick={composeYourself}
              >
                {t.composeButton}
              </button>
            </p>

            {input.pakket ? (
              <Card className="grid gap-5">
                <div id="samenstellen" className="grid scroll-mt-6 gap-5">
                  <div>
                    <h3 className="font-serif text-lg font-bold leading-tight text-krent">{pkg && input.pakket !== "zelf" ? t.splitTitle : t.composeTitle}</h3>
                    <p className="mt-0.5 text-sm text-muted">
                      {pkg && input.pakket !== "zelf"
                        ? t.splitSub
                        : t.composeSub(info.minimum, t.num(info.maximum))}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <Counter
                      id="f-withRaisins"
                      label={t.withRaisins}
                      art={<Bol krenten className="h-16 w-16 sm:h-20 sm:w-20" />}
                      value={input.withRaisins}
                      onChange={(n) => update("withRaisins", n)}
                      quick={[50, 100]}
                      max={info.maximum - input.withoutRaisins}
                      error={shown.withRaisins}
                    />
                    <Counter
                      id="f-withoutRaisins"
                      label={t.withoutRaisins}
                      art={<Bol krenten={false} className="h-16 w-16 sm:h-20 sm:w-20" />}
                      value={input.withoutRaisins}
                      onChange={(n) => update("withoutRaisins", n)}
                      quick={[50, 100]}
                      max={info.maximum - input.withRaisins}
                      error={shown.withoutRaisins}
                    />
                  </div>
                  <SplitBar met={input.withRaisins} zonder={input.withoutRaisins} />
                  <TierStatus input={order} info={info} onSet={setTotal} />
                </div>
                <div className="grid gap-4 border-t border-lijn pt-5">
                  <Counter
                    id="f-donation"
                    label={t.donate}
                    sub={t.donateSub(t.euroRound(info.donationPrice * 10))}
                    value={input.donation}
                    onChange={(n) => update("donation", n)}
                    quick={[10, 50]}
                    error={shown.donation}
                  />
                  <Check id="f-flyers" checked={input.flyers} onChange={(v) => update("flyers", v)}>
                    <b>{t.flyers}</b> <span className="text-muted">· {t.flyersSub}</span>
                  </Check>
                </div>
              </Card>
            ) : null}
          </section>

          <div id="stap-2" className="scroll-mt-6">
            <Step n={2} title={t.step2} sub={t.step2Sub} done={step2 && !!input.date}>
              <div className="grid gap-3">
                <Field id="f-street" label={t.street} error={shown.street}>
                  <input id="f-street" className={field} autoComplete="street-address" value={input.street} onChange={(e) => update("street", e.target.value)} placeholder="Keizersgracht 210" />
                </Field>
                <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
                  <Field id="f-postalCode" label={t.postalCode} error={shown.postalCode}>
                    <input
                      id="f-postalCode"
                      className={field}
                      autoComplete="postal-code"
                      value={input.postalCode}
                      onChange={(e) => update("postalCode", e.target.value.toUpperCase())}
                      onBlur={(e) => update("postalCode", formatPostcode(e.target.value))}
                      placeholder="1016 DZ"
                    />
                  </Field>
                  <Field id="f-city" label={t.city} error={shown.city}>
                    <input id="f-city" className={field} autoComplete="address-level2" value={input.city} onChange={(e) => update("city", e.target.value)} placeholder="Amsterdam" />
                  </Field>
                </div>
              </div>

              <div className="grid gap-2">
                <p className={fieldLabel}>{t.deliveryCost}</p>
                <div id="f-area" tabIndex={-1} role="radiogroup" aria-label={t.deliveryCost} className="grid gap-2 focus:outline-none sm:grid-cols-2">
                  {(["regio", "buiten"] as BusinessArea[]).map((a) => (
                    <Choice
                      key={a}
                      active={input.area === a}
                      onClick={() => {
                        setAreaChosen(true);
                        update("area", a);
                      }}
                      title={t.area[a]}
                      sub={t.areaSub[a]}
                      aside={`${t.euro(info.fees[a])}`}
                    />
                  ))}
                </div>
                {shown.area ? <p className="text-xs font-bold text-feest-ink">! {shown.area}</p> : <p className="text-xs text-muted">{t.areaHint}</p>}
              </div>

              <div className="grid gap-2">
                <p className={fieldLabel}>{t.whichDay}</p>
                <DayPicker days={info.deliveryDays} value={input.date} onChange={(d) => update("date", d)} info={info} error={shown.date} />
                <p className="text-xs text-muted">
                  {t.otherMoment}{" "}
                  <a className="font-bold text-oliebol underline decoration-lijn-2 underline-offset-4 hover:text-krent" href={mailLink}>
                    {t.mailUs}
                  </a>
                  .
                </p>
              </div>

              <div className="grid gap-2">
                <p className={fieldLabel}>{t.whatTime}</p>
                <div role="radiogroup" aria-label={t.deliveryMoment} className="grid gap-2 sm:grid-cols-3">
                  {(["regulier", "voor10", "voor9"] as BusinessMoment[]).map((m) => (
                    <Choice
                      key={m}
                      active={input.moment === m}
                      onClick={() => update("moment", m)}
                      title={t.moment[m]}
                      sub={info.surcharges[m] ? t.surcharge(t.euro(info.surcharges[m])) : t.noSurcharge}
                    />
                  ))}
                </div>
              </div>

              <p className="rounded-md bg-vul px-3.5 py-2.5 text-sm text-oliebol">
                <b className="text-krent">{t.moreAddresses}</b> {t.moreAddressesText}
              </p>
            </Step>
          </div>

          <Step n={3} title={t.step3} sub={t.step3Sub} done={step3}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="f-company" label={t.company} error={shown.company}>
                <input id="f-company" className={field} autoComplete="organization" value={input.company} onChange={(e) => update("company", e.target.value)} />
              </Field>
              <Field id="f-contact" label={t.contact} error={shown.contact}>
                <input id="f-contact" className={field} autoComplete="name" value={input.contact} onChange={(e) => update("contact", e.target.value)} />
              </Field>
              <Field id="f-phone" label={t.phone} hint={t.phoneHint} error={shown.phone}>
                <input id="f-phone" type="tel" className={field} autoComplete="tel" value={input.phone} onChange={(e) => update("phone", e.target.value)} />
              </Field>
              <Field id="f-email" label={t.email} hint={t.emailHint} error={shown.email}>
                <input id="f-email" type="email" className={field} autoComplete="email" value={input.email} onChange={(e) => update("email", e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 border-t border-lijn pt-5">
              <Check id="f-sameInvoice" checked={sameInvoice} onChange={setSameInvoice}>
                {t.sameInvoice}
              </Check>
              {!sameInvoice ? (
                <Field id="f-invoiceEmail" label={t.invoiceEmail} error={shown.invoiceEmail}>
                  <input id="f-invoiceEmail" type="email" className={field} value={input.invoiceEmail} onChange={(e) => update("invoiceEmail", e.target.value)} placeholder={t.invoiceEmailPlaceholder} />
                </Field>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="f-invoiceAddress" label={t.invoiceAddress} optional hint={t.invoiceAddressHint}>
                  <textarea id="f-invoiceAddress" rows={2} className={inputClass} value={input.invoiceAddress} onChange={(e) => update("invoiceAddress", e.target.value)} />
                </Field>
                <Field id="f-reference" label={t.reference} optional hint={t.referenceHint}>
                  <input id="f-reference" className={field} value={input.reference} onChange={(e) => update("reference", e.target.value)} />
                </Field>
              </div>
              <Field id="f-remark" label={t.remark} optional hint={t.remarkHint}>
                <textarea id="f-remark" rows={3} className={inputClass} value={input.remark} onChange={(e) => update("remark", e.target.value)} />
              </Field>
              {/* Honeypot: invisible for people, bots fill it in. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="f-website">Website</label>
                <input id="f-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              {t.privacy}
            </p>
          </Step>
        </form>

        <aside ref={summaryRef} id="overzicht" className="grid scroll-mt-6 gap-4 lg:sticky lg:top-6">
          <Card className="grid gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-xl font-bold text-krent">{t.yourOrder}</h2>
              {input.date ? <span className="text-xs font-bold text-oliebol">{t.longDay(input.date)}</span> : null}
            </div>
            <Summary input={order} totals={totals} info={info} />
            <div className="grid gap-2 border-t border-lijn pt-4">
              {totals.ouderen > 0 ? (
                <>
                  <Oudjes count={totals.ouderen} />
                  <p className="text-sm text-krent">
                    {t.goodFor} <b>{t.num(totals.ouderen)}</b> {t.seniors(totals.ouderen)} {t.onFloor}
                    {input.donation ? t.donated(t.num(input.donation)) : "."}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">{t.emptyOverview}</p>
              )}
            </div>
            {error ? <Notice tone="error">{error}</Notice> : null}
            {showErrors && missing.length ? (
              <Notice tone="warning">
                {t.missing(missing.length)}
                {missing.map((f, i) => (
                  <span key={f}>
                    {i ? ", " : ""}
                    <a
                      className="font-bold underline underline-offset-4"
                      href={`#f-${f}`}
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById(`f-${f}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                        document.getElementById(`f-${f}`)?.focus({ preventScroll: true });
                      }}
                    >
                      {t.fields[f]}
                    </a>
                  </span>
                ))}
                .
              </Notice>
            ) : null}
            <button type="button" className={`${primaryButton} min-h-[48px] w-full text-[15px]`} disabled={busy} onClick={() => void submit()}>
              {busy ? t.sending : totals.oliebollen >= info.minimum ? t.orderN(t.num(totals.oliebollen)) : t.placeOrder}
            </button>
            <p className="text-center text-xs leading-relaxed text-muted">
              {t.payLater}
            </p>
          </Card>
          <p className="px-1 text-xs leading-relaxed text-muted">
            {t.forYourself}{" "}
            <a className="font-bold text-oliebol underline decoration-lijn-2 underline-offset-4 hover:text-krent" href="https://www.omacobysoliebollenbar.nl" target="_blank" rel="noreferrer">
              omacobysoliebollenbar.nl
            </a>
            .
          </p>
        </aside>
      </div>

      {/* Telefoon: het totaal blijft onderin in beeld tot het overzicht zelf in beeld is. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-30 border-t border-lijn bg-papier/95 px-4 py-2.5 backdrop-blur transition duration-200 lg:hidden ${
          summaryVisible ? "pointer-events-none translate-y-full opacity-0" : ""
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs text-muted">
              {pkg ? t.tier[pkg.key] : `${t.num(totals.oliebollen)} oliebollen`} · {t.barSeniors(t.num(totals.ouderen))}
            </p>
            <p className="font-serif text-lg font-bold tabular-nums text-krent">{t.euro(totals.invoice)}</p>
          </div>
          <button type="button" className={`${primaryButton} shrink-0 whitespace-nowrap`} onClick={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            {t.toOverview}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Boven zo veel ouderen wordt de discozaal een mierenhoop; dan het rijtje oudjes met het getal. */
const HALL_MAX_OUDJES = 300;

function Confirmation({ done, info, onAnother, onRestart }: { done: Done; info: BusinessInfo; onAnother: () => void; onRestart: () => void }) {
  const t = useT();
  const { input, totals } = done;
  const pkg = chosenPackage(input, info);
  const rows: Array<[string, ReactNode]> = [
    [t.package, pkg ? <span className="inline-flex items-center gap-1.5 font-bold text-krent"><Medal tier={pkg.key} className="h-6 w-5" />{t.tier[pkg.key]}</span> : t.custom],
    [t.rowOliebollen, t.splitShort(t.num(totals.oliebollen), t.num(input.withRaisins), t.num(input.withoutRaisins))],
    ...(input.donation ? ([[t.rowDonated, t.rowDonatedValue(t.num(input.donation))]] as Array<[string, ReactNode]>) : []),
    [t.rowVisit, <>{t.longDay(input.date)}, {t.moment[input.moment].toLowerCase()}<br />{input.street}, {input.postalCode} {input.city}</>],
    [t.onInvoice, <b className="text-krent">{t.euro(totals.invoice)}</b>]
  ];
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5 py-4">
      <Card className="grid gap-5 sm:p-7">
        <div className="grid justify-items-start gap-4">
          <Sticker tone="kerst" slap>
            {t.thanks}
          </Sticker>
          <div>
            <h1 className="font-serif text-[28px] font-bold leading-tight text-krent">
              {totals.ouderen > 0 ? t.doneTitle(t.num(totals.ouderen)) : t.doneTitleEmpty}
            </h1>
            <p className="mt-1 text-[15px] leading-relaxed text-oliebol">
              {t.doneText(input.company)}
              <b className="text-krent">{input.email}</b>.
            </p>
          </div>
        </div>
        {totals.ouderen > 0 ? (
          <div className="grid gap-2">
            {totals.ouderen <= HALL_MAX_OUDJES ? (
              <DiscoHall oudjes={totals.ouderen} sign={t.hallSign} unit={t.hallUnit} label={t.hallAria} />
            ) : (
              <div className="flex items-center gap-3 rounded-md bg-gouwe-50 px-3.5 py-3">
                <Oudjes count={totals.ouderen} dance />
                <span className="font-serif text-2xl font-bold tabular-nums text-krent">{t.num(totals.ouderen)}</span>
              </div>
            )}
            <p className="text-xs text-muted">
              {t.hallCaption(totals.ouderen, input.company)}
            </p>
          </div>
        ) : null}
        <div className="border-y border-lijn py-4">
          <p className={fieldLabel}>{t.orderNumber}</p>
          <p className="font-serif text-3xl font-bold tabular-nums text-krent">{done.id}</p>
        </div>
        <dl className="grid gap-2.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
              <dt className="text-muted">{label}</dt>
              <dd className="text-oliebol">{value}</dd>
            </div>
          ))}
        </dl>
        {pkg ? (
          <div className="grid gap-1.5 border-t border-lijn pt-4 text-sm">
            <p className={fieldLabel}>{t.youGetWith(t.tier[pkg.key])}</p>
            {info.packages.filter((p) => p.oliebollen <= pkg.oliebollen).flatMap((p) => t.perks[p.key]).map((perk) => (
              <p key={perk} className="flex gap-2 text-krent">
                <span aria-hidden="true" className="text-kerst-ink">
                  ✓
                </span>
                {perk}
              </p>
            ))}
          </div>
        ) : null}
        {done.warning ? <Notice tone="warning">{done.warning} {t.keepNumber}</Notice> : null}
        {backend.kind === "demo" ? <Notice tone="info">{t.demo}</Notice> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primaryButton} onClick={onAnother}>
            {t.another}
          </button>
          <button type="button" className={ghostButton} onClick={onRestart}>
            {t.newOrder}
          </button>
        </div>
      </Card>
      <p className="text-center text-xs text-muted">
        {t.questions}{" "}
        <a className="font-bold text-oliebol underline decoration-lijn-2 underline-offset-4" href={`mailto:${info.email}`}>
          {info.email}
        </a>{" "}
        {t.orCall}{" "}
        <a className="font-bold text-oliebol underline decoration-lijn-2 underline-offset-4" href={`tel:${info.phone.replace(/\s/g, "")}`}>
          {info.phone}
        </a>{" "}
        {t.mentionNumber}
      </p>
    </div>
  );
}
