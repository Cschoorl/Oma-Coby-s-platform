import { useState, type ReactNode } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import type { BusinessOrder, BusinessStatus } from "../../types/business";
import { Badge, Card, ConfirmPanel, CopyButton, EmptyState, Icon, Note, Notice, Segmented, StatStrip, fieldLabel, formatEuro, formatNumber, inputClass, primaryButton, secondaryButton, textAction, toast, type BadgeTone } from "../../components/ui";
import { Drawer } from "../../components/Drawer";
import { BUSINESS_DEFAULTS, BUSINESS_LARGE } from "../../config";
import { appLink } from "../../lib/router";
import { areaLabel, longDay, momentLabel } from "./business";

/*
 * Beheer: de zakelijke aanvragen van het bestelformulier. Elke aanvraag nakijken en bevestigen
 * (dan staat hij als order in Bestellingen, Inpakken en Routes) of afwijzen met een reden.
 */

type Filter = BusinessStatus | "alles";

const statusBadge: Record<BusinessStatus, [BadgeTone, string]> = {
  nieuw: ["aandacht", "~ Nieuw"],
  bevestigd: ["klaar", "✓ Bevestigd"],
  afgewezen: ["probleem", "× Afgewezen"]
};

/** Dagen tot de leverdag, afgerond naar boven. */
function daysUntil(date: string): number {
  return Math.ceil((new Date(`${date}T09:00:00`).getTime() - Date.now()) / 86400000);
}

/** Wat beheer moet weten voordat ze bevestigen. Altijd met woord, nooit alleen kleur. */
function flags(b: BusinessOrder): Array<[BadgeTone, string]> {
  const out: Array<[BadgeTone, string]> = [];
  const days = daysUntil(b.date);
  if (b.status === "nieuw" && days <= 3) out.push(["probleem", days <= 0 ? "! Dag is voorbij" : `! Over ${days} ${days === 1 ? "dag" : "dagen"}`]);
  if (b.fulfilment === "afhalen") out.push(["aandacht", "~ Afhalen"]);
  if (b.withRaisins > BUSINESS_LARGE || b.withoutRaisins > BUSINESS_LARGE) out.push(["aandacht", `~ Meer dan ${formatNumber(BUSINESS_LARGE)}`]);
  if (b.remark) out.push(["zacht", "Opmerking"]);
  return out;
}

export function BusinessAdminPage({ state, session, run }: { state: DashboardState; session: Session; run: (change: () => Promise<unknown>) => Promise<void> }) {
  const [filter, setFilter] = useState<Filter>("nieuw");
  const [openId, setOpenId] = useState<string | null>(null);
  const all = [...state.business].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const count = (s: BusinessStatus) => all.filter((b) => b.status === s).length;
  const visible = filter === "alles" ? all : all.filter((b) => b.status === filter);
  const confirmed = all.filter((b) => b.status === "bevestigd");
  const open = all.find((b) => b.id === openId) ?? null;
  const link = appLink("/bestellen");

  return (
    <>
      <StatStrip
        items={[
          { label: "Nieuw", value: count("nieuw"), hint: "nog nakijken" },
          { label: "Bevestigd", value: confirmed.length, hint: "staan in Bestellingen" },
          { label: "Oliebollen", value: formatNumber(confirmed.reduce((s, b) => s + b.totals.oliebollen, 0)), hint: "bevestigd" },
          { label: "Omzet", value: formatEuro(confirmed.reduce((s, b) => s + b.totals.total, 0)), hint: "bevestigd, incl. btw" }
        ]}
      />

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={fieldLabel}>Het bestelformulier</p>
          <p className="truncate text-sm text-oliebol">{link}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton text={link} label="Kopieer link" />
          <a className={secondaryButton} href="#/bestellen" target="_blank" rel="noreferrer">
            Bekijk formulier
          </a>
        </div>
      </Card>

      <section className="grid gap-3">
        <Segmented
          label="Toon aanvragen"
          value={filter}
          onChange={setFilter}
          options={[
            ["nieuw", "Nieuw", count("nieuw")],
            ["bevestigd", "Bevestigd", count("bevestigd")],
            ["afgewezen", "Afgewezen", count("afgewezen")],
            ["alles", "Alles", all.length]
          ]}
        />
        {visible.length === 0 ? (
          <EmptyState
            title={filter === "nieuw" ? "Alles is nagekeken." : "Niets in deze selectie."}
            text={all.length === 0 ? "Nog geen zakelijke aanvragen. Deel de link van het bestelformulier met je zakelijke klanten." : undefined}
          />
        ) : (
          <Card className="grid p-0 sm:p-0">
            <ul className="divide-y divide-lijn">
              {visible.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => setOpenId(b.id)} className="grid w-full gap-2 px-4 py-3.5 text-left transition hover:bg-vul sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-5">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <b className="truncate text-krent">{b.company}</b>
                        <span className="text-xs tabular-nums text-muted">{b.id}</span>
                      </span>
                      <span className="block truncate text-sm text-oliebol">
                        {b.contact} · {b.fulfilment === "bezorgen" ? `${b.street}, ${b.city}` : "Afhalen"}
                      </span>
                    </span>
                    <span className="min-w-0 text-sm">
                      <span className="block font-bold text-krent">{longDay(b.date)}</span>
                      <span className="block tabular-nums text-oliebol">
                        {formatNumber(b.withRaisins)} MET · {formatNumber(b.withoutRaisins)} ZONDER
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                      {flags(b).map(([tone, text]) => (
                        <Badge key={text} tone={tone}>
                          {text}
                        </Badge>
                      ))}
                      {filter === "alles" ? <Badge tone={statusBadge[b.status][0]}>{statusBadge[b.status][1]}</Badge> : null}
                      <span className="ml-1 font-serif text-lg font-bold tabular-nums text-krent">{formatEuro(b.totals.total)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {open ? <BusinessDrawer order={open} session={session} run={run} onClose={() => setOpenId(null)} /> : null}
    </>
  );
}

function Rows({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid gap-2 text-sm">
      {rows
        .filter(([, v]) => v !== "" && v !== null && v !== undefined)
        .map(([label, value]) => (
          <div key={label} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3">
            <dt className="text-muted">{label}</dt>
            <dd className="min-w-0 break-words text-krent">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2.5">
      <h3 className={fieldLabel}>{title}</h3>
      {children}
    </section>
  );
}

function BusinessDrawer({ order: b, session, run, onClose }: { order: BusinessOrder; session: Session; run: (change: () => Promise<unknown>) => Promise<void>; onClose: () => void }) {
  const [asking, setAsking] = useState<"bevestigen" | "afwijzen" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = b.totals;
  const vatPercent = Math.round((t.subtotal ? t.vat / t.subtotal : BUSINESS_DEFAULTS.vatRate) * 100);

  async function setStatus(status: BusinessStatus, why = "") {
    setBusy(true);
    setError("");
    try {
      await run(() => backend.setBusinessStatus(session, b.id, status, why));
      setAsking(null);
      if (status === "bevestigd") toast(`Bevestigd. ${b.company} staat nu in Bestellingen.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const declineMail = `mailto:${b.email}?subject=${encodeURIComponent(`Je aanvraag ${b.id} bij Oma Coby's Oliebollenbar`)}&body=${encodeURIComponent(
    `Beste ${b.contact.split(" ")[0]},\n\nDank je wel voor je aanvraag ${b.id}. Helaas kunnen we deze zo niet leveren: ${b.reason || reason}\n\nHartelijke groet,\nOma Coby's Oliebollenbar`
  )}`;

  return (
    <Drawer
      title={b.company}
      onClose={onClose}
      header={
        <div className="grid gap-1">
          <h2 className="font-serif text-xl font-bold leading-tight text-krent">{b.company}</h2>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span className="tabular-nums">{b.id}</span>
            <Badge tone={statusBadge[b.status][0]}>{statusBadge[b.status][1]}</Badge>
            <span>binnen {b.createdAt.slice(0, 16)}</span>
          </p>
        </div>
      }
    >
      {flags(b).length ? (
        <div className="flex flex-wrap gap-1.5">
          {flags(b).map(([tone, text]) => (
            <Badge key={text} tone={tone}>
              {text}
            </Badge>
          ))}
        </div>
      ) : null}

      <Block title="Bestelling">
        <Rows
          rows={[
            ["MET krenten", formatNumber(b.withRaisins)],
            ["ZONDER krenten", formatNumber(b.withoutRaisins)],
            ["TOTAAL", <b>{formatNumber(t.oliebollen)} oliebollen</b>],
            ["Extra gedoneerd", b.donation ? `${formatNumber(b.donation)} oliebollen` : ""],
            ["Flyers", b.flyers ? "Ja, graag" : "Nee"]
          ]}
        />
      </Block>

      <Block title={b.fulfilment === "bezorgen" ? "Bezorgen" : "Afhalen"}>
        <Rows
          rows={
            b.fulfilment === "bezorgen"
              ? [
                  ["Dag", longDay(b.date)],
                  ["Moment", momentLabel[b.moment]],
                  ["Adres", <>{b.street}<br />{b.postalCode} {b.city}</>],
                  ["Bezorgkosten", b.area ? areaLabel[b.area] : ""]
                ]
              : [
                  ["Dag", longDay(b.date)],
                  ["Afgestemd", b.pickupAgreed ? "✓ Volgens de klant wel" : "Nee"]
                ]
          }
        />
      </Block>

      <Block title="Contact en factuur">
        <Rows
          rows={[
            ["Contactpersoon", b.contact],
            [
              "Telefoon",
              <a className="inline-flex items-center gap-1.5 underline decoration-lijn-2 underline-offset-4" href={`tel:${b.phone.replace(/\s/g, "")}`}>
                <Icon name="phone" className="h-3.5 w-3.5" />
                {b.phone}
              </a>
            ],
            [
              "E-mail",
              <a className="inline-flex items-center gap-1.5 underline decoration-lijn-2 underline-offset-4" href={`mailto:${b.email}`}>
                <Icon name="mail" className="h-3.5 w-3.5" />
                {b.email}
              </a>
            ],
            ["Factuur naar", b.invoiceEmail !== b.email ? b.invoiceEmail : "Zelfde e-mailadres"],
            ["Factuuradres", b.invoiceAddress],
            ["Referentie", b.reference]
          ]}
        />
      </Block>

      {b.remark ? <Note>{b.remark}</Note> : null}

      <Block title="Bedragen">
        <dl className="grid gap-1.5 text-sm">
          {(
            [
              [`${formatNumber(t.oliebollen)} × ${formatEuro(t.oliebollen ? t.bollen / t.oliebollen : 0)}`, t.bollen],
              ["Bezorgkosten", t.delivery],
              ["Toeslag bezorgmoment", t.surcharge],
              ["Subtotaal excl. btw", t.subtotal],
              [`Btw ${vatPercent}%`, t.vat]
            ] as Array<[string, number]>
          )
            .filter(([label, v]) => v || label.startsWith("Subtotaal") || label.startsWith("Btw"))
            .map(([label, v]) => (
              <div key={label} className="flex justify-between gap-3 text-oliebol">
                <dt>{label}</dt>
                <dd className="tabular-nums">{formatEuro(v)}</dd>
              </div>
            ))}
          <div className="flex items-baseline justify-between gap-3 font-bold text-krent">
            <dt>Totaal incl. btw</dt>
            <dd className="font-serif text-xl tabular-nums">{formatEuro(t.total)}</dd>
          </div>
          {t.donation ? (
            <>
              <div className="flex justify-between gap-3 text-oliebol">
                <dt>Extra donatie</dt>
                <dd className="tabular-nums">{formatEuro(t.donation)}</dd>
              </div>
              <div className="flex justify-between gap-3 font-bold text-krent">
                <dt>Op de factuur</dt>
                <dd className="tabular-nums">{formatEuro(t.invoice)}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </Block>

      {b.status === "afgewezen" && b.reason ? (
        <Block title="Reden afwijzing">
          <p className="text-sm text-krent">{b.reason}</p>
          <a className={`${secondaryButton} justify-self-start`} href={declineMail}>
            <Icon name="mail" />
            Mail de klant
          </a>
        </Block>
      ) : null}

      {b.status !== "nieuw" && b.handledBy ? (
        <p className="text-xs text-muted">
          {b.status === "bevestigd" ? "Bevestigd" : "Afgewezen"} door {b.handledBy} op {b.handledAt.slice(0, 16)}.
        </p>
      ) : null}

      <div className="grid gap-3 border-t border-lijn pt-4">
        {error ? <Notice tone="error">{error}</Notice> : null}
        {b.status === "nieuw" && !asking ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButton} onClick={() => setAsking("bevestigen")}>
              <Icon name="check" />
              Bevestigen
            </button>
            <button type="button" className={secondaryButton} onClick={() => setAsking("afwijzen")}>
              Afwijzen
            </button>
          </div>
        ) : null}
        {asking === "bevestigen" ? (
          <ConfirmPanel confirmLabel="Bevestigen" busy={busy} onConfirm={() => void setStatus("bevestigd")} onCancel={() => setAsking(null)}>
            <p>
              De aanvraag komt als order in Bestellingen, Inpakken en Routes op <b>{longDay(b.date).toLowerCase()}</b>. De bevestiging aan de klant verstuur je daarna vanuit
              Bestellingen.
            </p>
          </ConfirmPanel>
        ) : null}
        {asking === "afwijzen" ? (
          <ConfirmPanel confirmLabel="Afwijzen" danger busy={busy} disabled={!reason.trim()} onConfirm={() => void setStatus("afgewezen", reason)} onCancel={() => setAsking(null)}>
            <label htmlFor="reden" className={fieldLabel}>
              Waarom?
            </label>
            <textarea id="reden" rows={2} className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bijvoorbeeld: op die dag zitten we vol." />
            <p className="text-xs text-muted">Daarna kun je de klant mailen met deze reden erin.</p>
          </ConfirmPanel>
        ) : null}
        {b.status !== "nieuw" ? (
          <button type="button" className={`${textAction} justify-self-start`} disabled={busy} onClick={() => void setStatus("nieuw")}>
            Terugzetten naar nieuw
          </button>
        ) : null}
      </div>
    </Drawer>
  );
}
