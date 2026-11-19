import { useState, type CSSProperties } from "react";
import { fieldLabel } from "../../components/ui";
import { useT } from "./teksten";
import scherderUrl from "../../assets/erik-scherder.jpg";
import amsterdammuseum from "../../assets/voorgangers/amsterdammuseum.svg";
import brandfirm from "../../assets/voorgangers/brandfirm.svg";
import cloudpillo from "../../assets/voorgangers/cloudpillo.svg";
import coinmerce from "../../assets/voorgangers/coinmerce.svg";
import deloitte from "../../assets/voorgangers/deloitte.svg";
import dept from "../../assets/voorgangers/dept.svg";
import eyewish from "../../assets/voorgangers/eyewish.png";
import freshfields from "../../assets/voorgangers/freshfields.svg";
import gisou from "../../assets/voorgangers/gisou.svg";
import heineken from "../../assets/voorgangers/heineken.svg";
import itv from "../../assets/voorgangers/itv.png";
import marie from "../../assets/voorgangers/marie.png";
import mattsleeps from "../../assets/voorgangers/mattsleeps.svg";
import mollie from "../../assets/voorgangers/mollie.png";
import oba from "../../assets/voorgangers/oba.png";
import postcodeloterij from "../../assets/voorgangers/postcodeloterij.png";
import stage from "../../assets/voorgangers/stage.svg";
import uber from "../../assets/voorgangers/uber.svg";

/*
 * Op #/bestellen, in de kop onder "Hoe werkt dat?":
 * - "Waarom muziek?" als uitklap in dezelfde letter; open staat de hele quote van Erik Scherder op een gouden kaart;
 * - over de volle breedte onder de kop een rij logo's van bedrijven die ons voorgingen, die van rechts naar links schuift (oc-marquee in styles.css),
 *   grijs, met hun eigen kleur bij aanwijzen, en elk logo linkt naar de site. Hoogte per vorm: een woordmerk is plat, een beeldmerk vierkant.
 */

type Shape = "plat" | "midden" | "blok";

const LOGOS: Array<{ name: string; src: string; shape: Shape; wit?: boolean }> = [
  { name: "Deloitte", src: deloitte, shape: "plat" },
  { name: "Heineken Experience", src: heineken, shape: "plat" },
  { name: "Uber", src: uber, shape: "plat" },
  { name: "Mollie", src: mollie, shape: "plat" },
  { name: "DEPT", src: dept, shape: "plat" },
  { name: "Stage Entertainment", src: stage, shape: "blok" },
  { name: "Nationale Postcode Loterij", src: postcodeloterij, shape: "blok" },
  { name: "Freshfields", src: freshfields, shape: "plat" },
  { name: "ITV Studios Netherlands", src: itv, shape: "blok", wit: true },
  { name: "Amsterdam Museum", src: amsterdammuseum, shape: "blok" },
  { name: "OBA, Openbare Bibliotheek Amsterdam", src: oba, shape: "midden" },
  { name: "Coinmerce", src: coinmerce, shape: "plat" },
  { name: "Cloudpillo", src: cloudpillo, shape: "plat" },
  { name: "Eye Wish Opticiens", src: eyewish, shape: "midden" },
  { name: "Marie-Stella-Maris", src: marie, shape: "plat" },
  { name: "Gisou", src: gisou, shape: "midden" },
  { name: "MATT Sleeps", src: mattsleeps, shape: "midden" },
  { name: "Brandfirm", src: brandfirm, shape: "plat" }
];

const height: Record<Shape, string> = { plat: "max-h-5", midden: "max-h-7", blok: "max-h-9" };

/**
 * "Waarom muziek?" als rij in de <dl> van de kop, in dezelfde letter als "Hoe werkt dat?". Dicht staat alleen de vraag;
 * open de hele quote van Erik Scherder op een gouden kaart, zodat het formulier niet wegzakt zolang niemand erom vraagt.
 */
export function WaaromMuziek() {
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <div className="col-span-3 -mt-3">
      <dt>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="waarom-muziek"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-[44px] items-center gap-1.5 font-bold text-krent underline decoration-lijn-2 underline-offset-4 hover:decoration-krent"
        >
          {t.whyMusic}
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 fill-none stroke-current transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </dt>
      <dd id="waarom-muziek" hidden={!open} className="pt-6">
        <figure className="relative grid gap-4 rounded-kaart bg-gouwe-50 p-5 pt-7 sm:p-6 sm:pt-8">
          <span
            aria-hidden="true"
            className="absolute -top-5 left-5 grid h-10 w-10 place-items-center rounded-full bg-gouwe pt-3 font-serif text-[40px] font-bold leading-none text-krent shadow-zacht"
          >
            “
          </span>
          <blockquote className="max-w-[60ch] font-serif text-base leading-relaxed text-krent">{t.scherderQuote}</blockquote>
          <figcaption className="flex items-center gap-3">
            <img
              src={scherderUrl}
              alt=""
              width={440}
              height={440}
              className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-gouwe ring-offset-2 ring-offset-gouwe-50 [filter:grayscale(1)_sepia(0.35)_contrast(1.05)]"
            />
            <span className="grid text-xs leading-snug">
              <span className="text-sm font-bold text-krent">Prof. dr. Erik J.A. Scherder</span>
              <span className="text-oliebol">{t.scherderRole}</span>
              <span className="text-[11px] text-muted">{t.scherderCredit}</span>
            </span>
          </figcaption>
        </figure>
      </dd>
    </div>
  );
}

/** Eén rij logo's onder een kopje die van rechts naar links schuift. De logo's linken nergens heen. */
export function LogoBanner() {
  const t = useT();
  return (
    <section aria-labelledby="voorgangers-titel" className="grid gap-2">
      <h2 id="voorgangers-titel" className={fieldLabel}>
        {t.voorgangersTitle}
      </h2>
      {/* Stil bij aanwijzen of met het toetsenbord erop; met "minder beweging" gewoon naast elkaar. De kopie is voor het
          naadloos doorlopen en blijft buiten de tabvolgorde en schermlezers. */}
      <div className="oc-marquee">
        <div className="oc-marquee-track" style={{ "--duur": "45s" } as CSSProperties}>
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy ? true : undefined} className="flex shrink-0">
              {LOGOS.map((l) => (
                <li key={l.name} className="flex h-12 w-28 shrink-0 items-center justify-center px-1.5 sm:w-32">
                  {/* Geen link naar de site van het bedrijf: dan verdwijnen bezoekers van de bestelpagina. */}
                  <span title={l.name} className="flex h-full w-full items-center justify-center px-1.5">
                    <img
                      src={l.src}
                      alt={copy ? "" : l.name}
                      className={`${height[l.shape]} max-w-full object-contain opacity-70 ${l.wit ? "brightness-0" : "grayscale"}`}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
