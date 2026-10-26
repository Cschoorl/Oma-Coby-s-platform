# Zakelijk bestellen

Het Google Formulier "Aanvraagformulier zakelijke bestelling 2026" van Mark, als pagina op het platform:
`#/bestellen` (openbaar, zonder code). Beheer handelt de aanvragen af op de pagina **Zakelijk** (`#/zakelijk`).

## De pagina voor de klant

Eén pagina met drie stappen en rechts een overzicht dat meerekent (op telefoon onderaan, met het totaal in een balk).

1. **Hoeveel oliebollen?** MET en ZONDER in tientallen, samen minimaal 50; extra doneren (€ 20 per 10); flyers (standaard uit).
2. **Bezorgen of afhalen.**
   - Bezorgen: adres, bezorgkosten (Amsterdam/Aalsmeer € 10, daarbuiten € 25; alvast gekozen op basis van de plaats),
     bezorgdag met dagknoppen (te snel = doorgestreept, minimaal 24 uur vóór 9:00) en bezorgmoment
     (9:00–12:30, vóór 10:00 + € 10, vóór 9:00 + € 15).
   - Afhalen: alleen na overleg met info@, dus met een vinkje "afgestemd"; woensdag 30 of donderdag 31 december, 14:00–16:00.
3. **Je gegevens.** Onderneming, contactpersoon, telefoon, e-mail; factuur naar hetzelfde of een ander adres;
   factuuradres, referentie/grootboeknummer en opmerking zijn optioneel.

Het overzicht toont oliebollen × € 1,83, bezorgkosten en toeslag, subtotaal excl. btw, 9% btw en het totaal; een donatie
staat er los onder ("Op je factuur"). De knipoog: per 10 oliebollen één oudere gratis naar een Gouwe Ouwe-avond, met een
rijtje oudjes. Bij versturen met fouten springt de pagina naar het eerste veld en noemt het overzicht wat er nog mist.

Na versturen: bedankt-sticker, rollende oliebol, aanvraagnummer (`Z26-0001`) en een samenvatting. **Nog een adres
toevoegen** houdt gegevens en aantallen vast en maakt alleen adres en dag leeg (één aanvraag per adres, zoals in het formulier).

## Beheer: pagina Zakelijk

- Bovenaan: nieuw, bevestigd, oliebollen en omzet (bevestigd); daaronder de link naar het formulier om te kopiëren.
- Lijst per status (Nieuw, Bevestigd, Afgewezen, Alles), gesorteerd op leverdag, met labels: *Over N dagen* (binnen 3 dagen),
  *Afhalen*, *Meer dan 1.500* en *Opmerking*.
- Klik een aanvraag voor alle details en bedragen. **Bevestigen** zet hem als order in Bestellingen, Inpakken en Routes
  (de bevestigingsmail stuur je daar, zoals bij andere orders). **Afwijzen** vraagt een reden en geeft daarna een
  mailknop met die reden erin. *Terugzetten naar nieuw* kan altijd.

## In de Google Sheet

| Tabblad | Wat |
|---|---|
| `Zakelijke aanvragen` | één rij per aanvraag, gevuld door het script; status via de pagina Zakelijk |
| `Zakelijke dagen` | de dagen op het formulier (`datum`, `soort` bezorgen/afhalen, `tijd`, `open` ja/nee) |
| `Instellingen` | prijzen en mailadressen, sleutels `zakelijk_*` (zie `apps-script/README.md`) |

Het script maakt beide nieuwe tabbladen zelf aan. `Totaal_lijst bestellingen` blijft onaangeraakt: een bevestigde aanvraag
telt mee als order, tenzij er in Totaal_lijst al een rij met dat ordernummer als Unique ID staat.

Een opgemaakte versie van de tabbladen met uitleg staat in [`docs/sheets/zakelijk-bestellen-tabbladen.xlsx`](sheets/zakelijk-bestellen-tabbladen.xlsx),
en in Max' Google Drive in de map *Oma Coby – Zakelijk bestellen*.

## Rekenen

`businessTotals` in `src/features/business/business.ts` en `businessTotals_` in `apps-script/Code.gs` rekenen hetzelfde;
het script rekent bij versturen alles opnieuw na en controleert dezelfde regels (`validateBusiness` / `validateBusiness_`).
Prijzen en dagen staan standaard in `BUSINESS_DEFAULTS` (`src/config.ts`) en `CONFIG.BUSINESS` (`Code.gs`).

Rekenvoorbeeld: 120 MET + 80 ZONDER, bezorgen in Amsterdam vóór 10:00, 20 gedoneerd →
200 × € 1,83 = € 366,00 + € 10 + € 10 = € 386,00 excl. btw, + € 34,74 btw = € 420,74, + € 40 donatie = € 460,74 op de factuur.

## Nog afstemmen met Mark

- In het formulier staan de afhaaldagen als "Dinsdag 30" en "Woensdag 31 december"; in 2026 zijn dat woensdag en donderdag.
- Of de donatie zonder btw op de factuur komt (nu: aparte regel, buiten de btw).
- Bezorgdagen 14 december en 4–8 januari vallen buiten de aanmelddagen voor vrijwilligers (15–31 december).
- Spam: het formulier heeft een onzichtbaar lokveld voor bots; komt er toch rommel binnen, dan kan er een limiet per e-mailadres bij.
