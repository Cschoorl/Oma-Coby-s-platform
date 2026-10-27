import { useMemo, useState } from "react";
import type { Volunteer } from "../../types/dashboard";
import { StaffingOverview } from "../../components/StaffingOverview";
import { NameTag } from "../../components/Avatar";
import { countSignups } from "../../utils/staffing";
import { Card, CopyButton, EmptyState, Icon, SectionTitle, inputClass, secondaryButton, textAction, todayIso } from "../../components/ui";
import { formDay } from "../routes/routeUtils";
import { daysOf, planningDays, seasonOrder, type SeasonDayInfo } from "../volunteers/availability";
import { DayRoster } from "../volunteers/PlanningViews";

/** Today when it is a season day, else the next season day, else the first. */
function initialDay(days: SeasonDayInfo[]): string {
  const today = formDay(todayIso());
  return days.find((d) => seasonOrder(d.key) >= seasonOrder(today))?.key ?? days[0]?.key ?? "";
}

const short = (d: SeasonDayInfo) => `${d.weekday} ${d.day} ${d.month.slice(0, 3)}`;

/**
 * For everyone with a code: where is still room, and who is there on a day. Pick a day in the
 * calendar; below it, per task, everyone who can, with their own outfit. You see yourself by name.
 */
export function AgendaPage({ volunteers, contactEmail, me }: { volunteers: Volunteer[]; contactEmail: string; me: string }) {
  const days = useMemo(() => planningDays(volunteers), [volunteers]);
  const [picked, setPicked] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const day = picked && days.some((d) => d.key === picked) ? picked : initialDay(days);
  const index = days.findIndex((d) => d.key === day);
  const current = days[index];

  const mine = volunteers.find((v) => v.name.trim().toLowerCase() === me.trim().toLowerCase());
  const found = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? volunteers.filter((v) => v.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, "nl")) : [];
  }, [query, volunteers]);

  const dayChips = (v: Volunteer) => {
    const theirs = daysOf(v);
    return days
      .filter((d) => theirs.includes(d.key))
      .map((d) => (
        <button
          key={d.key}
          type="button"
          onClick={() => setPicked(d.key)}
          className={`rounded px-2 py-0.5 text-[11px] font-bold ${d.key === day ? "bg-krent text-meel" : "bg-vul text-krent hover:bg-vul-2"}`}
        >
          {short(d)}
        </button>
      ));
  };

  if (volunteers.length === 0) {
    return <EmptyState title="Nog niemand ingepland." text="Oma Coby bakt ze niet alleen. Zodra vrijwilligers zich aanmelden, verschijnen ze hier." />;
  }

  return (
    <section className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {mine ? (
        <Card className="flex flex-wrap items-center gap-3">
          <NameTag name={mine.name} mine />
          <p className="text-sm text-krent">Je kunt op {daysOf(mine).length} dagen:</p>
          <div className="flex flex-wrap gap-1">{dayChips(mine)}</div>
        </Card>
      ) : null}

      <Card>
        <SectionTitle title="Waar is nog plek?" subtitle="Met een ! zijn er die dag nog weinig mensen. Klik een dag om te zien wie er is." />
        <StaffingOverview counts={countSignups(volunteers)} selected={day} onPick={setPicked} />
      </Card>

      {current ? (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Wie is er</p>
              <h2 className="font-serif text-xl font-bold leading-tight text-krent">{current.label}</h2>
            </div>
            <div className="flex gap-1.5">
              <button type="button" className={secondaryButton} disabled={index <= 0} onClick={() => setPicked(days[index - 1].key)} aria-label="Vorige dag">
                ←
              </button>
              <button type="button" className={secondaryButton} disabled={index >= days.length - 1} onClick={() => setPicked(days[index + 1].key)} aria-label="Volgende dag">
                →
              </button>
            </div>
          </div>
          <DayRoster volunteers={volunteers} day={day} me={me} suggest={false} />
        </Card>
      ) : null}

      <Card>
        <SectionTitle title="Zoek iemand" subtitle="Op welke dagen kan iemand? Klik een dag om te zien wie er nog meer is." />
        <label className="relative block max-w-sm">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek een naam" aria-label="Zoek een vrijwilliger" type="search" className={`${inputClass} pl-9`} />
        </label>
        {query.trim() ? (
          <ul className="mt-3 grid">
            {found.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2 border-b border-lijn py-2.5 last:border-0">
                <NameTag name={v.name} mine={v === mine} />
                <span className="flex flex-wrap gap-1">{dayChips(v)}</span>
              </li>
            ))}
            {found.length === 0 ? <li className="py-2 text-sm text-muted">Niemand gevonden met die naam.</li> : null}
          </ul>
        ) : null}
      </Card>

      <p className="text-center text-sm text-muted">
        Niet kunnen of anders plannen? Mail naar{" "}
        <a className={textAction} href={`mailto:${contactEmail}`}>
          {contactEmail}
        </a>{" "}
        <CopyButton text={contactEmail} label="Kopieer" done="Gekopieerd" className={textAction} icon={false} />
      </p>
    </section>
  );
}
