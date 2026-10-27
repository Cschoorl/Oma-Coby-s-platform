# Oma Coby's Oliebollen Platform

Dashboard voor de oliebollenactie: inpakken, opmerkingen en klantbevestigingen, routes, tussenstand,
kosten en vrijwilligers. React + Vite + Tailwind, gehost op GitHub Pages, met de Google Sheet als backend
via een Apps Script.

| Pagina | Voor | Wat |
|---|---|---|
| Inpakken | inpakker, beheer | totalen MET/ZONDER, gebakken invullen en nog te bakken, filter particulier/zakelijk/barter/pop-up (pop-upvoorraad telt volledig mee in "nog bakken"); orders claimen, afvinken en afronden (live); per order de dozen (max. 50, MET en ZONDER apart) en doos-labels voor de DYMO; pakbonnen printen |
| Bestellingen | beheer | opmerkingen beoordelen en aanpassen; bevestiging per order controleren en versturen; filter op **soort** (regulier, particulier, pop-up); **nieuwe bestelling** of **extra pop-upvoorraad** aanmaken; per pop-up de **verkochte aantallen** vastleggen; **bewerken** (soort, naam, aantallen MET/ZONDER, leverdatum, bezorgen/afhalen, bezorgmoment, adres, bedrag) en de **wijzigingsgeschiedenis** per bestelling |
| Zakelijk | beheer | aanvragen van het zakelijke bestelformulier nakijken, bevestigen (dan staan ze als order in Bestellingen, Inpakken en Routes) of afwijzen met reden; link naar het formulier kopiëren |
| Routes | beheer | **Automatisch indelen**: voorstel wie welke bezorging doet (dagdeel en fiets/auto uit de aanmelding, 15 min per stop, tijdvak van de klant, max. bollen per fiets/auto, fiets binnen 12 km, elke rit vanaf de loods, laatste rit eindigt zo dicht mogelijk bij huis); daarna met de hand bijstellen. Per bezorger en dagdeel een rit met snelste volgorde, km en aankomsttijd per stop; melding bij verouderde routes; route via WhatsApp. Instellingen in `PLANNING` in `src/config.ts` |
| Bezorgen (`#/bezorger`) | bezorger | mobiele pagina met stops, verwachte tijd, aantallen en Maps-route; stop afvinken als afgeleverd |
| Tussenstand | beheer | besteld, ingepakt, bezorgd, omzet min kosten (van pop-upvoorraad telt alleen wat verkocht is) en vergelijking met eerdere jaren; in de grafiekkeuze ook *Aantal oudjes* (de discozaal: één dansend oudje per tien verkochte oliebollen, live meegeteld met de bestellingen, met de rollatorbalk naar het doel); onderaan *Deel stand* (kaartje als Post of Story met oudjes, oliebollen en het verschil met vorig jaar) |
| Kosten (voor bezorgers: Kosten indienen) | beheer, bezorger | bon → automatisch uitgelezen → met IBAN indienen; status volgen. Beheer keurt goed/af en betaalt uit; km-vergoeding per bezorger |
| Vrijwilligers | beheer | wie kan wanneer: een rij per vrijwilliger, een kolom per dag, bezetting per taak bovenaan; klik een naam of dag voor details; na de actie persoonsgegevens verwijderen |
| Aanmelden (`#/aanmelden`) | openbaar | korte vragen één voor één: taak, dag of "maakt niet uit", dan beschikbaarheid, maximum en herinnering (zie `docs/vrijwilligers-aanmelding.md`); momenten uit het tabblad Agenda; komt in hetzelfde tabblad als het Google Formulier |
| Bestellen (`#/bestellen`) | openbaar | zakelijk bestelformulier: MET/ZONDER (min. 50), extra doneren, flyers, bezorgen of afhalen, dag en moment, gegevens voor de factuur; rekent prijs, btw en bezorgkosten mee, met het aantal ouderen als knipoog. Zie `docs/zakelijk-bestellen.md` |
| Agenda | beheer | "Waar is nog plek?" per dag, taak en dagdeel (klik een dag om te zien wie er is) en wie er op een dag is |
| Pakbonnen (`#/pakbonnen`) | inpakker, beheer | printbare pakbon per order, in routevolgorde |

## Huisstijl

De schermen volgen de huisstijl van Oma Coby's Oliebollenbar: fonts, kleuren en bouwstenen staan in
`tailwind.config.js` en `src/components/ui.tsx`, de regels in [docs/huisstijl-regels.md](docs/huisstijl-regels.md).

## Starten

```bash
npm ci
npm run dev
```

Zonder `VITE_APPS_SCRIPT_URL` draait het dashboard in **demo-modus**: voorbeelddata en wijzigingen alleen in
je eigen browser. Demo-codes: `beheer`, `inpak`, `bezorg`.

Koppelen aan de Google Sheet: zie [apps-script/README.md](apps-script/README.md).

## Soorten bestellingen

Elke order heeft een `category` (`src/lib/categories.ts`), afgeleid uit de kolom `Type`:

| Soort | `Type` in de Sheet | Tussenstand en omzet | Bakken en inpakken | Routes |
|---|---|---|---|---|
| Regulier | `Zakelijk`, `Barter` of leeg | helemaal | helemaal | ja (bij bezorgen) |
| Particulier | `Particulier` (of iets anders) | helemaal | helemaal | ja (bij bezorgen) |
| Pop-upvoorraad | `Pop-up` | alleen wat verkocht is (`state.popupSales`) | helemaal | nee |

Pop-upvoorraad is voorraad die mee gaat naar een pop-up, zonder vaste koper. Gebruik `salesOf(order, state, prijs)`
voor wat meetelt in de tussenstand en `popupLeft(order, state)` voor wat er nog over is.

## Wijzigingslog (voor nieuwe functies)

Elke aanpassing van een bestelling (en van een opmerking) staat in het tabblad `Wijzigingslog` en in
`state.changes` (nieuwste eerst): `{ at, kind, orderId, field, from, to, by, note }`. Hulpfuncties in
`src/lib/orderChanges.ts`:

- `changesFor(state, orderId)` – de geschiedenis van één bestelling;
- `changesSince(state, "2026-12-16 10:00:00", ["withRaisins", "withoutRaisins"])` – bijv. "aantallen gewijzigd na het inpakken" of een waarschuwing in de bakkerij;
- `routeChangedAfter(state, route)` – adres of datum gewijzigd nadat de route berekend is;
- `fieldLabel`, `formatChangeValue`, `formatChangeTime` – om een regel te tonen.

Nieuwe soorten wijzigingen schrijf je in het script met `logChanges_([{ soort, order_id, veld, oud, nieuw, door, rol, toelichting }])`.
