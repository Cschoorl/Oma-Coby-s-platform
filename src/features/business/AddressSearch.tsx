import { useEffect, useId, useRef, useState } from "react";
import { inputClass } from "../../components/ui";
import { formatPostcode } from "./business";

/*
 * Adres zoeken tijdens het typen, met de Locatieserver van PDOK (de adressen van het Kadaster, gratis en zonder sleutel).
 * Kies je een adres, dan vullen we straat met huisnummer, postcode en plaats in; typ je gewoon door, dan blijft het een
 * gewoon tekstveld. Alleen Nederlandse adressen; lukt het zoeken niet, dan merkt de klant er niets van.
 */

const PDOK = "https://api.pdok.nl/bzk/locatieserver/search/v3_1";

interface Suggestion {
  id: string;
  label: string;
}

export interface FoundAddress {
  street: string;
  postalCode: string;
  city: string;
}

export function AddressSearch({ id, value, onChange, onPick, invalid, describedBy, listLabel }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onPick: (a: FoundAddress) => void;
  invalid?: boolean;
  describedBy?: string;
  /** Naam van de lijst voor schermlezers ("Adressen"). */
  listLabel: string;
}) {
  const listId = useId();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Only search while the customer types, not after a pick fills the field.
  const typed = useRef(false);

  useEffect(() => {
    const q = value.trim();
    if (!typed.current || q.length < 3) {
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`${PDOK}/suggest?q=${encodeURIComponent(q)}&fq=type:adres&rows=6`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: { response?: { docs?: Array<{ id: string; weergavenaam: string }> } }) => {
          const docs = data.response?.docs ?? [];
          setItems(docs.map((d) => ({ id: d.id, label: d.weergavenaam })));
          setActive(-1);
          setOpen(docs.length > 0);
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [value]);

  function pick(s: Suggestion) {
    typed.current = false;
    setOpen(false);
    setItems([]);
    fetch(`${PDOK}/lookup?id=${encodeURIComponent(s.id)}&fl=straatnaam,huis_nlt,postcode,woonplaatsnaam`)
      .then((r) => r.json())
      .then((data: { response?: { docs?: Array<{ straatnaam?: string; huis_nlt?: string; postcode?: string; woonplaatsnaam?: string }> } }) => {
        const d = data.response?.docs?.[0];
        if (!d) return;
        onPick({ street: [d.straatnaam, d.huis_nlt].filter(Boolean).join(" "), postalCode: formatPostcode(d.postcode ?? ""), city: d.woonplaatsnaam ?? "" });
      })
      .catch(() => undefined);
  }

  return (
    <div className="relative">
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="street-address"
        className={`${inputClass} min-h-[44px] w-full`}
        value={value}
        placeholder="Keizersgracht 210"
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
        }}
        onKeyDown={(e) => {
          if (!open || !items.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % items.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
          } else if (e.key === "Enter" && active >= 0) {
            // Enter kiest het adres, en verstuurt niet de stap.
            e.preventDefault();
            pick(items[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open ? (
        <ul id={listId} role="listbox" aria-label={listLabel} className="absolute inset-x-0 top-full z-20 mt-1 grid overflow-hidden rounded-md bg-papier py-1 shadow-zwevend">
          {items.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`cursor-pointer px-3.5 py-2.5 text-sm text-krent ${i === active ? "bg-vul-2" : "hover:bg-vul"}`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
            >
              {s.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
