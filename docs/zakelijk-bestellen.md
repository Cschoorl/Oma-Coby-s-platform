# Zakelijk bestellen

Het Google Formulier "Aanvraagformulier zakelijke bestelling 2026" van Mark, als pagina op het platform:
`#/bestellen` (openbaar, zonder code). Beheer handelt de aanvragen af op de pagina **Zakelijk** (`#/zakelijk`).

## De pagina voor de klant

> **Meeting 23 november 2026** (verwerkt). Waar de tekst hieronder iets anders zegt, geldt dit blok.
> - **Feestpartner vanaf 510** oliebollen in plaats van 501, omdat we per 10 verkopen: 510 oliebollen maakt € 1.990.
> - **Uitleg bij de feestprijs**: onder "Hoeveel gasten verwacht je?" staat altijd dat er vanaf 60 gasten een extra
>   muzikant bij komt en de feestprijs dan € 3.100 is in plaats van € 2.500. Vul je 60 of meer in, dan staat het ook in
>   de prijsopbouw ("met extra muzikant", "daarom is de feestprijs € 600 hoger") en in de bevestigingsmail.
> - **Stap 2** opent met "Alle doordeweekse dagen vanaf maandag 7 december tot en met de eerste week van januari."
> - **Bezorgzones** in plaats van "regio of daarbuiten": zie *Bezorgkosten* hieronder.
> - **Blokje boven het formulier**: "Tot wanneer kan ik bestellen?" (de sluitingstijd, `zakelijk_sluiting`: maandag
>   28 december 12:00, en minimaal 3 werkdagen van tevoren) en "Tot wanneer leveren jullie?" (de laatste dag uit
>   Zakelijke dagen: vrijdag 8 januari). Beide volgen de instellingen.
> - **Linkpreview**: `index.html` heeft een titel, tekst en foto (`public/delen.jpg`, 1200 × 630) voor WhatsApp en
>   LinkedIn. Die apps lezen niets na de `#`, dus elke link naar het platform krijgt dezelfde preview.

> **Feedback 10 november 2026** (verwerkt): prijs € 2,29 excl. btw (€ 2,50 incl.); pakketten heten **Danspartner**,
> **Polonaisepartner** en **Feestpartner** (de sleutels in code en Instellingen blijven `brons`, `zilver`, `goud`); bij
> Polonaisepartner vervangt *Oma Coby's Oliebal (limited edition) voor in de kerstboom* het kaartje van Oma; nieuw blok
> **Adopteer een hele muziekmiddag** (2.500 oliebollen = zo'n 60 ouderen, 3.100 = zo'n 100); doneren staat altijd in beeld,
> ook zonder oliebollen (€ 2,50, € 25, dan per € 25); flyers zijn weg (er gaat altijd een kaartje met het verhaal mee);
> stap 3 vraagt wall of fame, impactcertificaat, LinkedIn-badge en "Hoe kwamen jullie bij ons terecht?" (`?via=naam`
> vult de ambassadeur in); bezorgen in 10xx, 11xx en 1430–1433 voor € 10; alle werkdagen van 7 december tot en met
> 8 januari behalve 25 december en 1 januari, minimaal 3 werkdagen van tevoren en uiterlijk 28 december 12:00.
> Waar de tekst hieronder iets anders zegt, geldt dit blok.

> **Feestpartner (13 november 2026).** Het vierde pakket, onder de drie, met een gouden rand en de Oliebollenbokaal.
> Vanaf 510 oliebollen (was 501; we verkopen per 10); feest op locatie met band voor € 2.500 excl. btw (vanaf 60 gasten
> € 3.100, er komt dan een muzikant bij; het formulier legt dat uit). Van de feestprijs gaat € 1 per oliebol af, tot € 0:
> 510 oliebollen maakt € 1.990, 800 maakt € 1.700. Formulier,
> overzicht en mail tonen de feestprijs en de korting als twee regels. Btw: 21% over het feest, 9% over oliebollen en
> bezorgen. Instellingen: `zakelijk_feest_minimum`, `_prijs`, `_prijs_groot`, `_gasten_groot`, `_korting`, `_btw`.
> Naar de klant heet het "korting"; we noemen het goede-doelendeel niet (zie het impactverhaal hieronder).

Eén pagina met drie stappen en rechts een overzicht dat meerekent (op telefoon onderaan, met het totaal in een balk).

> **Impactverhaal 2026 (besluiten 12 november).** Wel zeggen: "Met 10 oliebollen laat je één oudere rock'n'rollen",
> "de opbrengst" gaat naar "speciaal georganiseerde muziekmiddagen, zoals Gouwe Ouwe", "de 100-jarige Oma Coby",
> feestelijk (dansen, herinneringen). Niet: "de helft van elke bol", "€1 per bol", bedragen per middag of percentages,
> "vaak alleen" of medelijden. Seizoensdoel 40.000 oliebollen = 4.000 ouderen (`GOAL_OLIEBOLLEN`; nog checken bij Gouwe Ouwe).
> - **Intro** opent met wat er gebeurt (de kantine wordt de dancing van vroeger), onder 10 = 1 staat **Hoe werkt dat?**
> - **Bandpartner** (was: Adopteer een hele muziekmiddag): eigen blok onder de pakketten, kop *Of realiseer jullie eigen
>   muziekmiddag*, "Een eigen middag voor 60/100 gasten", zonder poppetjes; voorop naam op de middag, zelf de plek kiezen,
>   collega's mogen komen, foto of filmpje; de bollen als bijzaak ("inclusief 2.500 oliebollen"); knop *Kies deze middag*.
> - **De Partypot** (was: Doneren): € 10 · € 25 · € 50 · € 100 of een eigen bedrag in hele euro's, ook zonder oliebollen.
>   Telt niet in ouderen. Een balkje toont de stand ("€ 1.250 van € 3.000"): formulier en Shopify (producten "Doneer …")
>   samen, via `partypot` in het Apps Script. Het veld `donation` is nu in euro's (kolom `donatie_bedrag`).
> - **Telregel** overal (overzicht, bedankpagina, mail, certificaat, LinkedIn): ouderen = oliebollen ÷ 10, Bandpartner
>   60 of 100; een bijdrage staat er los onder ("+ € 25 in de Partypot") en heet "bijdrage aan de Partypot".
> - **Bezorgtijd** (besluit 11 november): standaard tussen 9:00 en 15:00 zonder toeslag, al gekozen. Dichtgeklapt
>   *Andere tijd nodig?* met alleen vóór 10:00 (+ € 20 excl. btw) als aanvraag: "We laten binnen 2 werkdagen weten of het
>   lukt." De € 20 staat in het totaal met "op aanvraag"; lukt het niet, dan haalt beheer hem eraf. Vóór 9:00 en
>   "tussen 9:00 en 12:30" vervallen. Nog te doen uit dat besluit: verplicht vinkje "iemand aanwezig vanaf 9:00", tekst
>   over vers en opwarmen, "Waar moeten we zijn?" en de contactpersoon op het bezorgadres.
> - **Certificaat en LinkedIn-tekst** maakt beheer in de lade van een aanvraag op **Zakelijk** (`impact.ts`): het
>   certificaat opent als A4 om te printen of als PDF te bewaren; de LinkedIn-tekst opent met de slogan.
>   Het certificaat staat in een leeg tabblad en laadt daar zelf de huisstijl-letters (VTC SuperMarket voor de titel en
>   de regel onder het getal, Vollkorn voor naam en getal, Arvo voor de tekst). Bovenaan de slinger, naast het getal
>   hooguit zes dansende oudjes uit de discozaal (nooit meer dan er dansen), onderaan het logo en de medaille met de
>   pakketnaam in het schuine ovaal. Alleen een bijdrage aan de Partypot: dan staat die bijdrage groot, zonder ouderen.

> **Drie stappen (13 november 2026).** Het formulier toont één stap tegelijk, met bovenaan de stappenbalk
> **1 Jullie bestelling · 2 Waar en wanneer · 3 Gegevens en factuur** en onderaan **Vorige** en **Volgende**.
> *Volgende* kijkt alleen de velden van die stap na (`STEP_FIELDS`); klopt er iets niet, dan blijf je staan en springt de
> pagina naar het eerste veld. Terug gaan houdt alles wat je invulde. Stap 1 vraagt naast pakket en met/zonder krenten
> ook **Waarvoor is het?** (Borrel, Event, Relatiegeschenk; verplicht als je oliebollen bestelt, kolom `aanleiding`) en
> kan rekenen met het **aantal collega's** (2 oliebollen per collega, afgerond op tientallen). Alleen een donatie slaat
> stap 2 over. Enter in een veld is *Volgende*; pas op stap 3 wordt het versturen.

1. **Hoeveel ouderen laat je dansen?** Drie pakketkaarten, de ladder uit het bouwplan: **Brons** (50 tot 149 oliebollen),
   **Zilver** (150 tot 499, "Tip van Oma") en **Goud** (500 of meer, de donkere kaart). Elke kaart is zo kaal mogelijk,
   zoals Coolblue zijn keuzes toont: naam en bereik, het aantal ouderen met de oudjes, drie korte extra's met een vinkje
   (hogere pakketten beginnen met "Alles van Brons"), dan "vanaf € 125,- excl. btw", "Voor ± 25 collega's" en één knop.
   Geen tussenkopjes en geen tabelletje. De extra's staan op de kaart kort ("Impactcertificaat"); voluit staan ze in de
   bevestiging en de mail. Onder de kaarten alleen "Ander aantal? Stel zelf samen". Een pakket geldt
   vanaf zijn aantal: meer blijft dat pakket, minder valt terug naar het pakket eronder. Elk pakket krijgt alles van het
   pakket eronder plus eigen extra's:
   - Brons: impactcertificaat met jullie aantal ouderen, naam op de wall of fame, kaartje met het verhaal bij de oliebollen.
   - Zilver: LinkedIn-badge met kant-en-klare post, logo op de wall of fame, kaartje van Oma voor de besteller.
   - Feestpartner: uitnodiging voor een muziekmiddag, foto of kort filmpje van de middag die jullie mede mogelijk hebben gemaakt, ereplek op de wall of fame, bezorging door heel Nederland.

   Een pakket kiezen zet het aantal op het pakketaantal, 70% met en 30% zonder krenten (in tientallen), in twee tegels met een getekende oliebol met en zonder krenten en een verhoudingsbalk eronder. Daarna schuif je vrij:
   samen 50 tot 10.000 oliebollen (`zakelijk_maximum`; meer gaat via de mail). Onder de aantallen staat bij welk pakket je
   zit. Zak je onder het pakket dat je koos, dan staat er "Onder de 150 val je uit Zilver" met een knop terug; zit je
   vanaf 75% onder het volgende pakket, dan een duwtje ("Nog 30 tot Zilver: … en 3 ouderen extra", knop "Maak er 150 van").
   **Stel zelf samen** houdt de aantallen van het gekozen pakket als begin. Daarna extra doneren (€ 20 per 10) en flyers (standaard uit).
   Kies je een pakket, dan ploffen er oliebollen en confetti als vuurwerk uit de medaille (bij Goud een dubbele) en gaan de
   oudjes op de kaart dansen.
2. **Wanneer komt Oma langs?** Afhalen kan niet: we bezorgen altijd. Adres, bezorgkosten (Amsterdam/Aalsmeer € 10,
   daarbuiten € 25; de klant kiest dit niet zelf: de postcode bepaalt het, zie *Bezorgkosten* hieronder), de dag met dagknoppen (te snel = doorgestreept; bestellen kan
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
Oma blijft Oma, de pakketnamen (Danspartner, Polonaisepartner, Feestpartner) blijven Nederlands, btw is VAT.

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

## Bezorgkosten

Drie zones (besluit 23 november; zone 3 aangepast op 27 november). De **plaats** bepaalt de zone; de klant kiest hem
niet zelf.

| Zone | Tarief excl. btw | Plaatsen |
|---|---|---|
| Zone 1 | € 10 | Aalsmeer, Kudelstaart, Amsterdam (en Amstelveen, Diemen, Duivendrecht, Ouderkerk aan de Amstel en Weesp: die betaalden via hun postcode al € 10) |
| Zone 2 | € 25 | Haarlem, Zaandam, Noordwijk, Leiden, Alphen aan den Rijn, Utrecht, Hilversum, Huizen, Almere |
| Zone 3 | € 25 plus € 0,35 per km | elke andere plaats (Den Haag, Rotterdam, Nieuwegein, Amersfoort, Beverwijk, Purmerend, …) |

- **Een plaats van zone wisselen**: de lijsten staan in `BUSINESS_DEFAULTS.zones` (`src/config.ts`) en
  `CONFIG.BUSINESS.zones` (`apps-script/Code.gs`), één plaats per regel; houd die twee gelijk. Zonder nieuwe versie kan
  het ook in **Instellingen**: `zakelijk_zone1_plaatsen` en `zakelijk_zone2_plaatsen` (plaatsen met een komma ertussen;
  de hele lijst, niet alleen de wijziging). Een wijk of dorp dat met de plaatsnaam begint ("Amsterdam Zuidoost",
  "Almere Haven") telt mee, "Haarlemmermeer" is geen Haarlem, en "'s-Gravenhage" lezen we als "Den Haag".
- **Zone 3 is € 25 plus de kilometers** (Max, 27 november: de kilometerprijs komt er bovenop, zodat zone 3 nooit
  goedkoper is dan zone 2). De € 25 (`zakelijk_bezorgen_zone3_vast`) zit in het bedrag van de bestelling. De
  kilometers zijn op aanvraag en zitten er nog niet in: € 0,35 per km (`zakelijk_bezorgen_per_km`), enkele reis vanaf
  de bakkerij (Aalsmeerderweg 85, Aalsmeer), vastgesteld in de bevestiging. Het formulier toont vooraf een schatting:
  hemelsbreed vanaf de bakkerij maal 1,3 (zoals de routeplanner), met het midden van de postcode van PDOK. Bij het
  versturen rekent het Apps Script de **rijafstand** uit met de ingebouwde Maps-dienst (dezelfde als voor de routes;
  geen API-sleutel nodig) en zet die in de Sheet.
- **Vanaf 500 oliebollen** (Polonaisepartner, `zakelijk_bezorgen_vast_vanaf`) rekenen we in zone 3 geen kilometers:
  alleen de vaste € 25 (besluit Mark, 19 november).
- **In de Sheet** (Zakelijke aanvragen): `bezorgomgeving` (Zone 1, Zone 2 of Zone 3), en bij zone 3 met kilometers
  `bezorgen_nacalculatie` ("Ja, per km (rijafstand)", of "(schatting van het formulier)" als Google geen route vond),
  `bezorg_km` (kilometers enkele reis) en `kilometerprijs_schatting` (km × € 0,35, excl. btw; komt bovenop de € 25 en
  zit niet in `bedrag_excl_btw`). Het script zet de twee nieuwe kolommen er zelf bij. Typ je in
  `kilometerprijs_schatting` het afgesproken bedrag, dan toont de pagina Zakelijk dat bedrag.
- **Beheer** ziet bij een aanvraag de zone met het tarief en, bij zone 3 met kilometers, de schatting en de herinnering
  dat de kilometers niet in het bedrag zitten. De **bevestigingsmail** noemt de zone, de plaats en het tarief, en bij
  zone 3 een eigen regel "Kilometers zone 3 (± 58 km × € 0,35): op aanvraag, ± € 20,30"; het bedrag volgt in de
  bevestiging.
- Rijen van vóór de zones: "Amsterdam/Aalsmeer" telt als zone 1, "Buiten Amsterdam" als zone 3. Bij zo'n oude rij onder
  de 500 oliebollen zat er nog geen € 25 in het bedrag; de pagina Zakelijk toont dat ook zo. Bewerkt beheer zo'n
  bestelling, dan wordt het bedrag opnieuw berekend met de regels van nu. De oude sleutels `zakelijk_bezorgen_regio` en
  `zakelijk_bezorgen_buiten` werken nog zolang `zakelijk_bezorgen_zone1` en `zakelijk_bezorgen_zone3_vast` er niet
  staan; `zakelijk_postcodes_regio` telt niet meer.

Voorbeelden (excl. btw): 100 oliebollen naar Amsterdam € 229 + € 10 = € 239; naar Haarlem € 229 + € 25 = € 254; naar
Rotterdam € 229 + € 25 = € 254, en de kilometers komen er op aanvraag bij (± 58 km × € 0,35 = € 20,30, dus samen
± € 45,30 bezorgen); 500 oliebollen naar Rotterdam € 1.145 + € 25 = € 1.170, zonder kilometers.

Het script rekent de zone bij versturen zelf opnieuw uit (`areaFor_`); wat de browser meestuurt telt niet. Past beheer
bij een zakelijke bestelling de plaats aan, dan worden zone en bedrag opnieuw berekend, en bij zone 3 de rijafstand.

## Bezorgdagen en deadline

Alle doordeweekse dagen van maandag 7 december tot en met vrijdag 8 januari, behalve vrijdag 25 december en vrijdag
1 januari (tabblad **Zakelijke dagen**; dat tabblad wint van de standaard in de code). Bestellen kan tot en met de dag die
3 werkdagen vóór de bezorgdag ligt (`zakelijk_werkdagen_vooraf`): maandag bestellen, donderdag bezorgd. Werkdagen zijn
maandag tot en met vrijdag, zonder 25 en 26 december en 1 januari. Na maandag 28 december 12:00 (`zakelijk_sluiting`) is
zakelijk bestellen dicht: de pagina zegt dan "Zakelijk bestellen is gesloten voor dit seizoen". Op 28 december om 11:30 kan
dus nog donderdag 31 december en de eerste week van januari.

Laten zien hoe dat werkt: `#/bestellen?nu=2026-12-07T10:00` doet op de pagina alsof het dan is (doorgestreepte dagen), en
`#/bestellen?nu=2026-12-28T12:00` toont de gesloten pagina. Alleen de pagina doet alsof; het script kijkt altijd naar de
echte tijd.

## Doneren en muziekmiddagen

- Doneren kan altijd, ook zonder oliebollen: € 2,50 (1 oliebol), € 25 (10 oliebollen, 1 oudere) en verder per € 25. Een
  donatie heeft geen btw (nog navragen). Alleen een donatie: geen minimum, geen adres en geen dag; in de Sheet staat bij
  `afhalen_bezorgen` dan "Alleen donatie" en hij komt na bevestigen niet in Bestellingen, Inpakken of Routes.
- Ouderen: 1 per 10 oliebollen, besteld en gedoneerd samen.
- Precies 2.500 oliebollen is de **Muziekmiddag voor 60 ouderen**, precies 3.100 de **Muziekmiddag voor 100 ouderen**
  (`adoptions` in `config.ts` en `CONFIG.BUSINESS`). Zo'n middag telt het vaste aantal ouderen (plus wat er gedoneerd is),
  niet 1 per 10, en krijgt alle extra's van de pakketten plus livemuziek, de naam op de middag en de keuze van de plek.

## Stap 3: wat mogen we met jullie naam doen?

Alleen met een pakket: wall of fame (toestemming, standaard uit; naam en aantal ouderen, vanaf Polonaisepartner ook logo,
nooit bedragen), impactcertificaat (standaard aan, met de naam erop, vooraf de bedrijfsnaam) en vanaf Polonaisepartner de
LinkedIn-badge. Altijd: "Hoe kwamen jullie bij ons terecht?" (ambassadeur met naam, collega of kennis, vorig jaar al klant,
LinkedIn, Instagram, pers of nieuws, Google, anders). Een link met `?via=naam` (bijv. `#/bestellen?via=kees`) vult
"ambassadeur" en de naam alvast in; de link zelf komt in de kolom `via_link`. Nieuwe kolommen in Zakelijke aanvragen:
`wall_of_fame`, `certificaat`, `naam_certificaat`, `linkedin_badge`, `herkomst`, `ambassadeur`, `via_link`; het script
zet ze er zelf bij.

## Rekenen

`businessTotals` in `src/features/business/business.ts` en `businessTotals_` in `apps-script/Code.gs` rekenen hetzelfde;
het script rekent bij versturen alles opnieuw na en controleert dezelfde regels (`validateBusiness` / `validateBusiness_`).
De prijs per oliebol (€ 2,29 excl. btw, € 2,50 incl.) volgt het zakelijk concept 2026 en staat vast in het script;
Instellingen kan hem niet overschrijven.
Prijzen, pakketten en dagen staan standaard in `BUSINESS_DEFAULTS` (`src/config.ts`) en `CONFIG.BUSINESS` (`Code.gs`).
Het pakket volgt uit MET + ZONDER: het grootste pakket waarvan je het aantal haalt (`tierFor` / `businessPackage_`), welke
kaart je ook aanklikte. De extra's per pakket staan in `packageCopy` (`business.ts`) en `BUSINESS_PERKS` (`Code.gs`).

Rekenvoorbeeld: 110 MET + 40 ZONDER (Polonaisepartner), bezorgen in Diemen, 20 gedoneerd →
150 × € 2,29 = € 343,50 + € 10 = € 353,50 excl. btw, + € 31,82 btw = € 385,32, + € 50 donatie = € 435,32 op de factuur;
17 ouderen.

## Nog afstemmen met Mark

- Bezorgzones (23 november): valt **Den Haag** onder € 25 (nu zone 3) en hoort **Almere** bij zone 2 (nu wel)? Eén
  regel in de lijsten, of `zakelijk_zone2_plaatsen` in Instellingen.
- Plaatsen vlak bij Aalsmeer die in geen lijst staan (Uithoorn, Hoofddorp, Schiphol) zijn zone 3 en betalen € 25 plus
  een paar kilometer, meer dan Amsterdam (€ 10). In zone 1 of 2 zetten?
- Amstelveen, Diemen, Duivendrecht, Ouderkerk aan de Amstel en Weesp staan in zone 1 omdat ze al € 10 betaalden.
  Volendam, Edam en Badhoevedorp (ook 11xx) niet meer: die zijn nu zone 3.

- De extra's per pakket komen uit de ladder in het bouwplan; bevestigen dat ze zo kloppen (de kerstballen bij Zilver en
  de bezorging door heel Nederland bij Goud staan er nog niet in).
- Of de donatie zonder btw op de factuur komt (nu: aparte regel, buiten de btw).
- Muziekmiddag: 2.500 oliebollen geeft zo'n 60 ouderen, terwijl 2.490 oliebollen als Feestpartner 249 ouderen geeft
  (1 per 10). Welke telling klopt?
- De extra's per pakket: het zakelijk concept 2026 (PDF) zat niet in de repo; alleen de wijziging bij Polonaisepartner is
  verwerkt.
- Bezorgdagen 14 december en 4–8 januari vallen buiten de aanmelddagen voor vrijwilligers (15–31 december).
- Spam: het formulier heeft een onzichtbaar lokveld voor bots; komt er toch rommel binnen, dan kan er een limiet per e-mailadres bij.
