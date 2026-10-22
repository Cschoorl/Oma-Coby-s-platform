# Oma Coby's Oliebollen Platform

Dashboard voor de oliebollenactie: inpakken, opmerkingen en klantbevestigingen, routes, tussenstand,
kosten en vrijwilligers. React + Vite + Tailwind, gehost op GitHub Pages, met de Google Sheet als backend
via een Apps Script.

| Pagina | Voor | Wat |
|---|---|---|
| Inpakken | inpakker, beheer | totalen MET/ZONDER, gebakken invullen en nog te bakken, filter particulier/zakelijk/barter; orders claimen, afvinken en afronden (live); pakbonnen printen |
| Bestellingen | beheer | opmerkingen beoordelen en aanpassen; bevestiging per order controleren en versturen |
| Routes | beheer | **Automatisch indelen**: voorstel wie welke bezorging doet (dagdeel en fiets/auto uit de aanmelding, 15 min per stop, tijdvak van de klant, max. bollen per fiets/auto, fiets binnen 12 km, elke rit vanaf de loods, laatste rit eindigt zo dicht mogelijk bij huis); daarna met de hand bijstellen. Per bezorger en dagdeel een rit met snelste volgorde, km en aankomsttijd per stop; melding bij verouderde routes; route via WhatsApp. Instellingen in `PLANNING` in `src/config.ts` |
| Bezorgen (`#/bezorger`) | bezorger | mobiele pagina met stops, verwachte tijd, aantallen en Maps-route; stop afvinken als afgeleverd |
| Tussenstand | beheer | besteld, ingepakt, bezorgd, omzet min kosten en vergelijking met eerdere jaren; in de grafiekkeuze ook *Aantal oudjes* (de discozaal) (één dansend oudje per tien verkochte oliebollen, met de rollatorbalk naar het doel); onderaan *Deel stand* (kaartje als Post of Story met oudjes, oliebollen en het verschil met vorig jaar) |
| Kosten (voor bezorgers: Kosten indienen) | beheer, bezorger | bon → automatisch uitgelezen → met IBAN indienen; status volgen. Beheer keurt goed/af en betaalt uit; km-vergoeding per bezorger |
| Vrijwilligers | beheer | aanmeldingen en "Waar is nog plek?" (per dag, taak en dagdeel hoeveel mensen er nog nodig zijn); na de actie persoonsgegevens verwijderen |
| Aanmelden (`#/aanmelden`) | openbaar | momenten uit het tabblad Agenda (dag, dagdeel, tijd, locatie); komt in hetzelfde tabblad als het Google Formulier |
| Agenda | beheer | wie wanneer beschikbaar is, uit de aanmeldingen |
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
