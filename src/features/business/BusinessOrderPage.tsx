import { useEffect, useRef, useState, type ReactNode } from "react";
import { backend } from "../../data/backend";
import type { BusinessArea, BusinessInfo, BusinessMoment, BusinessOrderInput, BusinessTotals } from "../../types/business";
import { Card, Notice, Sticker, fieldLabel, formatEuro, formatNumber, ghostButton, inputClass, primaryButton, quickButton, rollOliebol } from "../../components/ui";
import { Avatar } from "../../components/Avatar";
import { BUSINESS_DEFAULTS, BUSINESS_DELIVERY_WINDOW } from "../../config";
import { areaLabel, businessTotals, dayOpen, emptyBusinessInput, formatPostcode, guessArea, longDay, momentLabel, validateBusiness, type BusinessField } from "./business";

/*
 * Zakelijk bestellen: het Google Formulier van Mark als één overzichtelijke pagina.
 * Links drie stappen, rechts (op telefoon onderaan) het overzicht dat meerekent, met de oudjes als knipoog.
 * Na het versturen kan de klant met één klik een volgend adres toevoegen; gegevens en aantallen blijven staan.
 */

const field = `${inputClass} min-h-[44px]`;

/** Volgorde van de velden op de pagina: daar springen we heen bij versturen met fouten. */
const FIELD_ORDER: BusinessField[] = [
  "withRaisins", "withoutRaisins", "donation", "street", "postalCode", "city", "area", "date", "pickupAgreed",
  "company", "contact", "phone", "email", "invoiceEmail"
];

function Step({ n, title, sub, done, children }: { n: number; title: string; sub: ReactNode; done: boolean; children: ReactNode }) {
  return (
    <Card className="grid gap-5">
      <header className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full font-serif text-base font-bold tabular-nums ${done ? "bg-kerst-50 text-kerst-ink" : "bg-krent text-meel"}`}
        >
          {done ? "✓" : n}
        </span>
        <div>
          <h2 className="font-serif text-xl font-bold leading-tight text-krent">
            <span className="sr-only">Stap {n}: </span>
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{sub}</p>
        </div>
      </header>
      {children}
    </Card>
  );
}

function Field({ id, label, optional, hint, error, children }: { id: string; label: string; optional?: boolean; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className={fieldLabel}>
        {label}
        {optional ? <span className="ml-1 normal-case tracking-normal text-muted/80">(optioneel)</span> : null}
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

function Counter({ id, label, sub, value, onChange, quick, error }: { id: string; label: ReactNode; sub: ReactNode; value: number; onChange: (n: number) => void; quick: number[]; error?: string }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const set = (n: number) => onChange(Math.max(0, Math.min(9990, n)));
  const step = "grid h-11 w-11 place-items-center rounded-md bg-vul text-xl font-bold text-krent transition hover:bg-vul-2 active:translate-y-px disabled:opacity-40";
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-6">
      <div>
        <label htmlFor={id} className="font-bold text-krent">
          {label}
        </label>
        <p className="text-sm text-muted">{sub}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <button type="button" className={step} onClick={() => set(value - 10)} disabled={value <= 0} aria-label="10 minder">
          −
        </button>
        <input
          id={id}
          inputMode="numeric"
          value={draft}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-fout` : undefined}
          onChange={(e) => {
            const clean = e.target.value.replace(/\D/g, "").slice(0, 4);
            setDraft(clean);
            set(Number(clean) || 0);
          }}
          onBlur={() => setDraft(String(value))}
          className={`h-11 w-16 rounded-md border bg-papier text-center font-serif text-xl font-bold tabular-nums text-krent focus:border-krent focus:outline-none focus:ring-2 focus:ring-krent/20 ${error ? "border-feest" : "border-lijn-2"}`}
        />
        <button type="button" className={step} onClick={() => set(value + 10)} aria-label="10 meer">
          +
        </button>
        <span className="flex gap-1.5 sm:ml-1">
          {quick.map((q) => (
            <button key={q} type="button" className={`${quickButton} min-h-[44px] min-w-[48px] px-2`} onClick={() => set(value + q)}>
              +{q}
            </button>
          ))}
        </span>
      </div>
      {error ? (
        <p id={`${id}-fout`} className="text-xs font-bold text-feest-ink sm:col-span-2">
          ! {error}
        </p>
      ) : null}
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

const MONTHS = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

/** Dagknoppen per maand. Te snel = doorgestreept en niet te kiezen. */
function DayPicker({ days, value, onChange, info, error }: { days: string[]; value: string; onChange: (d: string) => void; info: BusinessInfo; error?: string }) {
  const months = new Map<string, string[]>();
  for (const d of days) months.set(d.slice(0, 7), [...(months.get(d.slice(0, 7)) ?? []), d]);
  const anyClosed = days.some((d) => !dayOpen(d, info));
  return (
    <div id="f-date" tabIndex={-1} className="grid gap-3 focus:outline-none" role="radiogroup" aria-label="Bezorgdag" aria-invalid={error ? true : undefined}>
      {[...months].map(([key, list]) => {
        const [y, m] = key.split("-").map(Number);
        return (
          <div key={key} className="grid gap-1.5">
            <p className="text-xs font-bold text-oliebol">
              {MONTHS[m - 1].charAt(0).toUpperCase() + MONTHS[m - 1].slice(1)} {y}
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
                    aria-label={`${longDay(d)}${open ? "" : " (te snel)"}`}
                    title={open ? longDay(d) : `Te snel: bestel minimaal ${info.leadHours} uur van tevoren`}
                    disabled={!open}
                    onClick={() => onChange(d)}
                    className={`grid min-h-[52px] min-w-[52px] place-items-center rounded-md px-2 py-1.5 leading-none transition active:translate-y-px disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                      active ? "bg-krent text-meel shadow-zacht" : "bg-vul text-krent hover:bg-vul-2"
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${active ? "text-meel/75" : "text-muted"}`}>
                      {date.toLocaleDateString("nl-NL", { weekday: "short" }).replace(".", "")}
                    </span>
                    <span className="font-serif text-lg font-bold tabular-nums">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {anyClosed ? <p className="text-xs text-muted">Doorgestreept: te snel, we hebben minimaal {info.leadHours} uur nodig.</p> : null}
      {error ? <p className="text-xs font-bold text-feest-ink">! {error}</p> : null}
    </div>
  );
}

/** Zeven gouwe ouwen met elk een andere kleur en ander haar naast elkaar. */
const OUDJES = ["Riet", "Henk", "Ans", "Kees", "Dini", "Wim", "Corrie"];

/** Rijtje oudjes: één per tien oliebollen, de rest als getal. */
function Oudjes({ count }: { count: number }) {
  const shown = Math.min(count, 7);
  return (
    <div className="flex items-center">
      {Array.from({ length: shown }, (_, i) => (
        <span key={i} className={i ? "-ml-2" : ""}>
          <Avatar name={OUDJES[i]} size={30} />
        </span>
      ))}
      {count > shown ? <span className="-ml-1 rounded-full bg-gouwe-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-gouwe-ink">+{formatNumber(count - shown)}</span> : null}
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
  const short = Math.max(0, info.minimum - totals.oliebollen);
  return (
    <dl className="grid gap-1.5 text-sm">
      <Line label="MET krenten" value={formatNumber(input.withRaisins)} />
      <Line label="ZONDER krenten" value={formatNumber(input.withoutRaisins)} />
      <div className="my-1.5 border-t border-lijn" />
      <Line label={`${formatNumber(totals.oliebollen)} oliebollen × ${formatEuro(info.price)}`} value={formatEuro(totals.bollen)} />
      {input.fulfilment === "bezorgen" ? (
        <Line label={input.area ? `Bezorgen, ${areaLabel[input.area]}` : "Bezorgen"} value={input.area ? formatEuro(totals.delivery) : "–"} />
      ) : (
        <Line label="Afhalen" value={formatEuro(0)} />
      )}
      {totals.surcharge ? <Line label={`${momentLabel[input.moment]}`} value={formatEuro(totals.surcharge)} /> : null}
      <Line label="Subtotaal excl. btw" value={formatEuro(totals.subtotal)} muted />
      <Line label={`Btw ${Math.round(info.vatRate * 100)}%`} value={formatEuro(totals.vat)} muted />
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <dt className="font-bold text-krent">Totaal incl. btw</dt>
        <dd className="font-serif text-2xl font-bold tabular-nums text-krent">{formatEuro(totals.total)}</dd>
      </div>
      {totals.donation ? (
        <>
          <Line label={`Extra donatie, ${formatNumber(input.donation)} oliebollen`} value={formatEuro(totals.donation)} />
          <div className="flex items-baseline justify-between gap-3">
            <dt className="font-bold text-krent">Op je factuur</dt>
            <dd className="font-serif text-xl font-bold tabular-nums text-krent">{formatEuro(totals.invoice)}</dd>
          </div>
        </>
      ) : null}
      {short > 0 ? (
        <p className="mt-1 rounded-md bg-gouwe-50 px-2.5 py-1.5 text-xs text-gouwe-ink">
          ~ Nog {formatNumber(short)} tot het minimum van {info.minimum} oliebollen.
        </p>
      ) : null}
    </dl>
  );
}

interface Done {
  id: string;
  warning?: string;
  input: BusinessOrderInput;
  totals: BusinessTotals;
}

export function BusinessOrderPage() {
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
  const errors = validateBusiness(order, info);
  // With the same address, a wrong e-mail is one mistake, not two.
  if (sameInvoice) delete errors.invoiceEmail;
  const shown = showErrors ? errors : {};
  const missing = FIELD_ORDER.filter((f) => errors[f]);

  function update<K extends keyof BusinessOrderInput>(key: K, value: BusinessOrderInput[K]) {
    setInput((prev) => {
      const next = { ...prev, [key]: value };
      // Area follows the town until someone picks it themselves.
      if (key === "city" && !areaChosen) next.area = guessArea(String(value));
      // A day from the other list (bezorgen ↔ afhalen) no longer fits.
      if (key === "fulfilment") next.date = "";
      return next;
    });
  }

  const step1 = !errors.withRaisins && !errors.withoutRaisins && !errors.donation;
  const step2 = !(["street", "postalCode", "city", "area", "date", "pickupAgreed"] as BusinessField[]).some((f) => errors[f]);
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
      const clean = { ...order, postalCode: formatPostcode(order.postalCode) };
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

  const seasonYear = (info.deliveryDays[0] ?? "").slice(0, 4);
  const mailLink = `mailto:${info.email}?subject=${encodeURIComponent("Zakelijke bestelling")}`;

  if (done) return <Confirmation done={done} info={info} onAnother={anotherAddress} onRestart={startOver} />;

  return (
    <div className="grid gap-6 pb-24 lg:pb-0">
      <section className="grid gap-4 pt-2">
        <div className="grid gap-2">
          <p className={fieldLabel}>Zakelijk bestellen{seasonYear ? ` · seizoen ${seasonYear}` : ""}</p>
          <h1 className="font-display text-[44px] uppercase leading-[0.95] tracking-wide text-krent sm:text-[56px]">Oliebollen voor de zaak</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-oliebol">
            Voor je team, je klanten of de nieuwjaarsborrel. Vers gebakken, bij je bezorgd en achteraf op factuur. En met elke tien oliebollen gaat er
            een oudere gratis naar een Gouwe Ouwe-avond tegen eenzaamheid.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3 border-y border-lijn py-3 sm:max-w-2xl">
          {[
            [formatEuro(info.price), `per oliebol, excl. ${Math.round(info.vatRate * 100)}% btw`],
            [String(info.minimum), "oliebollen minimaal"],
            ["10 = 1", "tien oliebollen, één oudere op de dansvloer"]
          ].map(([value, label], i) => (
            <div key={label} className={i ? "border-l border-lijn pl-3" : ""}>
              <dt className="sr-only">{label}</dt>
              <dd className="font-serif text-2xl font-bold leading-tight tabular-nums text-krent sm:text-[28px]">{value}</dd>
              <dd className="text-xs leading-snug text-muted">{label}</dd>
            </div>
          ))}
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
          <Step n={1} title="Hoeveel oliebollen?" sub={`MET of ZONDER krenten, of allebei. Samen minimaal ${info.minimum}, in tientallen.`} done={step1 && totals.oliebollen > 0}>
            <div className="grid gap-5">
              <Counter
                id="f-withRaisins"
                label="MET krenten"
                sub="De klassieker."
                value={input.withRaisins}
                onChange={(n) => update("withRaisins", n)}
                quick={[50, 100]}
                error={shown.withRaisins}
              />
              <Counter
                id="f-withoutRaisins"
                label="ZONDER krenten"
                sub="Voor wie liever puur gaat."
                value={input.withoutRaisins}
                onChange={(n) => update("withoutRaisins", n)}
                quick={[50, 100]}
                error={shown.withoutRaisins}
              />
            </div>
            <div className="grid gap-4 border-t border-lijn pt-5">
              <Counter
                id="f-donation"
                label="Extra doneren"
                sub={`${formatEuro(info.donationPrice * 10).replace(",00", ",-")} per 10 oliebollen. Die gaan naar ouderen aan de bar en naar organisaties voor minderbedeelden.`}
                value={input.donation}
                onChange={(n) => update("donation", n)}
                quick={[10, 50]}
                error={shown.donation}
              />
              <Check id="f-flyers" checked={input.flyers} onChange={(v) => update("flyers", v)}>
                <b>Doe er flyers bij</b> <span className="text-muted">· standaard niet, dat scheelt papier</span>
              </Check>
            </div>
          </Step>

          <div id="stap-2" className="scroll-mt-6">
            <Step n={2} title="Bezorgen of afhalen" sub="Wij bakken, jij zet de koffie klaar." done={step2 && !!input.date}>
              <div role="radiogroup" aria-label="Bezorgen of afhalen" className="grid gap-2 sm:grid-cols-2">
                <Choice active={input.fulfilment === "bezorgen"} onClick={() => update("fulfilment", "bezorgen")} title="Bezorgen" sub={`Tussen ${BUSINESS_DELIVERY_WINDOW.replace("–", " en ")}`} />
                <Choice active={input.fulfilment === "afhalen"} onClick={() => update("fulfilment", "afhalen")} title="Afhalen" sub="Alleen na overleg" />
              </div>

              {input.fulfilment === "bezorgen" ? (
                <>
                  <div className="grid gap-3">
                    <Field id="f-street" label="Straat en huisnummer" error={shown.street}>
                      <input id="f-street" className={field} autoComplete="street-address" value={input.street} onChange={(e) => update("street", e.target.value)} placeholder="Keizersgracht 210" />
                    </Field>
                    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3">
                      <Field id="f-postalCode" label="Postcode" error={shown.postalCode}>
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
                      <Field id="f-city" label="Plaats" error={shown.city}>
                        <input id="f-city" className={field} autoComplete="address-level2" value={input.city} onChange={(e) => update("city", e.target.value)} placeholder="Amsterdam" />
                      </Field>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <p className={fieldLabel}>Bezorgkosten</p>
                    <div id="f-area" tabIndex={-1} role="radiogroup" aria-label="Bezorgkosten" className="grid gap-2 focus:outline-none sm:grid-cols-2">
                      {(["regio", "buiten"] as BusinessArea[]).map((a) => (
                        <Choice
                          key={a}
                          active={input.area === a}
                          onClick={() => {
                            setAreaChosen(true);
                            update("area", a);
                          }}
                          title={areaLabel[a]}
                          sub={a === "regio" ? "Op fietsafstand" : "Verder weg met de auto"}
                          aside={`${formatEuro(info.fees[a])}`}
                        />
                      ))}
                    </div>
                    {shown.area ? <p className="text-xs font-bold text-feest-ink">! {shown.area}</p> : <p className="text-xs text-muted">Bedragen excl. btw. We kiezen dit alvast op basis van de plaats.</p>}
                  </div>

                  <div className="grid gap-2">
                    <p className={fieldLabel}>Bezorgdag</p>
                    <DayPicker days={info.deliveryDays} value={input.date} onChange={(d) => update("date", d)} info={info} error={shown.date} />
                    <p className="text-xs text-muted">
                      Liever een ander moment?{" "}
                      <a className="font-bold text-oliebol underline decoration-lijn-2 underline-offset-4 hover:text-krent" href={mailLink}>
                        Mail ons
                      </a>
                      .
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <p className={fieldLabel}>Bezorgmoment</p>
                    <div role="radiogroup" aria-label="Bezorgmoment" className="grid gap-2 sm:grid-cols-3">
                      {(["regulier", "voor10", "voor9"] as BusinessMoment[]).map((m) => (
                        <Choice
                          key={m}
                          active={input.moment === m}
                          onClick={() => update("moment", m)}
                          title={momentLabel[m]}
                          sub={info.surcharges[m] ? `+ ${formatEuro(info.surcharges[m])} excl. btw` : "Geen toeslag"}
                        />
                      ))}
                    </div>
                  </div>

                  <p className="rounded-md bg-vul px-3.5 py-2.5 text-sm text-oliebol">
                    <b className="text-krent">Meerdere adressen?</b> Vul per adres een aanvraag in. Na het versturen voeg je met één klik het volgende adres toe; je gegevens
                    blijven staan.
                  </p>
                </>
              ) : (
                <>
                  <Notice tone="info">
                    Gezellig! Afhalen kan alleen na overleg. Mail eerst even naar{" "}
                    <a className="font-bold underline underline-offset-4" href={mailLink}>
                      {info.email}
                    </a>
                    , dan spreken we samen waar en hoe af.
                  </Notice>
                  <Check id="f-pickupAgreed" checked={input.pickupAgreed} onChange={(v) => update("pickupAgreed", v)} error={shown.pickupAgreed}>
                    Ik heb het afhalen al afgestemd met Oma Coby's Oliebollenbar.
                  </Check>
                  <div className="grid gap-2">
                    <p className={fieldLabel}>Afhaalmoment</p>
                    <div id="f-date" tabIndex={-1} role="radiogroup" aria-label="Afhaalmoment" className="grid gap-2 focus:outline-none sm:grid-cols-2">
                      {info.pickupDays.map((d) => (
                        <Choice key={d.date} active={input.date === d.date} onClick={() => update("date", d.date)} title={longDay(d.date)} sub={`Tussen ${d.time.replace("–", " en ")}`} />
                      ))}
                    </div>
                    {shown.date ? <p className="text-xs font-bold text-feest-ink">! {shown.date}</p> : null}
                  </div>
                </>
              )}
            </Step>
          </div>

          <Step n={3} title="Je gegevens" sub="Zodat we weten wie we kunnen bellen en de factuur goed terechtkomt." done={step3}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="f-company" label="Naam onderneming" error={shown.company}>
                <input id="f-company" className={field} autoComplete="organization" value={input.company} onChange={(e) => update("company", e.target.value)} />
              </Field>
              <Field id="f-contact" label="Contactpersoon" error={shown.contact}>
                <input id="f-contact" className={field} autoComplete="name" value={input.contact} onChange={(e) => update("contact", e.target.value)} />
              </Field>
              <Field id="f-phone" label="Telefoonnummer" hint="Voor als de bezorger je even nodig heeft." error={shown.phone}>
                <input id="f-phone" type="tel" className={field} autoComplete="tel" value={input.phone} onChange={(e) => update("phone", e.target.value)} />
              </Field>
              <Field id="f-email" label="E-mailadres" hint="Hier sturen we de kopie van je aanvraag heen." error={shown.email}>
                <input id="f-email" type="email" className={field} autoComplete="email" value={input.email} onChange={(e) => update("email", e.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 border-t border-lijn pt-5">
              <Check id="f-sameInvoice" checked={sameInvoice} onChange={setSameInvoice}>
                Factuur naar hetzelfde e-mailadres
              </Check>
              {!sameInvoice ? (
                <Field id="f-invoiceEmail" label="E-mailadres voor de factuur" error={shown.invoiceEmail}>
                  <input id="f-invoiceEmail" type="email" className={field} value={input.invoiceEmail} onChange={(e) => update("invoiceEmail", e.target.value)} placeholder="facturen@bedrijf.nl" />
                </Field>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="f-invoiceAddress" label="Factuuradres" optional hint="Als het anders is dan het bezorgadres.">
                  <textarea id="f-invoiceAddress" rows={2} className={inputClass} value={input.invoiceAddress} onChange={(e) => update("invoiceAddress", e.target.value)} />
                </Field>
                <Field id="f-reference" label="Referentie of grootboeknummer" optional hint="Zetten we op de factuur.">
                  <input id="f-reference" className={field} value={input.reference} onChange={(e) => update("reference", e.target.value)} />
                </Field>
              </div>
              <Field id="f-remark" label="Wil je nog iets kwijt?" optional hint="Opmerkingen, vragen, ideeën of een aanbelinstructie.">
                <textarea id="f-remark" rows={3} className={inputClass} value={input.remark} onChange={(e) => update("remark", e.target.value)} />
              </Field>
              {/* Honeypot: invisible for people, bots fill it in. */}
              <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
                <label htmlFor="f-website">Website</label>
                <input id="f-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              We gebruiken je gegevens alleen voor je bestelling bij Oma Coby's Oliebollenbar en delen ze niet met anderen.
            </p>
          </Step>
        </form>

        <aside ref={summaryRef} id="overzicht" className="grid scroll-mt-6 gap-4 lg:sticky lg:top-6">
          <Card className="grid gap-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-xl font-bold text-krent">Je bestelling</h2>
              {input.date ? <span className="text-xs font-bold text-oliebol">{longDay(input.date)}</span> : null}
            </div>
            <Summary input={order} totals={totals} info={info} />
            <div className="grid gap-2 border-t border-lijn pt-4">
              {totals.ouderen > 0 ? (
                <>
                  <Oudjes count={totals.ouderen} />
                  <p className="text-sm text-krent">
                    Goed voor <b>{formatNumber(totals.ouderen)}</b> {totals.ouderen === 1 ? "oudere" : "ouderen"} op de dansvloer
                    {input.donation ? <>, en {formatNumber(input.donation)} gedoneerde oliebollen gaan naar ouderen aan de bar.</> : "."}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">Elke 10 oliebollen = één oudere gratis naar een Gouwe Ouwe-avond tegen eenzaamheid.</p>
              )}
            </div>
            {error ? <Notice tone="error">{error}</Notice> : null}
            {showErrors && missing.length ? (
              <Notice tone="warning">
                Nog {missing.length === 1 ? "één ding" : `${missing.length} dingen`} invullen:{" "}
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
                      {FIELD_NAMES[f]}
                    </a>
                  </span>
                ))}
                .
              </Notice>
            ) : null}
            <button type="button" className={`${primaryButton} min-h-[48px] w-full text-[15px]`} disabled={busy} onClick={() => void submit()}>
              {busy ? "Versturen…" : "Aanvraag versturen"}
            </button>
            <p className="text-center text-xs leading-relaxed text-muted">
              Je betaalt achteraf op factuur. Je krijgt direct een kopie per mail en wij bevestigen je bestelling.
            </p>
          </Card>
          <p className="px-1 text-xs leading-relaxed text-muted">
            Bestel je voor jezelf? Dat gaat via{" "}
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
          <div className="leading-tight">
            <p className="text-xs text-muted">{formatNumber(totals.oliebollen)} oliebollen</p>
            <p className="font-serif text-lg font-bold tabular-nums text-krent">{formatEuro(totals.invoice)}</p>
          </div>
          <button type="button" className={primaryButton} onClick={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Naar overzicht
          </button>
        </div>
      </div>
    </div>
  );
}

const FIELD_NAMES: Record<BusinessField, string> = {
  withRaisins: "aantal oliebollen",
  withoutRaisins: "aantal ZONDER",
  donation: "donatie",
  flyers: "flyers",
  fulfilment: "bezorgen of afhalen",
  area: "bezorgkosten",
  moment: "bezorgmoment",
  date: "dag",
  pickupAgreed: "overleg afhalen",
  street: "straat",
  postalCode: "postcode",
  city: "plaats",
  company: "onderneming",
  contact: "contactpersoon",
  phone: "telefoon",
  email: "e-mailadres",
  invoiceEmail: "e-mail voor de factuur",
  invoiceAddress: "factuuradres",
  reference: "referentie",
  remark: "opmerking"
};

function Confirmation({ done, info, onAnother, onRestart }: { done: Done; info: BusinessInfo; onAnother: () => void; onRestart: () => void }) {
  const { input, totals } = done;
  const rows: Array<[string, ReactNode]> = [
    ["Oliebollen", `${formatNumber(input.withRaisins)} MET · ${formatNumber(input.withoutRaisins)} ZONDER`],
    ...(input.donation ? ([["Extra gedoneerd", `${formatNumber(input.donation)} oliebollen`]] as Array<[string, ReactNode]>) : []),
    input.fulfilment === "bezorgen"
      ? ["Bezorgen", <>{longDay(input.date)}, {momentLabel[input.moment].toLowerCase()}<br />{input.street}, {input.postalCode} {input.city}</>]
      : ["Afhalen", `${longDay(input.date)}, ${info.pickupDays.find((d) => d.date === input.date)?.time ?? ""}`],
    ["Op je factuur", <b className="text-krent">{formatEuro(totals.invoice)}</b>]
  ];
  return (
    <div className="mx-auto grid w-full max-w-2xl gap-5 py-4">
      <Card className="grid gap-5 sm:p-7">
        <div className="grid justify-items-start gap-4">
          <Sticker tone="kerst" slap>
            Bedankt!
          </Sticker>
          <div>
            <h1 className="font-serif text-[28px] font-bold leading-tight text-krent">Je aanvraag is binnen</h1>
            <p className="mt-1 text-[15px] leading-relaxed text-oliebol">
              We kijken hem na en mailen je een bevestiging. Een kopie van je aanvraag gaat naar <b className="text-krent">{input.email}</b>.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 border-y border-lijn py-4">
          <div>
            <p className={fieldLabel}>Aanvraagnummer</p>
            <p className="font-serif text-3xl font-bold tabular-nums text-krent">{done.id}</p>
          </div>
          {totals.ouderen > 0 ? (
            <div className="grid justify-items-end gap-1">
              <Oudjes count={totals.ouderen} />
              <p className="text-xs text-muted">
                Goed voor {formatNumber(totals.ouderen)} {totals.ouderen === 1 ? "oudere" : "ouderen"} op de dansvloer.
              </p>
            </div>
          ) : null}
        </div>
        <dl className="grid gap-2.5 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
              <dt className="text-muted">{label}</dt>
              <dd className="text-oliebol">{value}</dd>
            </div>
          ))}
        </dl>
        {done.warning ? <Notice tone="warning">{done.warning} Bewaar je aanvraagnummer; we nemen contact met je op.</Notice> : null}
        {backend.kind === "demo" ? <Notice tone="info">Demo: er is geen mail verstuurd. De aanvraag staat bij beheer onder Zakelijk.</Notice> : null}
        <div className="flex flex-wrap gap-2">
          {input.fulfilment === "bezorgen" ? (
            <button type="button" className={primaryButton} onClick={onAnother}>
              Nog een adres toevoegen
            </button>
          ) : null}
          <button type="button" className={ghostButton} onClick={onRestart}>
            Nieuwe aanvraag
          </button>
        </div>
      </Card>
      <p className="text-center text-xs text-muted">
        Vragen? Mail{" "}
        <a className="font-bold text-oliebol underline decoration-lijn-2 underline-offset-4" href={`mailto:${info.email}`}>
          {info.email}
        </a>{" "}
        en noem je aanvraagnummer.
      </p>
    </div>
  );
}
