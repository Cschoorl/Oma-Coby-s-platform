import { useMemo, useState } from "react";
import type { DashboardState, Transport } from "../../types/dashboard";
import { Badge, Card, SectionTitle, StatTile, inputClass, secondaryButton } from "../../components/ui";
import { SIGNUP_DAYS, SIGNUP_PARTS } from "../../config";
import { appLink } from "../../lib/router";
import { whatsappNumber } from "../routes/routeUtils";

export function VolunteersPage({ state }: { state: DashboardState }) {
  const [query, setQuery] = useState("");
  const [transport, setTransport] = useState<Transport | "alle">("alle");
  const [slot, setSlot] = useState<string>("alle");

  const slots = SIGNUP_DAYS.flatMap((day) => SIGNUP_PARTS.map((part) => `${day} ${part}`));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.volunteers.filter((v) => {
      if (transport !== "alle" && !v.transport.includes(transport)) return false;
      if (slot !== "alle" && !v.availability.includes(slot)) return false;
      if (!q) return true;
      return [v.name, v.phone, v.email, v.remark].some((x) => x.toLowerCase().includes(q));
    });
  }, [state.volunteers, query, transport, slot]);

  const bikes = state.volunteers.filter((v) => v.transport.includes("fiets")).length;
  const cars = state.volunteers.filter((v) => v.transport.includes("auto")).length;
  const signupLink = appLink("/aanmelden");

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Aanmeldingen" value={state.volunteers.length} />
        <StatTile label="Op de fiets" value={bikes} />
        <StatTile label="Met de auto" value={cars} />
      </section>

      <Card>
        <SectionTitle
          title="Aanmeldlink"
          subtitle="Deel deze link met vrijwilligers. Ze hebben geen toegangscode nodig."
          action={
            <button type="button" className={secondaryButton} onClick={() => void navigator.clipboard?.writeText(signupLink)}>
              Kopieer link
            </button>
          }
        />
        <p className="break-all rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">{signupLink}</p>
      </Card>

      <Card>
        <SectionTitle title="Vrijwilligers" subtitle={`${filtered.length} van ${state.volunteers.length} getoond`} />
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          <input className={inputClass} type="search" placeholder="Zoek op naam" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select className={inputClass} value={transport} onChange={(e) => setTransport(e.target.value as Transport | "alle")}>
            <option value="alle">Alle vervoer</option>
            <option value="fiets">Fiets</option>
            <option value="auto">Auto</option>
          </select>
          <select className={inputClass} value={slot} onChange={(e) => setSlot(e.target.value)}>
            <option value="alle">Alle dagdelen</option>
            {slots.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          {filtered.map((v) => (
            <article key={v.id} className="grid gap-1 rounded-xl border border-stone-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-stone-900">{v.name}</p>
                <span className="flex gap-1">
                  {v.transport.map((t) => (
                    <Badge key={t} tone="coby">
                      {t}
                    </Badge>
                  ))}
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
              <p className="text-xs text-stone-600">Beschikbaar: {v.availability.join(", ") || "–"}</p>
              {v.remark ? <p className="text-xs text-stone-600">Opmerking: {v.remark}</p> : null}
              <p className="text-[11px] text-stone-400">Aangemeld {v.createdAt}</p>
            </article>
          ))}
          {filtered.length === 0 ? <p className="text-sm text-stone-600">Geen aanmeldingen in deze selectie.</p> : null}
        </div>
      </Card>
    </div>
  );
}
