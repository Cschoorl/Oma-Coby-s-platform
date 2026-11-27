import { useMemo, useState, type DragEvent } from "react";
import { backend, type Session } from "../../data/backend";
import type { DashboardState, NeededInput, RosterShift, RosterShiftInput } from "../../types/dashboard";
import { Avatar, firstName } from "../../components/Avatar";
import { Drawer } from "../../components/Drawer";
import { Badge, Card, Notice, SectionTitle, Segmented, StatStrip, fieldLabel, secondaryButton, toast, todayIso } from "../../components/ui";
import { patches } from "../../lib/patches";
import type { Patch } from "../../lib/useDashboard";
import { dayKey } from "../../utils/staffing";
import { planningDays } from "../volunteers/availability";
import { PersonDetails, PersonHeader, TaskDot } from "../volunteers/PlanningViews";
import { DayPlanner } from "./DayPlanner";
import type { Drag, Planner } from "./planner";
import { LANE_NAMES, hintsFor, laneKey, lanesOn, moveShift, nameKey, newShift, people, plannedDays, rosterDays, shiftsOf, timeRange, weeksOf, type Lane, type RosterDay } from "./roster";

interface RoosterPageProps {
  state: DashboardState;
  session: Session;
  run: (change: () => Promise<unknown>, patch?: Patch) => Promise<void>;
}

/**
 * The rooster: who works when. A week as an agenda with a column per day and the shifts in the order
 * of the clock; below it the chosen day, where the planner sets how many people a shift needs and puts
 * volunteers on it. Everything is saved in the tab Rooster of the Sheet (the planning sheet).
 */
export function RoosterPage({ state, session, run }: RoosterPageProps) {
  const roster = state.roster ?? [];
  const persons = useMemo(() => people(state.volunteers), [state.volunteers]);
  const days = useMemo(() => rosterDays(roster), [roster]);
  const weeks = useMemo(() => weeksOf(days), [days]);
  const lanesByDay = useMemo(() => new Map(days.map((d) => [d.iso, lanesOn(d.iso, state.agenda, roster)])), [days, state.agenda, roster]);

  const [picked, setPicked] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openName, setOpenName] = useState<string | null>(null);

  // Today when it is a season day, else the next one; after the season the last day.
  const day = days.find((d) => d.iso === picked) ?? days.find((d) => d.iso >= todayIso()) ?? days[days.length - 1];
  const week = weeks.find((w) => w.days.includes(day)) ?? weeks[0];
  const index = days.indexOf(day);

  const byName = useMemo(() => new Map(persons.map((v) => [nameKey(v.name), v])), [persons]);
  // Two people called Jan: then the week shows their full names.
  const sharedFirstNames = useMemo(() => {
    const seen = new Map<string, number>();
    for (const v of persons) seen.set(firstName(v.name).toLowerCase(), (seen.get(firstName(v.name).toLowerCase()) ?? 0) + 1);
    return new Set([...seen].filter(([, n]) => n > 1).map(([name]) => name));
  }, [persons]);

  function act(change: () => Promise<unknown>, patch: Patch) {
    setError(null);
    run(change, patch).catch((err) => setError(err instanceof Error ? err.message : "Opslaan mislukt."));
  }
  const save = (shift: RosterShiftInput) => act(() => backend.saveShift(session, shift), patches.rosterSave(shift, session.name));

  /** Someone stands on a shift once; a second time is a slip of the hand. */
  function taken(name: string, lane: Lane, except?: string): boolean {
    const there = roster.some((s) => s.id !== except && laneKey(s) === lane.key && nameKey(s.name) === nameKey(name));
    if (there) toast(`${name} staat al op deze dienst.`);
    return there;
  }

  const p: Planner = {
    roster,
    persons,
    person: (name) => byName.get(nameKey(name)),
    shortName: (name) => (sharedFirstNames.has(firstName(name).toLowerCase()) ? name : firstName(name)),
    lanesOn: (date) => lanesByDay.get(date) ?? [],
    drag,
    over,
    startDrag: (e: DragEvent, next: Drag) => {
      e.dataTransfer.effectAllowed = "move";
      // Firefox only starts a drag that carries data.
      e.dataTransfer.setData("text/plain", next.kind === "person" ? next.name : next.id);
      setDrag(next);
    },
    endDrag: () => {
      setDrag(null);
      setOver(null);
    },
    target: (key, onDrop) => ({
      onDragOver: (e) => {
        if (!drag) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (over !== key) setOver(key);
      },
      onDragLeave: (e) => {
        // Moving over a child of the target is not leaving it.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === key ? null : o));
      },
      onDrop: (e) => {
        e.preventDefault();
        if (drag) onDrop(drag);
        setDrag(null);
        setOver(null);
      }
    }),
    dropOn: (lane, dropped) => {
      if (dropped.kind === "person") return p.assign(dropped.name, lane);
      const shift = roster.find((s) => s.id === dropped.id);
      if (!shift || laneKey(shift) === lane.key || taken(shift.name, lane, shift.id)) return;
      save(moveShift(shift, lane));
    },
    assign: (name, lane) => {
      if (!taken(name, lane)) save(newShift(lane, name));
    },
    save,
    remove: (id) => act(() => backend.removeShift(session, id), patches.rosterRemove(id)),
    setNeeded: (entries: NeededInput[]) => act(() => backend.setNeeded(session, entries), patches.needed(entries)),
    openPerson: setOpenName
  };

  const allLanes = [...lanesByDay.values()].flat();
  const openIn = (lanes: Lane[]) => lanes.reduce((sum, lane) => sum + Math.max(0, lane.needed - roster.filter((s) => laneKey(s) === lane.key).length), 0);
  const openWeek = openIn(week.days.flatMap((d) => lanesByDay.get(d.iso) ?? []));
  const plannedPeople = new Set(roster.map((s) => nameKey(s.name))).size;
  const notPlanned = persons.filter((v) => plannedDays(roster, v.name) === 0).length;

  const openPerson = openName ? byName.get(nameKey(openName)) : undefined;
  const signupDays = useMemo(() => planningDays(state.volunteers), [state.volunteers]);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <StatStrip
        items={[
          { label: "Open deze week", value: openWeek, hint: `${openIn(allLanes)} plekken in het hele seizoen` },
          { label: "Ingepland", value: roster.length, hint: `${roster.length === 1 ? "dienst" : "diensten"}, ${plannedPeople} ${plannedPeople === 1 ? "vrijwilliger" : "vrijwilligers"}` },
          { label: "Nog in te plannen", value: notPlanned, hint: `van de ${persons.length} aanmeldingen` }
        ]}
      />

      <Card>
        <SectionTitle
          title={`Week van ${week.label}`}
          subtitle="Per dag de diensten, met wie er staat tegenover wie er nodig is. Sleep een naam naar een andere dienst of dag, of klik een dag om te plannen."
          action={
            <Segmented
              label="Week"
              value={week.key}
              onChange={(key) => {
                const next = weeks.find((w) => w.key === key);
                if (next) setPicked((next.days.find((d) => d.iso >= todayIso()) ?? next.days[0]).iso);
              }}
              options={weeks.map((w) => [w.key, w.label] as [string, string])}
            />
          }
        />
        <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:[grid-template-columns:repeat(var(--dagen),minmax(0,1fr))]" style={{ ["--dagen" as string]: week.days.length }}>
          {week.days.map((d) => (
            <DayColumn key={d.iso} day={d} lanes={lanesByDay.get(d.iso) ?? []} selected={d === day} onPick={() => setPicked(d.iso)} p={p} />
          ))}
        </div>
      </Card>

      {/* Between the week and the day: in view from both when a change could not be saved. */}
      {error ? <Notice tone="error">Dat is niet opgeslagen: {error.replace(/\.$/, "")}. Probeer het opnieuw.</Notice> : null}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={fieldLabel}>Plannen</p>
            <h2 className="flex flex-wrap items-center gap-2 font-serif text-xl font-bold leading-tight text-krent">
              {day.label}
              {day.event ? <Badge tone="zacht">{day.event}</Badge> : null}
            </h2>
          </div>
          <div className="flex gap-1.5">
            <button type="button" className={secondaryButton} disabled={index <= 0} onClick={() => setPicked(days[index - 1].iso)} aria-label="Vorige dag">
              ←
            </button>
            <button type="button" className={secondaryButton} disabled={index >= days.length - 1} onClick={() => setPicked(days[index + 1].iso)} aria-label="Volgende dag">
              →
            </button>
          </div>
        </div>
        {/* A new day starts with closed forms and an empty search. */}
        <DayPlanner key={day.iso} day={day} lanes={lanesByDay.get(day.iso) ?? []} allLanes={allLanes} p={p} />
      </Card>

      {backend.kind === "demo" ? null : (
        <p className="text-center text-xs text-muted">Het rooster staat ook in het tabblad Rooster van de Google Sheet, met de definitieve tijden. Wat je daar wijzigt, zie je hier terug.</p>
      )}

      {openPerson ? (
        <Drawer title={openPerson.name} header={<PersonHeader v={openPerson} />} onClose={() => setOpenName(null)}>
          <PersonDetails
            v={openPerson}
            days={signupDays}
            shifts={shiftsOf(roster, openPerson.name)}
            onDay={(key) => {
              const found = days.find((d) => dayKey(d.label) === key);
              setOpenName(null);
              if (found) setPicked(found.iso);
            }}
          />
        </Drawer>
      ) : null}
    </div>
  );
}

/** How full a shift is: planned against needed. Calm on purpose: a count, and a tick when it is full. */
function Fill({ count, needed }: { count: number; needed: number }) {
  if (needed === 0 && count === 0) return <span className="shrink-0 text-[11px] text-muted">niemand nodig</span>;
  const full = count >= needed;
  return (
    <span className={`shrink-0 text-[11px] font-bold tabular-nums ${full ? "text-kerst-ink" : "text-oliebol"}`} aria-label={`${count} van ${needed} ingepland`}>
      {full ? <span className="font-serif">✓ </span> : null}
      {count}/{needed}
    </span>
  );
}

/** One day of the week as an agenda column: the shifts from early to late, with who is planned. */
function DayColumn({ day, lanes, selected, onPick, p }: { day: RosterDay; lanes: Lane[]; selected: boolean; onPick: () => void; p: Planner }) {
  return (
    <section className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start" aria-label={day.label}>
      <button type="button" onClick={onPick} aria-pressed={selected} className={`mb-1 flex items-baseline gap-1.5 rounded-md px-2 py-1.5 text-left ${selected ? "bg-gouwe-100" : "hover:bg-vul"}`}>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{day.weekday}</span>
        <span className="font-serif text-xl font-bold leading-none tabular-nums text-krent">{day.day}</span>
        <span className="text-[11px] text-muted">{day.month.slice(0, 3)}</span>
      </button>
      {lanes.map((lane) => {
        const shifts = p.roster.filter((s) => laneKey(s) === lane.key);
        return (
          <div key={lane.key} {...p.target(lane.key, (drag) => p.dropOn(lane, drag))} className={`grid grid-cols-[minmax(0,1fr)] gap-1.5 rounded-md border-t border-lijn px-2 py-2 ${p.over === lane.key ? "bg-gouwe-50 ring-2 ring-gouwe" : ""}`}>
            <div className="flex items-start justify-between gap-1">
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-xs font-bold text-krent">
                  <TaskDot role={lane.role} />
                  <span className="truncate">{LANE_NAMES[lane.role]}</span>
                </span>
                <span className="block truncate text-[11px] tabular-nums text-muted" title={lane.location || undefined}>
                  {[lane.part, timeRange(lane.start, lane.end), lane.location].filter(Boolean).join(" · ")}
                </span>
              </span>
              <Fill count={shifts.length} needed={lane.needed} />
            </div>
            {shifts.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {shifts.map((s) => (
                  <ShiftChip key={s.id} shift={s} lane={lane} onPick={onPick} p={p} />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

/** Someone on a shift, in the week: drag to another shift or day, click to open that day. */
function ShiftChip({ shift, lane, onPick, p }: { shift: RosterShift; lane: Lane; onPick: () => void; p: Planner }) {
  const hints = hintsFor(shift, p.person(shift.name), lane, p.roster, p.lanesOn(shift.date));
  const ownTime = shift.start !== lane.start || shift.end !== lane.end;
  return (
    // A span, not a button: Firefox does not start a drag on a button.
    <span
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => p.startDrag(e, { kind: "shift", id: shift.id })}
      onDragEnd={p.endDrag}
      onClick={onPick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
      title={[`${shift.name}, ${shift.start}–${shift.end}`, shift.note, ...hints].filter(Boolean).join(" · ")}
      className={`inline-flex max-w-full cursor-grab items-center gap-1 rounded-full bg-vul py-[2px] pl-[2px] pr-2 text-[11px] font-bold text-krent hover:bg-vul-2 active:cursor-grabbing ${
        p.drag?.kind === "shift" && p.drag.id === shift.id ? "opacity-50" : ""
      }`}
    >
      <Avatar name={shift.name} size={20} />
      <span className="truncate">{p.shortName(shift.name)}</span>
      {ownTime ? <span className="font-normal tabular-nums text-muted">{timeRange(shift.start, shift.end)}</span> : null}
      {hints.length ? (
        <span className="font-serif text-gouwe-ink" aria-label="met een opmerking">
          ~
        </span>
      ) : null}
    </span>
  );
}
