# Oma Coby's Oliebollen Platform

Dashboard voor de oliebollenactie: inpakken, opmerkingen en klantbevestigingen, routes, tussenstand,
kosten en vrijwilligers. React + Vite + Tailwind, gehost op GitHub Pages, met de Google Sheet als backend
via een Apps Script.

| Pagina | Voor | Wat |
|---|---|---|
| Inpakken | inpakker, beheer | totalen MET/ZONDER, gebakken invullen en nog te bakken, filter particulier/zakelijk/barter; orders claimen, afvinken en afronden (live); per order de dozen (max. 50, MET en ZONDER apart) en doos-labels voor de DYMO; pakbonnen printen |
| Bestellingen | beheer | opmerkingen beoordelen en aanpassen; bevestiging per order controleren en versturen |
| Zakelijk | beheer | aanvragen van het zakelijke bestelformulier nakijken, bevestigen (dan staan ze als order in Bestellingen, Inpakken en Routes) of afwijzen met reden; link naar het formulier kopiëren |
| Routes | beheer | bezorgers indelen (beschikbaar in dat dagdeel bovenaan), snelste volgorde, km en aankomsttijd per stop; melding bij verouderde routes; route via WhatsApp |
| Bezorgen (`#/bezorger`) | bezorger | mobiele pagina met stops, verwachte tijd, aantallen en Maps-route; stop afvinken als afgeleverd |
| Tussenstand | beheer | besteld, ingepakt, bezorgd, omzet min kosten en vergelijking met eerdere jaren; in de grafiekkeuze ook *Discozaal* (één dansend oudje per tien verkochte oliebollen, met de rollatorbalk naar het doel); onderaan *Deel stand* (kaartje als Post of Story met oudjes, oliebollen en het verschil met vorig jaar) |
| Kosten | iedereen met code | bon → automatisch uitgelezen → met IBAN indienen; status volgen. Beheer keurt goed/af en betaalt uit; km-vergoeding per bezorger |
| Vrijwilligers | beheer | wie kan wanneer: een rij per vrijwilliger, een kolom per dag, bezetting per taak bovenaan; klik een naam of dag voor details; na de actie persoonsgegevens verwijderen |
| Aanmelden (`#/aanmelden`) | openbaar | korte vragen één voor één: taak, dag of "maakt niet uit", dan beschikbaarheid, maximum en herinnering (zie `docs/vrijwilligers-aanmelding.md`); momenten uit het tabblad Agenda; komt in hetzelfde tabblad als het Google Formulier |
| Bestellen (`#/bestellen`) | openbaar | zakelijk bestelformulier: MET/ZONDER (min. 50), extra doneren, flyers, bezorgen of afhalen, dag en moment, gegevens voor de factuur; rekent prijs, btw en bezorgkosten mee, met het aantal ouderen als knipoog. Zie `docs/zakelijk-bestellen.md` |
| Agenda | iedereen met code | waar nog plek is (kalender) en wie er op een dag is, per taak; je eigen dagen bovenaan |
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
