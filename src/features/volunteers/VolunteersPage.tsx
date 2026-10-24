import { useMemo, useState } from "react";
import { backend, type AnonymizeResult, type Session } from "../../data/backend";
import type { DashboardState, VolunteerRole } from "../../types/dashboard";
import { ACTIVE_ROLES, VOLUNTEER_ROLES, volunteerRoleLabel } from "../../types/dashboard";
import { Card, CopyButton, EmptyState, Icon, Notice, SectionTitle, Segmented, StatStrip, dangerButton, fieldLabel, ghostButton, inputClass } from "../../components/ui";
import { Drawer } from "../../components/Drawer";
import { appLink } from "../../lib/router";
import { dayTasks, daysOf, planningDays } from "./availability";
import { AvailabilityMatrix, DayRoster, PersonDetails, PersonHeader, TaskLegend, shortRole } from "./PlanningViews";

type RoleFilter = VolunteerRole | "alle";
type Sort = "naam" | "dagen";

interface VolunteersPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>) => Promise<void>;
}

/**
 * Beheer's planning overview, after rostering tools like Eitje: a row per volunteer, a column per
 * day, the staffing per day on top. Click a name for everything about that person, a day for who can.
 */
export function VolunteersPage({ state, session, run }: VolunteersPageProps) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<RoleFilter>("alle");
  const [sort, setSort] = useState<Sort>("naam");
  const [person, setPerson] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);

  const days = useMemo(() => planningDays(state.volunteers), [state.volunteers]);
  const roles = VOLUNTEER_ROLES.filter((r) => ACTIVE_ROLES.includes(r) || state.volunteers.some((v) => v.roles[r].wants));
  const shownRoles = role === "alle" ? roles : [role];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.volunteers
      .filter((v) => shownRoles.some((r) => v.roles[r].wants))
      .filter((v) => !q || [v.name, v.city, v.address ?? "", v.phone, v.email, v.remark].some((x) => x.toLowerCase().includes(q)))
      .sort((a, b) => (sort === "dagen" ? daysOf(b).length - daysOf(a).length : 0) || a.name.localeCompare(b.name, "nl"));
  }, [state.volunteers, query, shownRoles.join(), sort]);

  const count = (r: VolunteerRole) => state.volunteers.filter((v) => v.roles[r].wants).length;
  const shortDays = days.filter((d) => dayTasks(state.volunteers, d.key).some((t) => t.moments.length > 0 && t.status === "weinig")).length;
  const signupLink = appLink("/aanmelden");
  const openPerson = state.volunteers.find((v) => v.id === person) ?? null;
  const openDay = days.find((d) => d.key === day) ?? null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <StatStrip
        items={[
          { label: "Aanmeldingen", value: state.volunteers.length },
          ...ACTIVE_ROLES.map((r) => ({ label: volunteerRoleLabel[r], value: count(r) })),
          { label: "Krappe dagen", value: shortDays, hint: shortDays ? "een taak met ! heeft te weinig" : "overal genoeg mensen" }
        ]}
      />

      <Card>
        <SectionTitle
          title="Wie kan wanneer"
          subtitle="Eén rij per vrijwilliger, één kolom per dag. Klik een naam voor alle gegevens, of een dag voor wie er kan."
          action={<CopyButton text={signupLink} label="Kopieer aanmeldlink" done="Aanmeldlink gekopieerd" />}
        />
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className={`${inputClass} pl-9`} type="search" placeholder="Zoek op naam of woonplaats" aria-label="Zoek vrijwilligers" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <Segmented
            label="Taak"
            value={role}
            onChange={setRole}
            options={[["alle", "Alles"] as [RoleFilter, string], ...roles.map((r) => [r, shortRole[r], count(r)] as [RoleFilter, string, number])]}
          />
          <Segmented
            label="Volgorde"
            value={sort}
            onChange={setSort}
            options={[
              ["naam", "A–Z"],
              ["dagen", "Meeste dagen"]
            ]}
          />
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="Geen vrijwilligers in deze selectie." text="Kies een andere taak of zoek op een andere naam." />
        ) : (
          <AvailabilityMatrix
            volunteers={filtered}
            everyone={state.volunteers}
            days={days}
            roles={shownRoles}
            selectedPerson={person ?? undefined}
            selectedDay={day ?? undefined}
            onPerson={(v) => {
              setDay(null);
              setPerson(v.id);
            }}
            onDay={(d) => {
              setPerson(null);
              setDay(d);
            }}
          />
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <TaskLegend roles={roles} />
          <p className="text-xs text-muted">
            Bovenaan per taak de dienst van die dag, met wie er kunnen tegenover wie er nodig zijn: <b className="text-feest-ink">rood met !</b> te weinig, <b className="text-gouwe-ink">geel</b> bijna,{" "}
            <b className="text-kerst-ink">groen</b> genoeg. Beschikbaarheid, nog geen rooster.
          </p>
        </div>
      </Card>

      <PrivacyCard session={session} run={run} />

      {openPerson ? (
        <Drawer title={openPerson.name} header={<PersonHeader v={openPerson} />} onClose={() => setPerson(null)}>
          <PersonDetails
            v={openPerson}
            days={days}
            onDay={(d) => {
              setPerson(null);
              setDay(d);
            }}
          />
        </Drawer>
      ) : null}
      {openDay ? (
        <Drawer title={openDay.label} onClose={() => setDay(null)}>
          <DayRoster
            volunteers={state.volunteers}
            day={openDay.key}
            onPerson={(v) => {
              setDay(null);
              setPerson(v.id);
            }}
          />
        </Drawer>
      ) : null}
    </div>
  );
}

/** After the action: remove personal data as promised in the consent text. Asks to type a word first. */
function PrivacyCard({ session, run }: { session: Session; run: (change: () => Promise<unknown>) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnonymizeResult | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      let out: AnonymizeResult | null = null;
      await run(async () => {
        out = await backend.anonymize(session, confirm.trim());
      });
      setResult(out);
      setOpen(false);
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verwijderen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card tone="danger">
      <SectionTitle
        title="Na de actie: persoonsgegevens verwijderen (AVG)"
        subtitle="Wist alle aanmeldingen van vrijwilligers, de namen, telefoonnummers, e-mailadressen, adressen en opmerkingen van klanten, IBANs, routes en de bonfoto's in Drive. Aantallen en bedragen blijven staan voor de cijfers van volgend jaar."
      />
      {result ? (
        <Notice tone="success">
          Klaar: {result.volunteers} aanmeldingen verwijderd, {result.orders} bestellingen geanonimiseerd, {result.costs} declaraties zonder naam en IBAN, {result.receipts} bonfoto's naar de prullenbak.
        </Notice>
      ) : null}
      {!open ? (
        <button type="button" className={dangerButton} onClick={() => setOpen(true)}>
          Persoonsgegevens verwijderen…
        </button>
      ) : (
        <div className="grid gap-2">
          <Notice tone="warning">Dit kan niet ongedaan worden gemaakt. Doe dit pas als alles is bezorgd en uitbetaald. Maak eventueel eerst een kopie van de Sheet.</Notice>
          <label className="grid gap-1 text-sm">
            <span className={fieldLabel}>Typ VERWIJDER om te bevestigen</span>
            <input className={`${inputClass} max-w-xs`} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
          </label>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-feest-ink px-4 py-2 text-sm font-bold text-meel hover:bg-feest-hover disabled:cursor-not-allowed disabled:opacity-40" disabled={busy || confirm.trim() !== "VERWIJDER"} onClick={() => void go()}>
              {busy ? "Bezig…" : "Definitief verwijderen"}
            </button>
            <button type="button" className={ghostButton} disabled={busy} onClick={() => setOpen(false)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
