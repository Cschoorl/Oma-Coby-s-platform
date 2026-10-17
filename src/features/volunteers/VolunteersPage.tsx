import { useMemo, useState } from "react";
import type { DashboardState, VolunteerRole } from "../../types/dashboard";
import { VOLUNTEER_ROLES, volunteerRoleLabel } from "../../types/dashboard";
import { Badge, Card, SectionTitle, StatStrip, inputClass, secondaryButton } from "../../components/ui";
import { appLink } from "../../lib/router";
import { whatsappNumber } from "../routes/routeUtils";
import { StaffingCalendar } from "../../components/StaffingCalendar";
import { countSignups } from "../../utils/staffing";

/** "Vrijdag 19 december: middag" → "19 december"; used to filter on a day regardless of role or dagdeel. */
function dayKey(option: string): string {
  const match = option.match(/(\d{1,2})\s+([a-zà-ÿ]+)/i);
  return match ? `${Number(match[1])} ${match[2].toLowerCase()}` : option.toLowerCase();
}

const MONTH_ORDER = ["november", "december", "januari"];

export function VolunteersPage({ state }: { state: DashboardState }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<VolunteerRole | "alle">("alle");
  const [day, setDay] = useState("alle");

  const days = useMemo(() => {
    const all = new Set<string>();
    for (const v of state.volunteers) for (const r of VOLUNTEER_ROLES) for (const d of v.roles[r].days) all.add(dayKey(d));
    return Array.from(all).sort((a, b) => {
      const [da, ma] = a.split(" ");
      const [db, mb] = b.split(" ");
      return MONTH_ORDER.indexOf(ma) - MONTH_ORDER.indexOf(mb) || Number(da) - Number(db);
    });
  }, [state.volunteers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.volunteers.filter((v) => {
      const roles = role === "alle" ? VOLUNTEER_ROLES.filter((r) => v.roles[r].wants) : v.roles[role].wants ? [role] : [];
      if (roles.length === 0) return false;
      if (day !== "alle" && !roles.some((r) => v.roles[r].days.some((d) => dayKey(d) === day))) return false;
      if (!q) return true;
      return [v.name, v.city, v.address ?? "", v.phone, v.email, v.remark].some((x) => x.toLowerCase().includes(q));
    });
  }, [state.volunteers, query, role, day]);

  const count = (r: VolunteerRole) => state.volunteers.filter((v) => v.roles[r].wants).length;
  const signupLink = appLink("/aanmelden");

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3">
        <p className="text-sm text-stone-600">
          Aanmeldlink voor vrijwilligers (geen code nodig): <span className="break-all font-medium text-stone-900">{signupLink}</span>
        </p>
        <button type="button" className={secondaryButton} onClick={() => void navigator.clipboard?.writeText(signupLink)}>
          Kopieer link
        </button>
      </div>

      <StatStrip
        items={[
          { label: "Aanmeldingen", value: state.volunteers.length },
          ...VOLUNTEER_ROLES.map((r) => ({
            label: volunteerRoleLabel[r],
            value: count(r),
            hint: r === "fietskoerier" ? `${state.volunteers.filter((v) => v.cargoBike).length} met bakfiets` : undefined
          }))
        ]}
      />

      <Card>
        <SectionTitle title="Bezetting per dag" subtitle="Hoeveel vrijwilligers zich per taak hebben aangemeld, tegenover wat er nodig is. Rood = weinig." />
        <StaffingCalendar counts={countSignups(state.volunteers)} />
      </Card>


      <Card>
        <SectionTitle title="Vrijwilligers" subtitle={`${filtered.length} van ${state.volunteers.length} getoond`} />
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <input className={inputClass} type="search" placeholder="Zoek op naam of woonplaats" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as VolunteerRole | "alle")}>
            <option value="alle">Alle taken</option>
            {VOLUNTEER_ROLES.map((r) => (
              <option key={r} value={r}>
                {volunteerRoleLabel[r]}
              </option>
            ))}
          </select>
          <select className={inputClass} value={day} onChange={(e) => setDay(e.target.value)}>
            <option value="alle">Alle dagen</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          {filtered.map((v) => (
            <article key={v.id} className="grid gap-1 rounded-xl border border-stone-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-stone-900">
                  {v.name}
                  {v.address || v.city ? <span className="font-normal text-stone-500"> · {[v.address, v.city].filter(Boolean).join(", ")}</span> : null}
                </p>
                <span className="flex flex-wrap gap-1">
                  {VOLUNTEER_ROLES.filter((r) => v.roles[r].wants).map((r) => (
                    <Badge key={r} tone="coby">
                      {volunteerRoleLabel[r]}
                    </Badge>
                  ))}
                  {v.cargoBike ? <Badge tone="blue">Bakfiets</Badge> : null}
                </span>
              </div>
              <p className="text-stone-700">
                {v.phone ? (
                  <a className="underline" href={`https://wa.me/${whatsappNumber(v.phone)}`} target="_blank" rel="noreferrer">
                    {v.phone}
                  </a>
                ) : null}
                {v.phone && v.email ? " · " : null}
                {v.email ? (
                  <a className="underline" href={`mailto:${v.email}`}>
                    {v.email}
                  </a>
                ) : null}
              </p>
              {VOLUNTEER_ROLES.filter((r) => v.roles[r].wants && v.roles[r].days.length > 0).map((r) => (
                <p key={r} className="text-xs text-stone-600">
                  <span className="font-semibold">{volunteerRoleLabel[r]}:</span> {v.roles[r].days.join(", ")}
                </p>
              ))}
              {v.remark ? <p className="text-xs text-stone-600">Opmerking: {v.remark}</p> : null}
              {v.createdAt ? <p className="text-[11px] text-stone-400">Aangemeld {v.createdAt}</p> : null}
            </article>
          ))}
          {filtered.length === 0 ? <p className="text-sm text-stone-600">Geen aanmeldingen in deze selectie.</p> : null}
        </div>
      </Card>
    </div>
  );
}
