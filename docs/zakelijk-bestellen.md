# Zakelijk bestellen

Het Google Formulier "Aanvraagformulier zakelijke bestelling 2026" van Mark, als pagina op het platform:
`#/bestellen` (openbaar, zonder code). Beheer handelt de aanvragen af op de pagina **Zakelijk** (`#/zakelijk`).

## De pagina voor de klant

Eén pagina met drie stappen en rechts een overzicht dat meerekent (op telefoon onderaan, met het totaal in een balk).

1. **Hoeveel ouderen laat je dansen?** Drie pakketkaarten: **Brons** (50 oliebollen, 5 ouderen, zo'n 25 collega's),
   **Zilver** (150, 15 ouderen, zo'n 75 collega's, "Tip van Oma") en **Goud** (500, 50 ouderen, 250+ collega's). De
   richtlijn is 2 oliebollen per collega. Per kaart: het aantal ouderen groot, de oliebollen, het aantal collega's en de prijs
   excl. btw. Een pakket kiezen verdeelt het aantal alvast 70% MET en 30% ZONDER (in tientallen); die verdeling schuif je zelf
   aan, het totaal blijft. **Zelf samenstellen** (onder de kaarten, of "Stel zelf je aantal samen") geeft de vrije aantallen:
   MET en ZONDER in tientallen, samen minimaal 50. Daarna extra doneren (€ 20 per 10) en flyers (standaard uit).
2. **Bezorgen of afhalen.**
   - Bezorgen: adres, bezorgkosten (Amsterdam/Aalsmeer € 10, daarbuiten € 25; de klant kiest dit niet zelf: de postcode
     bepaalt het, zie *Bezorgkosten* hieronder),
     bezorgdag met dagknoppen (te snel = doorgestreept, minimaal 24 uur vóór 9:00) en bezorgmoment
     (9:00–12:30, vóór 10:00 + € 10, vóór 9:00 + € 15).
   - Afhalen: alleen na overleg met info@, dus met een vinkje "afgestemd"; woensdag 30 of donderdag 31 december, 14:00–16:00.
3. **Je gegevens.** Onderneming, contactpersoon, telefoon, e-mail; factuur naar hetzelfde of een ander adres;
   factuuradres, referentie/grootboeknummer en opmerking zijn optioneel.

Het overzicht toont het pakket, oliebollen × € 2,50, bezorgkosten en toeslag, subtotaal excl. btw, 9% btw en het totaal;
een donatie staat er los onder ("Op je factuur"). Het verhaal: van elke oliebol gaat de helft naar een speciaal
georganiseerde muziekmiddag, en elke 10 oliebollen geven een oudere zo'n middag op de dansvloer (naar beneden afgerond).
Bij versturen met fouten springt de pagina naar het eerste veld en noemt het overzicht wat er nog mist.

Na versturen: bedankt-sticker, "Jullie laten 15 ouderen rock 'n rollen", rollende oliebol, bestelnummer (`Z26-0001`) en een
samenvatting. **Nog een adres toevoegen** houdt gegevens en aantallen vast en maakt alleen adres en dag leeg (één bestelling
per adres, zoals in het formulier).

## De bevestigingsmail

Direct na versturen krijgt de klant een opgemaakte mail (`sendBusinessMails_` in `apps-script/Code.gs`), onderwerp
"Gelukt: jullie laten 15 ouderen dansen (bestelling Z26-0002)". Van boven naar beneden: logo, bedankt-sticker en
"Jullie laten 15 ouderen rock 'n rollen", het blok met de oudjes en het verhaal van de muziekmiddag, het bestelnummer,
de bestelling (met pakket), bezorgen of afhalen, de kosten, de opmerking, "Wat gebeurt er nu?" in drie stappen, een knop
om te mailen over dit bestelnummer, een groet van Oma Coby en het team, en onderaan de stichting met KvK-nummer. Antwoorden
gaat naar info@. Info@ (of `zakelijk_melding_naar`) krijgt een korte melding in platte tekst.

Voorbeelden: [`docs/mail-zakelijke-bevestiging.html`](mail-zakelijke-bevestiging.html) (Zilver, bezorgen, met donatie
en opmerking) en [`docs/mail-zakelijke-bevestiging-afhalen.html`](mail-zakelijke-bevestiging-afhalen.html). Opnieuw maken
na een wijziging in de mail: `node apps-script/mail-preview.mjs`.

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
| `Zakelijke aanvragen` | één rij per bestelling, gevuld door het script; status via de pagina Zakelijk. Kolom `pakket`: Brons, Zilver, Goud of Zelf samengesteld (leeg bij bestellingen van vóór de pakketten) |
| `Zakelijke dagen` | de dagen op het formulier (`datum`, `soort` bezorgen/afhalen, `tijd`, `open` ja/nee) |
| `Instellingen` | prijzen en mailadressen, sleutels `zakelijk_*` (zie `apps-script/README.md`) |

Het script maakt beide nieuwe tabbladen zelf aan. `Totaal_lijst bestellingen` blijft onaangeraakt: een bevestigde aanvraag
telt mee als order, tenzij er in Totaal_lijst al een rij met dat ordernummer als Unique ID staat.

Een opgemaakte versie van de tabbladen met uitleg staat in [`docs/sheets/zakelijk-bestellen-tabbladen.xlsx`](sheets/zakelijk-bestellen-tabbladen.xlsx),
en in Max' Google Drive in de map *Oma Coby – Zakelijk bestellen*.

## Bezorgkosten

De postcode bepaalt het tarief: **1000–1109** (Amsterdam) en **1430–1433** (Aalsmeer en Kudelstaart) betalen het lage
tarief (`zakelijk_bezorgen_regio`, € 10), alle andere postcodes het hoge (`zakelijk_bezorgen_buiten`, € 25). Zonder
postcode kijkt het formulier naar de plaats (Amsterdam, Aalsmeer of Kudelstaart = laag). Weesp, Diemen en Amstelveen vallen
dus buiten het lage tarief. Andere postcodes erbij? Zet in **Instellingen** de sleutel `zakelijk_postcodes_regio`, bijvoorbeeld
`1000-1109, 1430-1433, 1180-1189` (dan telt Amstelveen ook als regio).

Het script rekent het gebied bij versturen zelf opnieuw uit (`areaFor_`); wat de browser meestuurt telt niet. Past beheer bij
een zakelijke bestelling de postcode of plaats aan, dan worden gebied en bedrag opnieuw berekend.

## Rekenen

`businessTotals` in `src/features/business/business.ts` en `businessTotals_` in `apps-script/Code.gs` rekenen hetzelfde;
het script rekent bij versturen alles opnieuw na en controleert dezelfde regels (`validateBusiness` / `validateBusiness_`).
Prijzen, pakketten en dagen staan standaard in `BUSINESS_DEFAULTS` (`src/config.ts`) en `CONFIG.BUSINESS` (`Code.gs`).
Een pakket blijft alleen staan zolang MET + ZONDER precies het pakketaantal is (`chosenPackage` / `businessPackage_`);
anders is het "Zelf samengesteld".

Rekenvoorbeeld: 120 MET + 80 ZONDER, bezorgen in Amsterdam vóór 10:00, 20 gedoneerd →
200 × € 2,50 = € 500,00 + € 10 + € 10 = € 520,00 excl. btw, + € 46,80 btw = € 566,80, + € 40 donatie = € 606,80 op de factuur.

## Nog afstemmen met Mark

- Besteltermijn: in het bouwplan "tot 12:00 drie dagen vóór de bezorgdag"; het formulier rekent nu nog met minimaal 24 uur
  vóór 9:00 (`zakelijk_uren_vooraf`).
- Extra's per pakket (zoals een vermelding of een bedankkaart bij Goud) staan er nog niet in; eerst bevestigen.

- In het formulier staan de afhaaldagen als "Dinsdag 30" en "Woensdag 31 december"; in 2026 zijn dat woensdag en donderdag.
- Of de donatie zonder btw op de factuur komt (nu: aparte regel, buiten de btw).
- Bezorgdagen 14 december en 4–8 januari vallen buiten de aanmelddagen voor vrijwilligers (15–31 december).
- Spam: het formulier heeft een onzichtbaar lokveld voor bots; komt er toch rommel binnen, dan kan er een limiet per e-mailadres bij.
