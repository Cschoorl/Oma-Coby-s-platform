# Oma Coby's Oliebollen Platform

Dashboard voor de oliebollenactie: inpakken, opmerkingen en klantbevestigingen, routes, tussenstand,
kosten en vrijwilligers. React + Vite + Tailwind, gehost op GitHub Pages, met de Google Sheet als backend
via een Apps Script.

| Pagina | Voor | Wat |
|---|---|---|
| Inpakken | inpakker, beheer | totalen MET/ZONDER, gebakken en nog te bakken, particulier/B2B; orders claimen, afvinken en afronden (live) |
| Opmerkingen & bevestiging | beheer | opmerkingen beoordelen en aanpassen; bevestiging per order controleren en versturen |
| Routes | beheer | snelste volgorde en kilometers per bezorger; route via WhatsApp sturen |
| Bezorgers (`#/bezorger`) | bezorger, beheer | mobiele pagina met stops, aantallen, opmerkingen en Maps-route |
| Tussenstand | beheer | bestellingen, oliebollen en omzet vergeleken met eerdere jaren |
| Kosten | iedereen met code | foto van bon → automatisch uitgelezen → controleren → opslaan in de Sheet |
| Vrijwilligers | beheer | overzicht van aanmeldingen uit het Google Formulier en de aanmeldpagina |
| Aanmelden (`#/aanmelden`) | openbaar | zelfde vragen als het Google Formulier, komt in hetzelfde tabblad |
| Agenda | iedereen met code | wie wanneer beschikbaar is, uit de aanmeldingen |

## Starten

```bash
npm ci
npm run dev
```

Zonder `VITE_APPS_SCRIPT_URL` draait het dashboard in **demo-modus**: voorbeelddata en wijzigingen alleen in
je eigen browser. Demo-codes: `beheer`, `inpak`, `bezorg`.

Koppelen aan de Google Sheet: zie [apps-script/README.md](apps-script/README.md).
