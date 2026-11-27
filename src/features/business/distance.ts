import { useEffect, useState } from "react";
import { PDOK } from "./AddressSearch";
import { POSTCODE, roadKmFromBakery } from "./business";

/*
 * Afstand voor zone 3 (op aanvraag, per kilometer): we zoeken het midden van de postcode op bij PDOK (gratis, zonder
 * sleutel) en schatten de kilometers over de weg vanaf de bakkerij. Alleen een schatting voor op het formulier; het
 * Apps Script rekent bij het versturen de rijafstand uit. Lukt het opzoeken niet, dan tonen we gewoon geen schatting.
 */

const known = new Map<string, number | null>();

/** "POINT(4.31645627 52.07736854)" → { lat, lng } */
function parsePoint(text: string | undefined): { lat: number; lng: number } | null {
  const m = text?.match(/POINT\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/);
  return m ? { lng: Number(m[1]), lat: Number(m[2]) } : null;
}

/**
 * Geschatte kilometers (enkele reis) van de bakkerij naar deze postcode, of null zolang we het niet weten.
 * Zoekt alleen als `enabled` waar is en de postcode compleet is; elke postcode één keer.
 */
export function useDistanceKm(postalCode: string, enabled: boolean): number | null {
  const pc = postalCode.replace(/\s+/g, "").toUpperCase();
  const ready = enabled && POSTCODE.test(pc);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!ready || known.has(pc)) return;
    const ctrl = new AbortController();
    // Even wachten: tijdens het typen van de laatste letters niet meteen zoeken.
    const timer = window.setTimeout(() => {
      fetch(`${PDOK}/free?q=${encodeURIComponent(pc)}&fq=type:postcode&rows=1&fl=centroide_ll`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((data: { response?: { docs?: Array<{ centroide_ll?: string }> } }) => {
          const point = parsePoint(data.response?.docs?.[0]?.centroide_ll);
          known.set(pc, point ? roadKmFromBakery(point) : null);
          setTick((n) => n + 1);
        })
        .catch(() => undefined);
    }, 300);
    return () => {
      window.clearTimeout(timer);
      ctrl.abort();
    };
  }, [pc, ready]);

  return ready ? known.get(pc) ?? null : null;
}
