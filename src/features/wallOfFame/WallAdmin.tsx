import { useState, type ReactNode } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState } from "../../types/dashboard";
import type { WallEntry, WallInk, WallLogoStatus } from "../../types/wallOfFame";
import { Badge, Card, CopyButton, EmptyState, Notice, Segmented, StatStrip, fieldLabel, formatNumber, inputClass, primaryButton, quickButton, secondaryButton, textAction, todayIso, toast, type BadgeTone } from "../../components/ui";
import { Drawer } from "../../components/Drawer";
import { appLink } from "../../lib/router";
import { InkFilters, WallLogo } from "./WallOfFame";
import { domainFromEmail, logoNeedsCare, seasonOf, sortWall, wallKey, wantsLogo } from "./wall";

/*
 * Beheer › Wall of fame. Wie staat erop (alleen met toestemming), welk logo de logozoeker vond en of het klopt.
 * Een logo hangt pas na "Logo klopt"; tot dan hangt het naambordje. Akkoord per mail voeg je hier toe.
 * Zie docs/wall-of-fame.md.
 */

type Run = (change: () => Promise<unknown>) => Promise<void>;
type Filter = "nakijken" | "muur" | "verborgen" | "alles";

const logoBadge: Record<WallLogoStatus, [BadgeTone, string]> = {
  zoeken: ["zacht", "~ Logo zoeken…"],
  nakijken: ["aandacht", "~ Logo nakijken"],
  goedgekeurd: ["klaar", "✓ Logo"],
  geen: ["zacht", "Naambordje"]
};

const inkLabel: Record<WallInk, string> = { donker: "Donkere inkt", licht: "Lichte inkt", kleur: "Eigen kleur" };
const tierName: Record<WallEntry["tier"], string> = { brons: "Brons", zilver: "Zilver", goud: "Goud" };

function needsLook(w: WallEntry): boolean {
  return wantsLogo(w.tier) && (w.logoStatus === "nakijken" || w.logoStatus === "zoeken");
}

export function WallAdmin({ state, session, run }: { state: DashboardState; session: Session; run: Run }) {
  const season = seasonOf(todayIso());
  const all = sortWall(state.wallOfFame.filter((w) => w.season === season));
  const [filter, setFilter] = useState<Filter>(all.some(needsLook) ? "nakijken" : "muur");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const onWall = all.filter((w) => w.visible && w.ouderen > 0);
  const visible = all.filter((w) =>
    filter === "nakijken" ? needsLook(w) : filter === "muur" ? w.visible && w.ouderen > 0 : filter === "verborgen" ? !w.visible || w.ouderen === 0 : true
  );

  /** The wall follows the confirmed requests after every confirmation; this does it now (also the first time). */
  async function refresh() {
    setRefreshing(true);
    setRefreshError("");
    try {
      let added: string[] = [];
      await run(async () => {
        added = (await backend.refreshWall(session)).added;
      });
      toast(added.length ? `Erbij op de muur: ${added.join(", ")}.` : "De muur is bij: geen nieuwe bedrijven.");
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  }
  const open = all.find((w) => w.key === openKey) ?? null;
  const link = appLink("/wall-of-fame");
  const embed = `<iframe src="${appLink("/wall-of-fame?embed=1")}" title="Wall of fame van Oma Coby's Oliebollenbar" style="width:100%;height:1500px;border:0" loading="lazy"></iframe>`;

  return (
    <>
      <InkFilters />
      <StatStrip
        items={[
          { label: "Op de muur", value: onWall.length, hint: `seizoen ${season}` },
          { label: "Logo nakijken", value: all.filter((w) => wantsLogo(w.tier) && w.logoStatus === "nakijken").length, hint: "hangt pas na goedkeuren" },
          { label: "Logo zoeken", value: all.filter((w) => w.logoStatus === "zoeken").length, hint: "de logozoeker is aan de beurt" },
          { label: "Ouderen", value: formatNumber(onWall.reduce((s, w) => s + w.ouderen, 0)), hint: "samen op de muur" }
        ]}
      />

      <Card className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className={fieldLabel}>De muur op de website</p>
          <p className="truncate text-sm text-oliebol">{link}</p>
          <p className="text-xs text-muted">Alleen bevestigde bestellingen met toestemming, nooit bedragen. Een logo hangt pas als jij het goedkeurt; tot dan hangt het naambordje.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={primaryButton} href="#/wall-of-fame" target="_blank" rel="noreferrer">
            Bekijk de muur
          </a>
          <CopyButton text={link} label="Kopieer link" />
          <CopyButton text={embed} label="Kopieer iframe" />
        </div>
      </Card>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            label="Toon"
            value={filter}
            onChange={setFilter}
            options={[
              ["nakijken", "Nakijken", all.filter(needsLook).length],
              ["muur", "Op de muur", onWall.length],
              ["verborgen", "Niet op de muur", all.length - onWall.length],
              ["alles", "Alles", all.length]
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryButton} disabled={refreshing} onClick={() => void refresh()}>
              {refreshing ? "Bijwerken…" : "Werk bij uit de bestellingen"}
            </button>
            <button type="button" className={secondaryButton} onClick={() => setAdding(true)}>
              + Akkoord per mail
            </button>
          </div>
        </div>
        {refreshError ? <Notice tone="error">Bijwerken lukte niet: {refreshError}</Notice> : null}
        {visible.length === 0 ? (
          <EmptyState
            title={filter === "nakijken" ? "Alle logo's zijn nagekeken." : "Niemand in deze selectie."}
            text={all.length === 0 ? "Nog niemand op de muur. Bevestig een zakelijke bestelling met het vinkje, of voeg een akkoord per mail toe." : undefined}
          />
        ) : (
          <Card className="grid p-0 sm:p-0">
            <ul className="divide-y divide-lijn">
              {visible.map((w) => (
                <li key={w.key}>
                  <button type="button" onClick={() => setOpenKey(w.key)} className="grid w-full grid-cols-[64px_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-left transition hover:bg-vul sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:gap-4 sm:px-5">
                    <span className="grid h-14 w-16 place-items-center rounded bg-papier p-1.5 shadow-zacht sm:w-[72px]">
                      <WallLogo name={w.name} logoUrl={wantsLogo(w.tier) ? w.logoUrl : ""} ink={w.ink} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <b className="truncate text-krent">{w.name}</b>
                        {w.name !== w.company ? <span className="truncate text-xs text-muted">{w.company}</span> : null}
                      </span>
                      <span className="block text-sm text-oliebol">
                        {tierName[w.tier]} · {formatNumber(w.ouderen)} ouderen{w.early ? " · vroeg erbij" : ""}
                      </span>
                      {w.logoNote && needsLook(w) ? <span className="block truncate text-xs text-muted">{w.logoNote}</span> : null}
                    </span>
                    <span className="col-span-2 flex flex-wrap items-center gap-1.5 sm:col-span-1 sm:justify-end">
                      {wantsLogo(w.tier) ? <Badge tone={logoBadge[w.logoStatus][0]}>{logoBadge[w.logoStatus][1]}</Badge> : <Badge tone="zacht">Naam</Badge>}
                      {wantsLogo(w.tier) && w.logoStatus === "nakijken" && logoNeedsCare(w) ? <Badge tone="probleem">! Op naam gezocht</Badge> : null}
                      <Badge tone="neutral">{w.consent === "mail" ? "Akkoord per mail" : "Vinkje formulier"}</Badge>
                      {!w.visible ? <Badge tone="probleem">× Verborgen</Badge> : w.ouderen === 0 ? <Badge tone="probleem">× Geen bevestigde bestelling</Badge> : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      {open ? <WallDrawer entry={open} session={session} run={run} onClose={() => setOpenKey(null)} /> : null}
      {adding ? <MailConsentDrawer state={state} session={session} run={run} season={season} onClose={() => setAdding(false)} /> : null}
    </>
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

function WallDrawer({ entry: w, session, run, onClose }: { entry: WallEntry; session: Session; run: Run; onClose: () => void }) {
  const [name, setName] = useState(w.name);
  const [logoUrl, setLogoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(change: () => Promise<unknown>, done?: string) {
    setBusy(true);
    setError("");
    try {
      await run(change);
      if (done) toast(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const save = (patch: Parameters<typeof backend.saveWallEntry>[2], done?: string) => act(() => backend.saveWallEntry(session, w.key, patch), done);
  const logo = wantsLogo(w.tier);
  const care = logoNeedsCare(w);

  return (
    <Drawer
      title={w.name}
      onClose={onClose}
      header={
        <div className="grid gap-1">
          <h2 className="font-serif text-xl font-bold leading-tight text-krent">{w.name}</h2>
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>{tierName[w.tier]}</span>
            <span>· {formatNumber(w.ouderen)} ouderen</span>
            {w.early ? <Badge tone="klaar">★ Vroeg erbij</Badge> : null}
          </p>
        </div>
      }
    >
      <InkFilters />
      {logo ? (
        <Block title="Logo">
          <div className="grid grid-cols-2 gap-3">
            <figure className="grid gap-1">
              <span className="grid h-28 place-items-center rounded-md bg-papier p-3 shadow-zacht">
                <WallLogo name={w.name} logoUrl={w.logoUrl} ink={w.ink} />
              </span>
              <figcaption className="text-center text-[11px] text-muted">Zo hangt het ({inkLabel[w.ink].toLowerCase()})</figcaption>
            </figure>
            <figure className="grid gap-1">
              <span className="grid h-28 place-items-center rounded-md bg-vul p-3">
                {w.logoUrl ? <img src={w.logoUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-contain" /> : <span className="text-xs text-muted">Geen logo</span>}
              </span>
              <figcaption className="text-center text-[11px] text-muted">Zoals gevonden</figcaption>
            </figure>
          </div>
          <p className="flex flex-wrap gap-1.5">
            <Badge tone={logoBadge[w.logoStatus][0]}>{logoBadge[w.logoStatus][1]}</Badge>
            {w.logoSource ? <Badge tone="zacht">bron: {w.logoSource}</Badge> : null}
            {w.confidence !== null ? <Badge tone={w.confidence >= 0.85 ? "klaar" : "aandacht"}>Claude {Math.round(w.confidence * 100)}% zeker</Badge> : null}
            {w.logoDomain ? <Badge tone="neutral">logo van {w.logoDomain}</Badge> : null}
          </p>
          {w.logoNote ? <p className="rounded-md bg-vul px-3 py-2 text-sm text-oliebol">{w.logoNote}</p> : null}
          {care && w.logoStatus !== "goedgekeurd" ? (
            <Notice tone="warning">
              {w.domain
                ? `Dit logo komt van ${w.logoDomain || "een onbekende site"}, niet van ${w.domain} (het e-mailadres van de besteller).`
                : "Er is besteld met een privé-mailadres, dus dit logo is op naam gezocht."}{" "}
              Kijk extra goed of het niet van een naamgenoot of concurrent is. Twijfel je? Kies het naambordje.
            </Notice>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {w.logoUrl && w.logoStatus !== "goedgekeurd" ? (
              <button type="button" className={primaryButton} disabled={busy} onClick={() => void save({ logoStatus: "goedgekeurd" }, `Het logo van ${w.name} hangt.`)}>
                {care ? "✓ Logo klopt, dit is hetzelfde bedrijf" : "✓ Logo klopt"}
              </button>
            ) : null}
            {w.logoStatus !== "geen" ? (
              <button type="button" className={secondaryButton} disabled={busy} onClick={() => void save({ logoStatus: "geen" }, `${w.name} hangt met het naambordje.`)}>
                Alleen het naambordje
              </button>
            ) : null}
            <button
              type="button"
              className={secondaryButton}
              disabled={busy || w.logoStatus === "zoeken"}
              onClick={() =>
                void act(async () => {
                  const { message } = await backend.searchWallLogo(session, w.key);
                  toast(message);
                })
              }
            >
              {w.logoStatus === "zoeken" ? "Staat klaar voor de logozoeker" : "Zoek opnieuw"}
            </button>
          </div>
          <Segmented<WallInk>
            label="Inkt"
            value={w.ink}
            onChange={(ink) => void save({ ink })}
            options={[
              ["donker", "Donkere inkt"],
              ["licht", "Lichte inkt"],
              ["kleur", "Eigen kleur"]
            ]}
          />
          <div className="grid gap-1.5">
            <label htmlFor="wof-logo" className={fieldLabel}>
              Ander logo (link)
            </label>
            <div className="flex gap-2">
              <input id="wof-logo" className={inputClass} placeholder="https://…/logo.svg" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
              <button type="button" className={quickButton} disabled={busy || !logoUrl.trim()} onClick={() => void save({ logoUrl, logoStatus: "nakijken" }, "Logo vervangen. Kijk of het goed hangt en keur het goed.").then(() => setLogoUrl(""))}>
                Gebruik
              </button>
            </div>
            <p className="text-xs text-muted">Bijvoorbeeld het logo dat de klant mailde. Een SVG of PNG met doorzichtige achtergrond hangt het mooist.</p>
          </div>
        </Block>
      ) : (
        <Notice tone="info">Brons staat met de naam op het krijtbord, zonder logo. Vanaf 150 oliebollen (Zilver) zoeken we het logo erbij.</Notice>
      )}

      <Block title="Op de muur">
        <div className="grid gap-1.5">
          <label htmlFor="wof-name" className={fieldLabel}>
            Naam op de muur
          </label>
          <div className="flex gap-2">
            <input id="wof-name" className={inputClass} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
            <button type="button" className={quickButton} disabled={busy || name.trim() === w.name} onClick={() => void save({ name }, "Naam aangepast.")}>
              Bewaar
            </button>
          </div>
          <p className="text-xs text-muted">In de bestelling: {w.company}. Korter leest beter op het plaatje en het naambordje.</p>
        </div>
        <dl className="grid gap-1.5 text-sm">
          {(
            [
              ["Toestemming", w.consent === "mail" ? "Akkoord per mail" : "Vinkje in het bestelformulier"],
              ["Bestellingen", w.orderIds.join(", ") || "Uit de orderlijst"],
              ["Eerste bestelling", w.firstOrderAt.slice(0, 16)],
              ["Bijgewerkt", w.updatedBy ? `${w.updatedBy}, ${w.updatedAt.slice(0, 16)}` : w.updatedAt.slice(0, 16)]
            ] as Array<[string, string]>
          ).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[130px_minmax(0,1fr)] gap-3">
              <dt className="text-muted">{k}</dt>
              <dd className="min-w-0 break-words text-krent">{v}</dd>
            </div>
          ))}
        </dl>
        {w.visible ? (
          <button type="button" className={textAction} disabled={busy} onClick={() => void save({ visible: false }, `${w.name} hangt niet meer op de muur.`)}>
            Haal van de muur
          </button>
        ) : (
          <button type="button" className={secondaryButton} disabled={busy} onClick={() => void save({ visible: true }, `${w.name} hangt weer.`)}>
            Hang terug
          </button>
        )}
      </Block>
      {error ? <Notice tone="error">{error}</Notice> : null}
    </Drawer>
  );
}

/** Akkoord per mail: kies een zakelijke bestelling (ook uit de gewone orderlijst) die nog niet op de muur staat. */
function MailConsentDrawer({ state, session, run, season, onClose }: { state: DashboardState; session: Session; run: Run; season: number; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const onWall = new Set(state.wallOfFame.map((w) => w.key));
  // One line per company: several addresses count together.
  const groups = new Map<string, { company: string; date: string; oliebollen: number; orderIds: string[]; firstOrderAt: string; domain: string }>();
  for (const o of state.orders) {
    if (o.category !== "regulier" || !o.locationName.trim() || seasonOf(o.deliveryDate) !== season) continue;
    const key = wallKey(o.locationName, season);
    if (onWall.has(key)) continue;
    const g = groups.get(key) ?? { company: o.locationName.trim(), date: o.deliveryDate, oliebollen: 0, orderIds: [], firstOrderAt: `${o.orderDate ?? o.deliveryDate} 12:00:00`, domain: "" };
    g.oliebollen += o.withRaisins + o.withoutRaisins;
    g.orderIds.push(o.id);
    g.domain ||= domainFromEmail(o.email ?? "");
    const at = `${o.orderDate ?? o.deliveryDate} 12:00:00`;
    if (at < g.firstOrderAt) g.firstOrderAt = at;
    groups.set(key, g);
  }
  const q = query.trim().toLowerCase();
  const list = [...groups.values()].filter((g) => !q || g.company.toLowerCase().includes(q)).sort((a, b) => a.company.localeCompare(b.company, "nl"));

  async function add(g: (typeof list)[number]) {
    setBusy(true);
    setError("");
    try {
      await run(() => backend.addWallEntry(session, g));
      toast(`${g.company} hangt aan de muur.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer title="Akkoord per mail" onClose={onClose}>
      <p className="text-sm text-oliebol">Alleen als de klant schriftelijk akkoord gaf. Naam (vanaf Zilver ook logo) en het aantal ouderen; nooit bedragen.</p>
      <input className={inputClass} placeholder="Zoek een bedrijf" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Zoek een bedrijf" />
      {error ? <Notice tone="error">{error}</Notice> : null}
      {list.length === 0 ? (
        <EmptyState title="Geen zakelijke bestellingen zonder plek." text="Iedereen van dit seizoen met een bestelling staat er al op, of er is nog niets bevestigd." />
      ) : (
        <ul className="grid gap-1.5">
          {list.map((g) => (
            <li key={g.company} className="flex items-center justify-between gap-3 rounded-md bg-papier px-3 py-2.5 shadow-zacht">
              <span className="min-w-0">
                <b className="block truncate text-krent">{g.company}</b>
                <span className="text-xs tabular-nums text-muted">
                  {formatNumber(Math.floor(g.oliebollen / 10))} ouderen · {g.orderIds.length} {g.orderIds.length === 1 ? "bestelling" : "bestellingen"}
                </span>
              </span>
              <button type="button" className={quickButton} disabled={busy} onClick={() => void add(g)}>
                Zet erop
              </button>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}
