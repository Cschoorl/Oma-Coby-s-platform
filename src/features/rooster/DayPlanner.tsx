import { useState, type FormEvent } from "react";
import type { RosterShift, Volunteer } from "../../types/dashboard";
import { Avatar } from "../../components/Avatar";
import { ConfirmPanel, EmptyState, Icon, fieldLabel, ghostButton, inputClass, primaryButton, taskClass, textAction, toast } from "../../components/ui";
import type { Planner } from "./planner";
import { canDo, hintsFor, laneKey, laneLabel, minutes, nameKey, parseTime, plannedDays, type Lane, type RosterDay } from "./roster";

/*
 * One day of the rooster: on the left the shifts with how many people each needs and who is planned,
 * on the right who signed up for that day. Drag a name onto a shift, or use the + buttons.
 */

const stepButton = "grid h-8 w-8 place-items-center rounded-md bg-vul text-base font-bold text-krent hover:bg-vul-2 disabled:cursor-not-allowed disabled:opacity-40";
const dropClass = "bg-gouwe-50 ring-2 ring-gouwe";

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function DayPlanner({ day, lanes, allLanes, p }: { day: RosterDay; lanes: Lane[]; allLanes: Lane[]; p: Planner }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const onDay = p.roster.filter((s) => s.date === day.iso);
  const available = p.persons.filter((v) => lanes.some((l) => canDo(v, l)));
  // Who has nothing yet today comes first: they are the ones to plan.
  const busy = (v: Volunteer) => Number(onDay.some((s) => nameKey(s.name) === nameKey(v.name)));
  const pool = [...available].sort((a, b) => busy(a) - busy(b) || a.name.localeCompare(b.name, "nl"));

  const q = nameKey(query);
  const others = q ? p.persons.filter((v) => !available.includes(v) && nameKey(v.name).includes(q)).slice(0, 6) : [];
  const unknown = q && !p.persons.some((v) => nameKey(v.name) === q) ? query.trim() : "";

  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid content-start">
        <p className={fieldLabel}>Diensten</p>
        {lanes.length === 0 ? <p className="py-3 text-sm text-muted">Op deze dag zijn er geen diensten.</p> : null}
        {lanes.map((lane, i) => (
          <LaneSection key={lane.key} lane={lane} first={i === 0} allLanes={allLanes} editing={editing} setEditing={setEditing} p={p} />
        ))}
      </div>

      <aside
        {...p.target("pool", (drag) => {
          if (drag.kind === "shift") p.remove(drag.id);
        })}
        className={`grid content-start gap-2 rounded-md ${p.over === "pool" && p.drag?.kind === "shift" ? dropClass : ""}`}
        aria-label="Beschikbaar op deze dag"
      >
        <p className={fieldLabel}>
          Beschikbaar op deze dag <span className="tabular-nums">· {pool.length}</span>
        </p>
        {p.drag?.kind === "shift" ? <p className="rounded-md border border-dashed border-lijn-2 px-3 py-2 text-xs text-muted">Laat hier los om iemand van de dienst te halen.</p> : null}
        {pool.length === 0 ? (
          <EmptyState title="Nog niemand voor deze dag." text="Zodra iemand zich voor deze dag aanmeldt, staat die hier. Iemand anders inplannen kan hieronder." />
        ) : (
          <ul className="grid">
            {pool.map((v) => (
              <PoolRow key={v.id} name={v.name} person={v} lanes={lanes} p={p} />
            ))}
          </ul>
        )}

        <label className="relative mt-2 block">
          <span className="sr-only">Zoek iemand anders om in te plannen</span>
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className={`${inputClass} pl-9`} type="search" placeholder="Iemand anders inplannen" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        {q ? (
          <ul className="grid">
            {others.map((v) => (
              <PoolRow key={v.id} name={v.name} person={v} lanes={lanes} p={p} />
            ))}
            {unknown ? <PoolRow name={unknown} lanes={lanes} p={p} /> : null}
          </ul>
        ) : null}
      </aside>
    </div>
  );
}

/** One shift of the day: the task and its time, how many people it needs and who is planned. */
function LaneSection({ lane, first, allLanes, editing, setEditing, p }: { lane: Lane; first: boolean; allLanes: Lane[]; editing: string | null; setEditing: (id: string | null) => void; p: Planner }) {
  const [confirmAll, setConfirmAll] = useState(false);
  const shifts = p.roster.filter((s) => laneKey(s) === lane.key);
  const open = Math.max(0, lane.needed - shifts.length);
  const label = laneLabel(lane);
  // The same shift on the other days; every event of the bar is its own shift, so not for the bar.
  const sameShift = lane.option && lane.role !== "oliebollenbar" ? allLanes.filter((l) => l.option && l.role === lane.role && l.part === lane.part) : [];
  const differs = sameShift.some((l) => l.needed !== lane.needed);

  return (
    <section
      {...p.target(lane.key, (drag) => p.dropOn(lane, drag))}
      aria-label={label}
      className={`grid gap-2 rounded-md py-3 ${first ? "" : "border-t border-lijn"} ${p.over === lane.key ? dropClass : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${taskClass[lane.role]}`}>{label}</span>
          <span className="text-sm tabular-nums text-krent">
            {lane.start}–{lane.end}
          </span>
          {lane.location ? <span className="text-xs text-muted">{lane.location}</span> : null}
        </p>
        {lane.option ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="text-xs text-muted">
              <b className="tabular-nums text-krent">{shifts.length}</b> van
            </span>
            <button type="button" className={stepButton} disabled={lane.needed <= 0} aria-label={`${label}: één minder nodig`} onClick={() => p.setNeeded([{ date: lane.date, role: lane.role, part: lane.part, needed: lane.needed - 1 }])}>
              −
            </button>
            <span className="min-w-[2ch] text-center font-serif text-lg font-bold tabular-nums text-krent" aria-label={`${lane.needed} nodig`}>
              {lane.needed}
            </span>
            <button type="button" className={stepButton} disabled={lane.needed >= 99} aria-label={`${label}: één meer nodig`} onClick={() => p.setNeeded([{ date: lane.date, role: lane.role, part: lane.part, needed: lane.needed + 1 }])}>
              +
            </button>
            <span className="text-xs text-muted">nodig</span>
          </span>
        ) : null}
      </div>

      {differs && !confirmAll ? (
        <p className="-mt-1 text-right">
          <button type="button" className={textAction} onClick={() => setConfirmAll(true)}>
            Zet {lane.needed} op alle dagen
          </button>
        </p>
      ) : null}
      {confirmAll ? (
        <ConfirmPanel
          confirmLabel="Ja, op alle dagen"
          onCancel={() => setConfirmAll(false)}
          onConfirm={() => {
            p.setNeeded(sameShift.map((l) => ({ date: l.date, role: l.role, part: l.part, needed: lane.needed })));
            setConfirmAll(false);
            toast(`${label}: ${lane.needed} nodig op alle ${sameShift.length} dagen.`);
          }}
        >
          <p>
            Bij <b>{label.toLowerCase()}</b> komt op alle {sameShift.length} dagen <b>{lane.needed} nodig</b> te staan. Wat je per dag had ingesteld, vervalt.
          </p>
        </ConfirmPanel>
      ) : null}

      {shifts.length > 0 ? (
        <ul className="grid">
          {shifts.map((s) => (
            <PlannedRow key={s.id} shift={s} lane={lane} editing={editing === s.id} setEditing={setEditing} p={p} />
          ))}
        </ul>
      ) : null}
      {open > 0 ? (
        <p className="rounded-md border border-dashed border-lijn-2 px-3 py-2 text-xs text-muted">
          Nog {open} nodig: sleep een naam hierheen.
        </p>
      ) : null}
    </section>
  );
}

/** Someone on a shift: drag to another shift or day, click the time to change it, × to take them off. */
function PlannedRow({ shift, lane, editing, setEditing, p }: { shift: RosterShift; lane: Lane; editing: boolean; setEditing: (id: string | null) => void; p: Planner }) {
  const hints = hintsFor(shift, p.person(shift.name), lane, p.roster, p.lanesOn(shift.date));
  return (
    <li className={`grid gap-2 py-1.5 ${p.drag?.kind === "shift" && p.drag.id === shift.id ? "opacity-50" : ""}`}>
      <div className="flex cursor-grab items-center gap-2 active:cursor-grabbing" draggable onDragStart={(e) => p.startDrag(e, { kind: "shift", id: shift.id })} onDragEnd={p.endDrag}>
        <Avatar name={shift.name} size={30} />
        <span className="min-w-0 flex-1">
          <button type="button" className="block max-w-full truncate text-left text-sm font-bold text-krent underline-offset-4 hover:underline" onClick={() => p.openPerson(shift.name)}>
            {shift.name}
          </button>
          {shift.note ? <span className="block text-xs text-oliebol">{shift.note}</span> : null}
          {hints.length ? <span className="block text-xs text-muted">{capital(hints.join(" · "))}</span> : null}
        </span>
        <button type="button" className={`${textAction} tabular-nums`} aria-expanded={editing} aria-label={`Tijden van ${shift.name} wijzigen, nu ${shift.start} tot ${shift.end}`} onClick={() => setEditing(editing ? null : shift.id)}>
          {shift.start}–{shift.end}
        </button>
        <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-lg font-bold text-oliebol hover:bg-vul hover:text-krent" aria-label={`Haal ${shift.name} van deze dienst`} onClick={() => p.remove(shift.id)}>
          ×
        </button>
      </div>
      {editing ? <ShiftForm shift={shift} onClose={() => setEditing(null)} p={p} /> : null}
    </li>
  );
}

/** The final times of one shift, and a remark for the planner. */
function ShiftForm({ shift, onClose, p }: { shift: RosterShift; onClose: () => void; p: Planner }) {
  const [start, setStart] = useState(shift.start);
  const [end, setEnd] = useState(shift.end);
  const [note, setNote] = useState(shift.note);
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const from = parseTime(start);
    const to = parseTime(end);
    if (!from || !to) return setError("Vul de tijden in als 7:00 en 9:30.");
    if (minutes(to) <= minutes(from)) return setError("De eindtijd ligt vóór de begintijd.");
    p.save({ id: shift.id, date: shift.date, role: shift.role, part: shift.part, start: from, end: to, name: shift.name, location: shift.location, note: note.trim() });
    onClose();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2 pl-[38px]">
      <label className="grid w-[76px] gap-1">
        <span className={fieldLabel}>Van</span>
        <input className={`${inputClass} tabular-nums`} value={start} onChange={(e) => setStart(e.target.value)} inputMode="numeric" autoFocus />
      </label>
      <label className="grid w-[76px] gap-1">
        <span className={fieldLabel}>Tot</span>
        <input className={`${inputClass} tabular-nums`} value={end} onChange={(e) => setEnd(e.target.value)} inputMode="numeric" />
      </label>
      <label className="grid min-w-[160px] flex-1 gap-1">
        <span className={fieldLabel}>Opmerking</span>
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bijvoorbeeld: rijdt met Bram mee" maxLength={200} />
      </label>
      <button type="submit" className={primaryButton}>
        Opslaan
      </button>
      <button type="button" className={ghostButton} onClick={onClose}>
        Annuleren
      </button>
      {error ? <p className="basis-full text-xs font-bold text-feest-ink">{error}</p> : null}
    </form>
  );
}

/**
 * Someone who can be planned today, with a button per shift. The shifts they signed up for come in the
 * task colour; when they said "put me where you need me", or are planned by hand, the other shifts too.
 */
function PoolRow({ name, person, lanes, p }: { name: string; person?: Volunteer; lanes: Lane[]; p: Planner }) {
  const planned = plannedDays(p.roster, name);
  const max = person?.planning?.maxShifts ?? 0;
  const signedUp = person ? lanes.some((l) => canDo(person, l)) : false;
  const days = (n: number) => `${n} ${n === 1 ? "dag" : "dagen"}`;
  const line = [
    !person ? "staat niet bij de aanmeldingen" : max ? `${planned} van ${days(max)} ingepland` : planned ? `${days(planned)} ingepland` : "nog niet ingepland",
    person && !signedUp ? "niet opgegeven voor deze dag" : "",
    person?.planning?.flexible ? "inzetbaar waar nodig" : ""
  ].filter(Boolean);

  return (
    <li className={`grid gap-1.5 border-b border-lijn py-2 last:border-0 ${p.drag?.kind === "person" && nameKey(p.drag.name) === nameKey(name) ? "opacity-50" : ""}`}>
      <div className="flex cursor-grab items-center gap-2 active:cursor-grabbing" draggable onDragStart={(e) => p.startDrag(e, { kind: "person", name })} onDragEnd={p.endDrag}>
        <Avatar name={name} size={30} />
        <span className="min-w-0 flex-1">
          {person ? (
            <button type="button" className="block max-w-full truncate text-left text-sm font-bold text-krent underline-offset-4 hover:underline" onClick={() => p.openPerson(name)}>
              {name}
            </button>
          ) : (
            <span className="block truncate text-sm font-bold text-krent">{name}</span>
          )}
          <span className="block text-[11px] text-muted">{capital(line.join(" · "))}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1 pl-[38px]">
        {lanes.map((lane) => {
          const label = laneLabel(lane);
          const on = p.roster.some((s) => laneKey(s) === lane.key && nameKey(s.name) === nameKey(name));
          if (on) {
            return (
              <span key={lane.key} className="rounded bg-kerst-50 px-2 py-1 text-[11px] font-bold text-kerst-ink">
                <span className="font-serif">✓</span> {label}
              </span>
            );
          }
          const can = person ? canDo(person, lane) : false;
          // Not signed up for this shift: only offered to who is flexible (bezorgen only with a car of their own),
          // or when the planner looked them up.
          const flexible = person?.planning?.flexible && (lane.role !== "autokoerier" || person.planning.driving === "auto");
          if (!can && signedUp && !flexible) return null;
          return (
            <button
              key={lane.key}
              type="button"
              className={`rounded px-2 py-1 text-[11px] font-bold transition hover:brightness-95 ${can ? taskClass[lane.role] : "bg-vul text-oliebol hover:bg-vul-2"}`}
              aria-label={`${name} inplannen op ${label.toLowerCase()}`}
              onClick={() => p.assign(name, lane)}
            >
              + {label}
            </button>
          );
        })}
      </div>
    </li>
  );
}
