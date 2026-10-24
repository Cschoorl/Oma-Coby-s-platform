import type { ReactNode } from "react";
import type { Volunteer, VolunteerRole } from "../../types/dashboard";
import { ACTIVE_ROLES, VOLUNTEER_ROLES, drivingLabel, maxShiftsLabel, reminderLabel, volunteerRoleLabel } from "../../types/dashboard";
import { Avatar, NameTag } from "../../components/Avatar";
import { Icon, Note, fieldLabel, secondaryButton, taskClass } from "../../components/ui";
import { statusLabel, type StaffingStatus } from "../../utils/staffing";
import { whatsappNumber } from "../routes/routeUtils";
import { dayTasks, daysOf, slotsOn, type SeasonDayInfo, type Slot } from "./availability";

/*
 * Planning views after the way rostering tools (Eitje, Planday) show availability: one row per
 * person, one column per day, the staffing per day on top. Click a name for the person, a day for
 * who can that day.
 */

export const statusText: Record<StaffingStatus, string> = { weinig: "text-feest-ink", bijna: "text-gouwe-ink", genoeg: "text-kerst-ink" };
export const statusBg: Record<StaffingStatus, string> = { weinig: "bg-feest-50", bijna: "bg-gouwe-100", genoeg: "bg-kerst-50" };
export const statusSign: Record<StaffingStatus, string> = { weinig: "!", bijna: "~", genoeg: "✓" };

/** "Bezorgen" reads better than "Autokoerier" in tight spots. */
export const shortRole: Record<VolunteerRole, string> = { inpakken: "Inpakken", fietskoerier: "Fiets", autokoerier: "Bezorgen", oliebollenbar: "Bar" };

/** A small swatch in the task colour, for legends and lists. */
export function TaskDot({ role }: { role: VolunteerRole }) {
  return <span aria-hidden="true" className={`inline-block h-3 w-3 shrink-0 rounded-[3px] ${taskClass[role]}`} />;
}

export function TaskLegend({ roles }: { roles: VolunteerRole[] }) {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      {roles.map((r) => (
        <span key={r} className="inline-flex items-center gap-1.5">
          <TaskDot role={r} /> {volunteerRoleLabel[r]}
        </span>
      ))}
    </span>
  );
}

function slotText(slot: Slot): string {
  return [slot.part, slot.time, slot.location].filter(Boolean).join(" · ");
}

/** "6:30–12:00" → "6:30–12", "9:00–12:00" → "9–12": fits a narrow column. Without a time: the dagdeel or "hele dag". */
export function shiftTime(slot: Slot): string {
  return slot.time ? slot.time.replace(/:00/g, "") : slot.part || "hele dag";
}

/** A shift as a block in the task colour with its time, like a planned shift in a rostering tool. */
function ShiftChip({ slot }: { slot: Slot }) {
  return <span className={`block truncate rounded-[5px] px-1 py-[3px] text-center text-[10px] font-bold leading-tight tabular-nums ${taskClass[slot.role]}`}>{shiftTime(slot)}</span>;
}

interface MatrixProps {
  volunteers: Volunteer[];
  /** All volunteers, for the staffing per day (the filter only narrows the rows). */
  everyone: Volunteer[];
  days: SeasonDayInfo[];
  roles: VolunteerRole[];
  selectedPerson?: string;
  selectedDay?: string;
  onPerson: (v: Volunteer) => void;
  onDay: (day: string) => void;
}

const COL = "w-[64px] min-w-[64px]";

/**
 * Rows are people, columns are days. Sticky names on the left, sticky days on top. Above the people,
 * one row per task with that day's shift: its time and how many can against how many are needed.
 * In the cells, each shift someone can do as a block with its time, in the task colour.
 */
export function AvailabilityMatrix({ volunteers, everyone, days, roles, selectedPerson, selectedDay, onPerson, onDay }: MatrixProps) {
  const tasksPerDay = days.map((d) => dayTasks(everyone, d.key, roles));
  // Tasks without moments this season (fietskoerier) only show in the rows, not in the shifts on top.
  const headRoles = roles.filter((r) => ACTIVE_ROLES.includes(r));
  const weekStart = (i: number) => i > 0 && (days[i].weekday === "ma" || seasonGap(days[i - 1], days[i]));
  const line = (i: number) => (weekStart(i) ? "border-l-2 border-l-lijn-2" : "");
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 top-0 z-20 min-w-[150px] bg-papier px-4 pb-1 text-left align-bottom sm:min-w-[210px] sm:px-5">
              <span className={fieldLabel}>{days[0]?.month ?? ""}</span>
            </th>
            {days.map((d, i) => (
              <th key={d.key} scope="col" className={`bg-papier px-0.5 pb-1 font-normal ${line(i)}`}>
                <button
                  type="button"
                  onClick={() => onDay(d.key)}
                  aria-label={`${d.label}: wie kan er`}
                  className={`grid ${COL} justify-items-center rounded-md py-1 leading-tight hover:bg-vul ${selectedDay === d.key ? "bg-gouwe-100" : ""}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted">{d.weekday}</span>
                  <span className="font-serif text-base font-bold tabular-nums text-krent">{d.day}</span>
                </button>
              </th>
            ))}
          </tr>
          {headRoles.map((role, r) => {
            const last = r === headRoles.length - 1;
            return (
              <tr key={role}>
                <th scope="row" className={`sticky left-0 z-20 bg-papier px-4 py-0.5 text-left font-normal sm:px-5 ${last ? "border-b border-lijn-2 pb-2" : ""}`}>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-krent">
                    <TaskDot role={role} />
                    {shortRole[role]}
                    {r === 0 ? <span className="font-normal text-muted">· kunnen / nodig</span> : null}
                  </span>
                </th>
                {days.map((d, i) => {
                  const task = tasksPerDay[i].find((t) => t.role === role && t.moments.length > 0);
                  return (
                    <td key={d.key} className={`bg-papier px-0.5 py-0.5 align-top ${line(i)} ${last ? "border-b border-lijn-2 pb-2" : ""}`}>
                      {task ? (
                        <button
                          type="button"
                          onClick={() => onDay(d.key)}
                          className={`grid ${COL} gap-px rounded-[5px] border border-dashed border-lijn-2 bg-papier px-1 py-[3px] text-center leading-tight hover:bg-vul`}
                          aria-label={`${d.label}, ${volunteerRoleLabel[role]}: ${task.people.length} van ${task.moments.reduce((n, m) => n + m.target, 0)} nodig, ${statusLabel[task.status].toLowerCase()}`}
                        >
                          <span className="truncate text-[10px] text-muted tabular-nums">{task.moments.map((m) => shiftTime(m.slot)).join(" · ")}</span>
                          <b className={`text-[11px] tabular-nums ${statusText[task.status]}`}>
                            {task.status === "weinig" ? <span className="font-serif">! </span> : null}
                            {task.people.length}/{task.moments.reduce((n, m) => n + m.target, 0)}
                          </b>
                        </button>
                      ) : (
                        <span className={`block ${COL} text-center text-[11px] text-muted/40`}>–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </thead>
        <tbody>
          {volunteers.map((v) => {
            const active = selectedPerson === v.id;
            const count = daysOf(v).length;
            return (
              <tr key={v.id} className={`group ${active ? "bg-gouwe-50" : ""}`}>
                <th scope="row" className={`sticky left-0 z-10 border-b border-lijn px-4 py-1 text-left font-normal sm:px-5 ${active ? "bg-gouwe-50" : "bg-papier group-hover:bg-[#fbf6e6]"}`}>
                  <button type="button" onClick={() => onPerson(v)} className="flex w-full items-center gap-2 rounded-md py-0.5 text-left">
                    <Avatar name={v.name} size={30} />
                    <span className="min-w-0">
                      <span className="block max-w-[96px] truncate font-bold text-krent underline-offset-4 group-hover:underline sm:max-w-[150px]">{v.name}</span>
                      <span className="block text-[11px] text-muted">
                        {count} {count === 1 ? "dag" : "dagen"}
                        {v.planning?.maxShifts && v.planning.maxShifts < count ? ` · max ${v.planning.maxShifts}` : ""}
                      </span>
                    </span>
                  </button>
                </th>
                {days.map((d, i) => {
                  const slots = slotsOn(v, d.key).filter((s) => roles.includes(s.role));
                  return (
                    <td key={d.key} className={`border-b border-lijn px-0.5 py-1 align-middle ${line(i)} ${selectedDay === d.key ? "bg-gouwe-50/70" : "group-hover:bg-[#fbf6e6]"}`}>
                      {slots.length ? (
                        <span className={`grid ${COL} gap-0.5`} title={`${v.name}, ${d.label}: ${slots.map((s) => `${volunteerRoleLabel[s.role]}${slotText(s) ? ` (${slotText(s)})` : ""}`).join(", ")}`}>
                          {slots.map((s) => (
                            <ShiftChip key={s.option} slot={s} />
                          ))}
                        </span>
                      ) : (
                        <span aria-hidden="true" className={`block ${COL} text-center text-[11px] leading-none text-lijn-2`}>·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** A break in the season (24 → 27 december) also gets the week line, so the gap is visible. */
function seasonGap(a: SeasonDayInfo, b: SeasonDayInfo): boolean {
  return a.month === b.month && b.day - a.day > 1;
}

const DAY_SHORT = (d: SeasonDayInfo) => `${d.weekday} ${d.day} ${d.month.slice(0, 3)}`;

/** Everything about one volunteer: contact, what they want, when they can. For beheer. */
export function PersonDetails({ v, days, onDay }: { v: Volunteer; days: SeasonDayInfo[]; onDay: (day: string) => void }) {
  const mine = daysOf(v);
  const p = v.planning;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {v.phone ? (
          <a className={secondaryButton} href={`https://wa.me/${whatsappNumber(v.phone)}`} target="_blank" rel="noreferrer">
            <Icon name="whatsapp" />
            WhatsApp
          </a>
        ) : null}
        {v.phone ? (
          <a className={secondaryButton} href={`tel:${v.phone.replace(/\s/g, "")}`}>
            <Icon name="phone" />
            Bellen
          </a>
        ) : null}
        {v.email ? (
          <a className={secondaryButton} href={`mailto:${v.email}`}>
            Mail
          </a>
        ) : null}
      </div>

      <Facts>
        <Fact label="Taken">
          <span className="flex flex-wrap gap-1">
            {VOLUNTEER_ROLES.filter((r) => v.roles[r].wants).map((r) => (
              <span key={r} className={`rounded px-2 py-0.5 text-[11px] font-bold ${taskClass[r]}`}>
                {volunteerRoleLabel[r]}
              </span>
            ))}
          </span>
        </Fact>
        <Fact label="Beschikbaar">
          {mine.length} {mine.length === 1 ? "dag" : "dagen"}
          {p?.maxShifts ? `, wil er hooguit ${maxShiftsLabel(p.maxShifts)}` : ""}
        </Fact>
        {p ? <Fact label="Indelen">{p.flexible ? "Mag ingedeeld worden waar het nodig is" : "Alleen bij de gekozen taak"}</Fact> : null}
        {p?.driving ? <Fact label="Rijbewijs">{drivingLabel[p.driving]}</Fact> : null}
        {v.cargoBike ? <Fact label="Bakfiets">Kan er een lenen</Fact> : null}
        {p ? <Fact label="Herinnering">{p.reminder === "geen" ? "Hoeft niet" : `De dag ervoor via ${reminderLabel[p.reminder]}`}</Fact> : null}
        {v.phone ? <Fact label="Telefoon">{v.phone}</Fact> : null}
        {v.email ? <Fact label="E-mail">{v.email}</Fact> : null}
        {v.address || v.city ? <Fact label="Adres">{[v.address, v.city].filter(Boolean).join(", ")}</Fact> : null}
      </Facts>

      {v.remark ? <Note>{v.remark}</Note> : null}

      <section className="grid gap-1.5">
        <p className={fieldLabel}>Wanneer</p>
        {mine.length === 0 ? <p className="text-sm text-muted">Nog geen dagen opgegeven.</p> : null}
        <ul className="grid">
          {days
            .filter((d) => mine.includes(d.key))
            .map((d) => (
              <li key={d.key} className="border-b border-lijn last:border-0">
                <button type="button" onClick={() => onDay(d.key)} className="grid w-full grid-cols-[84px_minmax(0,1fr)] items-start gap-2 py-2 text-left hover:bg-vul">
                  <span className="text-sm font-bold text-krent">{DAY_SHORT(d)}</span>
                  <span className="grid gap-0.5">
                    {slotsOn(v, d.key).map((s) => (
                      <span key={s.option} className="flex flex-wrap items-center gap-1.5 text-xs text-krent">
                        <TaskDot role={s.role} />
                        {volunteerRoleLabel[s.role]}
                        {slotText(s) ? <span className="text-muted">{slotText(s)}</span> : null}
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </section>
      {v.createdAt ? <p className="text-[11px] text-muted">Aangemeld {v.createdAt}</p> : null}
    </>
  );
}

export function PersonHeader({ v }: { v: Volunteer }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={v.name} size={52} />
      <div className="min-w-0">
        <h2 className="truncate font-serif text-xl font-bold leading-tight text-krent">{v.name}</h2>
        <p className="text-xs text-muted">
          {v.city}
        </p>
      </div>
    </div>
  );
}

function Facts({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[104px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">{children}</dl>;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="pt-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-krent">{children}</dd>
    </>
  );
}

/**
 * Who can on one day, per task and moment, against what is needed. When a task is short, the
 * people who said "put me where you need me" and can that day for another task are suggested.
 */
export function DayRoster({
  volunteers,
  day,
  me,
  onPerson,
  suggest = true
}: {
  volunteers: Volunteer[];
  day: string;
  /** Show who could stand in when a task is short; for planners. */
  suggest?: boolean;
  /** Logged-in name: their tag gets the gouwe ouwe tint. */
  me?: string;
  onPerson?: (v: Volunteer) => void;
}) {
  const tasks = dayTasks(volunteers, day);
  if (tasks.length === 0) return <p className="text-sm text-muted">Op deze dag is er niets te doen.</p>;
  const tag = (v: Volunteer) => {
    const t = <NameTag name={v.name} mine={me !== undefined && v.name.toLowerCase() === me.toLowerCase()} />;
    return onPerson ? (
      <button key={v.id} type="button" className="max-w-full rounded-full hover:ring-2 hover:ring-gouwe" onClick={() => onPerson(v)}>
        {t}
      </button>
    ) : (
      <span key={v.id} className="max-w-full">
        {t}
      </span>
    );
  };
  return (
    <div className="grid gap-4">
      {tasks.map((task) => {
        const elsewhere = suggest && task.status !== "genoeg" ? volunteers.filter((v) => v.planning?.flexible && !task.people.includes(v) && slotsOn(v, day).length > 0) : [];
        return (
          <section key={task.role} className="grid gap-2">
            {(task.moments.length ? task.moments : [null]).map((m, i) => (
              <div key={m?.option ?? i} className="grid gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${taskClass[task.role]}`}>{volunteerRoleLabel[task.role]}</span>
                    {m && slotText(m.slot) ? <span className="text-xs text-muted">{slotText(m.slot)}</span> : null}
                  </p>
                  {m ? (
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${statusBg[m.status]} ${statusText[m.status]}`}>
                      <span className="font-serif">{statusSign[m.status]}</span>
                      {m.people.length} van {m.target} nodig
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(m ? m.people : task.people).map(tag)}
                  {(m ? m.people : task.people).length === 0 ? <span className="text-xs text-muted">Nog niemand.</span> : null}
                </div>
              </div>
            ))}
            {elsewhere.length > 0 ? (
              <div className="grid gap-1.5 rounded-md bg-vul px-2.5 py-2">
                <p className="text-xs text-muted">Kunnen die dag ook bijspringen, want inzetbaar waar nodig:</p>
                <div className="flex flex-wrap gap-1.5">{elsewhere.map(tag)}</div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

