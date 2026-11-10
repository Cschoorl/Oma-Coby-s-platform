# Zakelijk bestellen

Het Google Formulier "Aanvraagformulier zakelijke bestelling 2026" van Mark, als pagina op het platform:
`#/bestellen` (openbaar, zonder code). Beheer handelt de aanvragen af op de pagina **Zakelijk** (`#/zakelijk`).

## De pagina voor de klant

Eén pagina met drie stappen en rechts een overzicht dat meerekent (op telefoon onderaan, met het totaal in een balk).

1. **Hoeveel ouderen laat je dansen?** Drie pakketkaarten, de ladder uit het bouwplan: **Brons** (50 tot 149 oliebollen),
   **Zilver** (150 tot 499, "Tip van Oma") en **Goud** (500 of meer, de donkere kaart: "Het grote feest"). Een pakket geldt
   vanaf zijn aantal: meer blijft dat pakket, minder valt terug naar het pakket eronder. Elk pakket krijgt alles van het
   pakket eronder plus eigen extra's:
   - Brons: impactcertificaat met jullie aantal ouderen, naam op de wall of fame, kaartje met het verhaal bij de oliebollen.
   - Zilver: LinkedIn-badge met kant-en-klare post, logo op de wall of fame, kaartje van Oma voor de besteller.
   - Goud: uitnodiging voor de muziekmiddag zelf, foto of filmpje van jullie middag, podiumplek op de wall of fame.

   Een pakket kiezen zet het aantal op het pakketaantal, 70% met en 30% zonder krenten (in tientallen), in twee tegels met een getekende oliebol met en zonder krenten en een verhoudingsbalk eronder. Daarna schuif je vrij:
   samen 50 tot 10.000 oliebollen (`zakelijk_maximum`; meer gaat via de mail). Onder de aantallen staat bij welk pakket je
   zit. Zak je onder het pakket dat je koos, dan staat er "Onder de 150 val je uit Zilver" met een knop terug; zit je
   vanaf 75% onder het volgende pakket, dan een duwtje ("Nog 30 tot Zilver: … en 3 ouderen extra", knop "Maak er 150 van").
   **Zelf samenstellen** begint met lege aantallen. Daarna extra doneren (€ 20 per 10) en flyers (standaard uit).
   Kies je een pakket, dan ploffen er oliebollen en confetti als vuurwerk uit de medaille (bij Goud een dubbele) en gaan de
   oudjes op de kaart dansen.
2. **Wanneer komt Oma langs?** Afhalen kan niet: we bezorgen altijd. Adres, bezorgkosten (Amsterdam/Aalsmeer € 10,
   daarbuiten € 25; alvast gekozen op basis van de plaats), de dag met dagknoppen (te snel = doorgestreept; bestellen kan
   tot en met de dag ervoor) en hoe laat (9:00–12:30, vóór 10:00 + € 10, vóór 9:00 + € 15).
3. **Je gegevens.** Onderneming, contactpersoon, telefoon, e-mail; factuur naar hetzelfde of een ander adres;
   factuuradres, referentie/grootboeknummer en opmerking zijn optioneel.

Het overzicht toont het pakket, oliebollen × € 2,50, bezorgkosten en toeslag, subtotaal excl. btw, 9% btw en het totaal;
een donatie staat er los onder ("Op je factuur"). Het verhaal: van elke oliebol gaat de helft naar een speciaal
georganiseerde muziekmiddag, en elke 10 oliebollen geven een oudere zo'n middag op de dansvloer (naar beneden afgerond).
Bij versturen met fouten springt de pagina naar het eerste veld en noemt het overzicht wat er nog mist.

Na versturen: bedankt-sticker, "Jullie laten 15 ouderen rock 'n rollen", rollende oliebol en de discozaal van de Tussenstand
met precies het aantal oudjes van deze bestelling ("Dankzij jullie · 15 oudjes"). Tot 300 oudjes (3.000 oliebollen) staat
iedereen op de vloer; daarboven wordt het een mierenhoop en tonen we het rijtje oudjes met het getal. Dan het bestelnummer
(`Z26-0001`), een samenvatting en wat je erbij krijgt bij je pakket. **Nog een adres toevoegen** houdt gegevens en aantallen vast en maakt alleen adres en dag leeg (één bestelling
per adres, zoals in het formulier).

### Nederlands en Engels

Rechtsboven staat een knop **NL | EN**. Alle teksten van het formulier en de bevestiging staan in
`src/features/business/teksten.ts`, in beide talen naast elkaar; het Engels heeft dezelfde vorm, dus een vergeten vertaling
geeft een typefout. Bedragen, getallen en datums volgen de taal (€ 2,50 / €2.50, maandag 14 december / Monday 14 December).
Vaste woorden in het Engels: oliebollen blijft oliebollen ("the Dutch doughnut" in de intro), ouderen zijn seniors,
Oma blijft Oma, Brons/Zilver/Goud worden Bronze/Silver/Gold, btw is VAT, rollator is walker.

Welke taal je eerst ziet: `#/bestellen?taal=en` (of `?taal=nl`) in de link wint, dan wat je eerder koos (bewaard in de
browser), dan de browser. Engels alleen als de browser geen Nederlands kent én je niet in de Nederlandse of Belgische
tijdzone zit, want veel Nederlanders hebben een Engelse browser. Stuur internationale klanten dus de link met `?taal=en`.
De bevestigingsmail, beheer en de Sheet blijven Nederlands.

## De bevestigingsmail

Direct na versturen krijgt de klant een opgemaakte mail (`sendBusinessMails_` in `apps-script/Code.gs`), onderwerp
"Gelukt: jullie laten 15 ouderen dansen (bestelling Z26-0002)". Van boven naar beneden: logo, bedankt-sticker en
"Jullie laten 15 ouderen rock 'n rollen", de discozaal (slinger, discobal-oliebol, letterbord en per 10 oliebollen één
dansend oudje als kleine GIF; rijen van 6 tot 12, hooguit 8 rijen, de rest als getal) met het verhaal van de muziekmiddag,
het bestelnummer, de bestelling (met pakket), wat je erbij krijgt, "Oma komt langs", de kosten, de opmerking, "Wat gebeurt er nu?" in drie stappen, een knop
om te mailen over dit bestelnummer, een groet van Oma Coby en het team, en onderaan de stichting met KvK-nummer. Antwoorden
gaat naar info@; voor vragen staat ook het telefoonnummer van de stichting erin (06 45 44 35 09, `zakelijk_telefoon`).
Bij elke nieuwe aanvraag krijgt info@ (of wie in `zakelijk_melding_naar` staat) direct een korte melding in platte tekst,
met onderneming, pakket, aantal en dag in het onderwerp.

Voorbeelden: [`docs/mail-zakelijke-bevestiging.html`](mail-zakelijke-bevestiging.html) (Zilver, met donatie en opmerking)
en [`docs/mail-zakelijke-bevestiging-goud.html`](mail-zakelijke-bevestiging-goud.html) (Goud, 600 oliebollen, 60 oudjes). Opnieuw maken
na een wijziging in de mail: `node apps-script/mail-preview.mjs`.

## Beheer: pagina Zakelijk

- Bovenaan: nieuw, bevestigd, oliebollen en omzet (bevestigd); daaronder de link naar het formulier om te kopiëren.
- Lijst per status (Nieuw, Bevestigd, Afgewezen, Alles), gesorteerd op leverdag, met labels: *Over N dagen* (binnen 3 dagen),
  *Afhalen* (alleen nog bij oude aanvragen), *Meer dan 1.500* en *Opmerking*.
- Klik een aanvraag voor alle details en bedragen. **Bevestigen** zet hem als order in Bestellingen, Inpakken en Routes
  (de bevestigingsmail stuur je daar, zoals bij andere orders). **Afwijzen** vraagt een reden en geeft daarna een
  mailknop met die reden erin. *Terugzetten naar nieuw* kan altijd.

## In de Google Sheet

| Tabblad | Wat |
|---|---|
| `Zakelijke aanvragen` | één rij per bestelling, gevuld door het script; status via de pagina Zakelijk. Kolom `pakket`: Brons, Zilver, Goud of Zelf samengesteld (leeg bij bestellingen van vóór de pakketten) |
| `Zakelijke dagen` | de dagen op het formulier (`datum`, `soort` bezorgen, `tijd`, `open` ja/nee) |
| `Instellingen` | prijzen en mailadressen, sleutels `zakelijk_*` (zie `apps-script/README.md`) |

Het script maakt beide nieuwe tabbladen zelf aan. `Totaal_lijst bestellingen` blijft onaangeraakt: een bevestigde aanvraag
telt mee als order, tenzij er in Totaal_lijst al een rij met dat ordernummer als Unique ID staat.

Een opgemaakte versie van de tabbladen met uitleg staat in [`docs/sheets/zakelijk-bestellen-tabbladen.xlsx`](sheets/zakelijk-bestellen-tabbladen.xlsx),
en in Max' Google Drive in de map *Oma Coby – Zakelijk bestellen*.

## Rekenen

`businessTotals` in `src/features/business/business.ts` en `businessTotals_` in `apps-script/Code.gs` rekenen hetzelfde;
het script rekent bij versturen alles opnieuw na en controleert dezelfde regels (`validateBusiness` / `validateBusiness_`).
De prijs per oliebol (€ 2,50) volgt het bouwplan en staat vast in het script; Instellingen kan hem niet overschrijven.
Bestellen kan tot en met de dag vóór de bezorgdag (`zakelijk_dagen_vooraf`, standaard 1; afgestemd met Mark).
Prijzen, pakketten en dagen staan standaard in `BUSINESS_DEFAULTS` (`src/config.ts`) en `CONFIG.BUSINESS` (`Code.gs`).
Het pakket volgt uit MET + ZONDER: het grootste pakket waarvan je het aantal haalt (`tierFor` / `businessPackage_`), welke
kaart je ook aanklikte. De extra's per pakket staan in `packageCopy` (`business.ts`) en `BUSINESS_PERKS` (`Code.gs`).

Rekenvoorbeeld: 120 MET + 80 ZONDER, bezorgen in Amsterdam vóór 10:00, 20 gedoneerd →
200 × € 2,50 = € 500,00 + € 10 + € 10 = € 520,00 excl. btw, + € 46,80 btw = € 566,80, + € 40 donatie = € 606,80 op de factuur.

## Nog afstemmen met Mark

- De extra's per pakket komen uit de ladder in het bouwplan; bevestigen dat ze zo kloppen (de kerstballen bij Zilver en
  de bezorging door heel Nederland bij Goud staan er nog niet in).
- Of de donatie zonder btw op de factuur komt (nu: aparte regel, buiten de btw).
- Bezorgdagen 14 december en 4–8 januari vallen buiten de aanmelddagen voor vrijwilligers (15–31 december).
- Spam: het formulier heeft een onzichtbaar lokveld voor bots; komt er toch rommel binnen, dan kan er een limiet per e-mailadres bij.
