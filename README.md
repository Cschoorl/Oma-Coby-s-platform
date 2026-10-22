# Oma Coby's Oliebollen Platform

Dashboard voor de oliebollenactie: inpakken, opmerkingen en klantbevestigingen, routes, tussenstand,
kosten en vrijwilligers. React + Vite + Tailwind, gehost op GitHub Pages, met de Google Sheet als backend
via een Apps Script.

| Pagina | Voor | Wat |
|---|---|---|
| Inpakken | inpakker, beheer | totalen MET/ZONDER, gebakken invullen en nog te bakken, filter particulier/zakelijk/barter; orders claimen, afvinken en afronden (live); pakbonnen printen |
| Bestellingen | beheer | opmerkingen beoordelen en aanpassen; bevestiging per order controleren en versturen |
| Routes | beheer | bezorgers indelen (beschikbaar in dat dagdeel bovenaan), snelste volgorde, km en aankomsttijd per stop; melding bij verouderde routes; route via WhatsApp |
| Bezorgen (`#/bezorger`) | bezorger, beheer | mobiele pagina met stops, verwachte tijd, aantallen en Maps-route; stop afvinken als afgeleverd |
| Tussenstand | beheer | de discozaal (één dansend oudje per tien verkochte oliebollen), verkoopteller en rollatorbalk naar het doel; besteld, ingepakt, bezorgd, omzet min kosten en vergelijking met eerdere jaren; de stand van de dag exporteren als afbeelding |
| Kosten | iedereen met code | bon → automatisch uitgelezen → met IBAN indienen; status volgen. Beheer keurt goed/af en betaalt uit; km-vergoeding per bezorger |
| Vrijwilligers | beheer | aanmeldingen en bezettingskalender; na de actie persoonsgegevens verwijderen |
| Aanmelden (`#/aanmelden`) | openbaar | momenten uit het tabblad Agenda (dag, dagdeel, tijd, locatie); komt in hetzelfde tabblad als het Google Formulier |
| Agenda | iedereen met code | wie wanneer beschikbaar is, uit de aanmeldingen |
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
