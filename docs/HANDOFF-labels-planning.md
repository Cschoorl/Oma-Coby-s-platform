# Hand-off: doos-labels, poppetjes en het planningsoverzicht

Dit bestand beschrijft wat er op de branch `feat/labels-avatars-planning` staat en wat het doet.

## Waar het staat

- **Repo:** `maxhelmantel-gif/oma-coby-dashboard` (eigen kloon van `Cschoorl/Oma-Coby-s-platform`)
- **Branch:** `feat/labels-avatars-planning`, gemaakt vanaf `feat/aanmelding-gesprek`. Er is nog geen pull request.
- **Starten:** `npm install` en dan `npm run dev`. Zonder `VITE_APPS_SCRIPT_URL` draait alles in demo-modus.
- **Demo-opslag:** de sleutel is nu `omacoby-demo-v5`, met twaalf extra demo-vrijwilligers verspreid over het seizoen. Wat je in demo-modus onder `v4` had gedaan, staat daar niet meer in.

## 1. Dozen en DYMO-labels (Inpakken)

### Wat het doet

- **Dozen per order.** MET en ZONDER gaan nooit samen in één doos, en er gaan hooguit 50 oliebollen in een doos. Elke soort wordt apart verdeeld, zo gelijk mogelijk:
  - 120 MET wordt 40 · 40 · 40.
  - 51 wordt 26 · 25, nooit 50 · 1.
- **Op elke openstaande order** staat onder de tegels hoe je hem verdeelt, bijvoorbeeld: "Verdeel in 3 dozen MET (40 · 40 · 40) en 1 doos ZONDER (30)."
- **Na Afronden** gaat onder de order het paneel *Labels printen* open:
  - Per soort het aantal dozen, met − en +. Het minimum is het aantal dat nodig is om onder de 50 te blijven. Meer mag, bijvoorbeeld als iemand kleinere dozen pakte.
  - Een voorbeeld van label 1 op ware verhouding.
  - De knop *Print N labels*. Die opent het printvenster van de browser met één label per pagina.
  - Het vinkje *Op dit apparaat meteen printen na Afronden*. Staat het aan, dan gaat het printvenster direct na Afronden open. Dit wordt per apparaat onthouden (`localStorage`, sleutel `omacoby-labels-autoprint`).
- De order blijft in beeld zolang het paneel open is, ook bij het filter *Te doen*. Met *Klaar* gaat het paneel dicht.
- Bij een ingepakte order staat de link *Labels printen*, zodat je later opnieuw kunt printen.
- In de balk boven de orders staat *Labels (N)*. Die print alle labels van de gekozen leverdag (en het gekozen klanttype) in routevolgorde: afhalen achteraan, dan per bezorger op stopvolgorde. Dezelfde volgorde als de pakbonnen.
- Op de pakbon staat nu de doosverdeling in plaats van de kolom *dozen #* / *zakjes #* uit de Sheet. Op de inpakkaart is die Sheet-waarde weggehaald.

### Het label

Formaat DYMO 99014, 54 × 101 mm, liggend. Alleen zwart op wit voor de thermische printer. Op het label staat:

- de klant- of locatienaam (groot) met *t.a.v.*, en het adres of *AFHALEN · locatie*
- *Doos 2/4*: het nummer binnen de hele order (eerst de MET-dozen, dan ZONDER) en het totaal
- het aantal en de soort, groot: *40 MET krenten* met een zwarte rand, *30 ZONDER krenten* wit op zwart, zodat je ze van een afstand uit elkaar houdt
- de leverdag en het bezorgmoment, de bezorger en het stopnummer (als er een route is), en *flyers erin* op doos 1
- het ordernummer en *Oma Coby's Oliebollenbar*

### Printen op de DYMO LabelWriter 450

- Er is geen DYMO-software of SDK gebruikt. Het label gaat via het gewone printvenster van de browser.
- De pagina zet zelf `@page { size: 101mm 54mm; margin: 0 }`.
- Kies eenmalig in het printvenster:
  - de DYMO LabelWriter 450
  - papier *99014 Shipping*
  - liggend
  - schaal 100% en geen marges
- Op een vaste inpaktafel kun je Chrome starten met `--kiosk-printing`. Dan print hij zonder venster op de standaardprinter. Dit is niet ingesteld of getest.

### Waar het zit

| Bestand | Wat erin zit |
| --- | --- |
| `src/config.ts` | `MAX_PER_DOOS` (50) en `LABEL_SIZE` (formaat van de rol) |
| `src/utils/boxes.ts` | `splitPieces`, `minBoxes`, `orderBoxes`: de verdeling en nummering |
| `src/features/packing/labels.tsx` | `DymoLabel` (het label), `labelsFor`, `byRoute`, `printLabels` (tekent de labels naast de app en opent het printvenster) |
| `src/features/packing/LabelPanel.tsx` | Het paneel na Afronden en `boxPlan` (de verdeelregel) |
| `src/features/packing/PackingPage.tsx` | Paneel na Afronden, de knop *Labels (N)*, de verdeelregel op de kaart |
| `src/styles.css` | Printregels: tijdens het printen van labels is alleen `#oc-labels` zichtbaar |

Het aangepaste aantal dozen wordt niet opgeslagen. Het geldt alleen voor die print.

## 2. Poppetjes met naam in plaats van "Jij"

- Iedereen krijgt een klein getekend oudje in vlakke kleur, **zonder outlines**. Het contrast doet het werk, niet de lijnen.
  - Een rond vlak in een donkere tint van de gezichtskleur.
  - Daarop een breed, zacht-rechthoekig gezicht. Alle gezichten hebben dezelfde vorm, zodat ze als één familie voelen.
  - Ogen, wenkbrauwen en mond zijn dichte vormen in diezelfde donkere tint. De wenkbrauwen zijn korte balkjes, geen lijntjes. De neus en de oren zijn een iets donkerder vlak van de gezichtskleur.
  - Wit of grijs haar, of een hoed, pet, muts of hoofddoek in een van de andere vijf kleuren.
- **Palet:** warm en nostalgisch, als een kinderboekillustratie. Zes iets vergrijsde kleuren: lavendel, saliegroen, perzik, honinggeel, mistblauw en oudroze. Bewust geen huidtinten, zodat niemand op huidskleur wordt ingedeeld. Alle blosjes zijn hetzelfde zachte zalmroze (`#D99294`).
- **Wat varieert:**
  - 12 kapsels en hoofddeksels: permanentje, knotje, kaal met plukjes, pet, dameshoedje met bloem, scheiding, bob, lang haar met haarband, baret, hoofddoek, kuif en muts met pompon
  - 6 kleuren voor het gezicht (en daarmee het vlak erachter), 4 tinten wit tot grijs voor het haar
  - 7 gezichten: glimlach, schaterlach, knipoog, verbaasd, tevreden met de ogen dicht, giechel en schalks
  - soms een ronde bril, een leesbril, een snor of parel-oorbellen
- **Twee tekeningen van dezelfde persoon.** De kleine is geen verkleinde kopie, maar een eigen, eenvoudigere versie.
  - **Groot** (44 px en meer: profiel, panelen) heeft ook kleine details: lachlijntjes, plukjes, naden in de pet, het bloemetje op de hoed, het koordje van de leesbril en de parels.
  - **Klein** (onder 44 px: rooster, lijsten, naamlabels) heeft alleen de grote vormen. De kleuren zijn een stap voller, en de tekening zoomt in op het gezicht, zodat ogen en mond groter zijn.
- De kleuren zijn alleen voor de poppetjes. Ze vallen buiten de merkkleuren, net als de kleuren in de discozaal.
- **Dezelfde naam geeft overal hetzelfde poppetje**, op elk apparaat. Het poppetje volgt uit de naam; er wordt niets opgeslagen.
- **Iedereen krijgt een eigen combinatie van kapsel en kleur**, zolang er niet meer dan 72 mensen zijn.
  - Het dashboard maakt een lijst van alle namen die het kent: vrijwilligers, inpakkers, bezorgers, wie heeft afgeleverd, en wie is ingelogd.
  - De kapsels worden eerlijk verdeeld. De eerste twaalf mensen hebben allemaal een ander kapsel, daarna komt een tweede ronde in andere kleuren.
  - Komt er iemand bij, dan verandert het poppetje van anderen meestal niet. Het kan wel gebeuren.
- **Waar het staat:**
  - **Inpakken:** "Jij" is vervangen door je voornaam met poppetje, in een gouwe ouwe-pilletje. Bij een ander staat er bijvoorbeeld "Ria is bezig". Bij *Ingepakt door* staat het poppetje met de naam.
  - **Kop van het dashboard:** je naam met poppetje, ook in het telefoonmenu.
  - **Routes:** het poppetje bij elke bezorger.
  - **Vrijwilligers en Agenda:** zie hieronder.
- Bij het inloggen staat nog geen poppetje. De verdeling hangt af van wie het dashboard kent, en dat is pas na het inloggen bekend.
- Bestand: `src/components/Avatar.tsx` (`Avatar`, `NameTag`, `setAvatarRoster`, `avatarLook`). De namenlijst wordt gevuld in `src/App.tsx` (`rosterNames`).
- De regels staan in `docs/huisstijl-regels.md` onder *Personen*.

## 3. Vrijwilligers (beheer): wie kan wanneer

Opgezet zoals roostertools (Eitje, Planday) beschikbaarheid tonen: een rij per persoon en een kolom per dag.

- **Bovenaan** vijf cijfers: het aantal aanmeldingen, het aantal per taak, en *Krappe dagen* (dagen waarop een taak te weinig mensen heeft).
- **Het overzicht *Wie kan wanneer*:**
  - Links staan de namen met poppetje, het aantal dagen en eventueel *max N*. Deze kolom blijft staan als je zijwaarts scrollt.
  - Bovenaan staan de dagen. Een dikkere lijn markeert een nieuwe week en de pauze rond de kerst.
  - Onder de dagen staat per taak (Inpakken, Bezorgen, Bar) een stippelvakje met de dienst van die dag: de tijd (bijvoorbeeld *6:30–12*) en *kunnen/nodig* (bijvoorbeeld *2/4*). Rood met ! is te weinig, geel is bijna, groen is genoeg. Zonder tijd in de Agenda staat er *hele dag*.
  - In de cellen staat per dienst die iemand kan een blokje met de tijd, in de kleur van de taak: geel voor inpakken, rood voor bezorgen, bruin voor de bar, groen voor de fietskoerier bij oude aanmeldingen. Met de muis erop zie je de taak, het dagdeel en de plek.
  - Je kunt zoeken, filteren op taak (*Alles*, *Inpakken*, *Bezorgen*, *Bar*) en sorteren op naam of op meeste dagen.
- **Klik op een naam** om een zijpaneel te openen met:
  - knoppen voor WhatsApp, bellen en mail
  - de taken, het aantal dagen en het maximum, of iemand ingedeeld mag worden waar het nodig is, het rijbewijs, de bakfiets, de herinnering, en de contact- en adresgegevens
  - de opmerking
  - per dag wat iemand kan, met tijden; een klik op een dag opent die dag
- **Klik op een dag** (bovenaan) om een zijpaneel te openen met:
  - per taak en moment wie er kan, tegenover hoeveel er nodig zijn
  - bij een taak die krap is: wie die dag voor iets anders kan én *inzetbaar waar nodig* is
  - een klik op een naam opent die persoon
- Het zijpaneel sluit met Esc, met het kruisje of met een klik ernaast.
- De bezettingskalender is van deze pagina gehaald. De cijfers per dag staan nu boven het overzicht. De kalender staat nog op Agenda.
- Het blok *Persoonsgegevens verwijderen* is ongewijzigd.

## 4. Agenda (iedereen met een code)

- **Bovenaan, als je naam als vrijwilliger bekend is:** je naam met poppetje en je dagen als knoppen.
- ***Waar is nog plek?*** is dezelfde kalender als voorheen, maar elke dag is nu klikbaar.
- ***Wie is er op …***: per taak en moment de namen met poppetje en *N van M nodig*. Je eigen naam staat in gouwe ouwe. Met ← en → ga je naar de vorige of volgende dag. Als startdag kiest de pagina vandaag, of anders de eerstvolgende seizoensdag.
- ***Zoek iemand***: per gevonden naam de dagen als knoppen. Een klik op een dag springt naar die dag.
- Het oude urenrooster (9:00–17:00, met kolommen naast elkaar) is weg. Het begon om 9:00, waardoor inpakken (vanaf 6:30) half buiten beeld viel. Bij veel mensen raakte het bovendien vol.
- De Agenda toont geen contactgegevens. Die krijgt alleen beheer.

## Ook aangepast

- **Tijden en aantallen nodig per taak.** Tijden en "nodig" werden opgezocht met alleen het moment (bijvoorbeeld "Dinsdag 15 december"). Inpakken en de Oliebollenbar hebben vaak hetzelfde moment, dus de bar kreeg de inpaktijd (6:30–12:00) en hetzelfde aantal nodig. De sleutel is nu taak plus moment (`optionKeyFor`, `optionTime` in `src/config.ts`). Dit raakt ook de aanmelding (`SignupPage.tsx`) en de bezetting (`utils/staffing.ts`).
- **Paginabeschrijvingen** van Vrijwilligers en Agenda in `src/App.tsx`, en de tabel in `README.md`.

## Nieuwe bestanden

| Bestand | Wat erin zit |
| --- | --- |
| `src/components/Avatar.tsx` | Poppetjes en naamlabels |
| `src/components/Drawer.tsx` | Zijpaneel (Esc, focus terug, op telefoon schermbreed) |
| `src/features/volunteers/availability.ts` | Seizoensdagen, wat iemand per dag kan, bezetting per taak en moment |
| `src/features/volunteers/PlanningViews.tsx` | `AvailabilityMatrix`, `PersonDetails`, `PersonHeader`, `DayRoster`, `TaskBlock`, `TaskLegend` |
| `src/utils/boxes.ts`, `src/features/packing/labels.tsx`, `src/features/packing/LabelPanel.tsx` | Dozen en labels, zie hierboven |

## Wat wel en niet getest is

- **Getest in demo-modus** op de lokale dev-server (Chrome):
  - order pakken, afvinken en afronden; het labelpaneel en het voorbeeld
  - *Labels (N)* voor de hele dag
  - het overzicht, het persoonspaneel en het dagpaneel op Vrijwilligers
  - Agenda als inpakker die ook als vrijwilliger bekend is
  - telefoonbreedte (375 px): de pagina schuift niet zijwaarts, het overzicht scrollt binnen de kaart
- **Printformaat getest via PDF, niet op een echte printer.** Headless Chrome maakte een PDF van de labels. Een order met 120 MET en 30 ZONDER gaf vier pagina's van 100,9 × 54,0 mm, één label per pagina.
- **Niet getest op een echte DYMO LabelWriter 450.** Of de driver het formaat 99014 goed oppakt, moet aan de inpaktafel worden geprobeerd.
- **Aanmelding, bezorgen alleen met rijbewijs én auto:** in de browser nagelopen met alleen Autokoerier (terug naar de taakkeuze, Oma noemt de pop-up en het inpakken, Autokoerier staat er niet meer tussen) en met Inpakken plus Autokoerier (gaat door met alleen inpakken).
- **Niet getest tegen de echte Google Sheet.** Er is niets aan `apps-script/Code.gs` veranderd.
- **Er zijn geen automatische tests** voor deze onderdelen.
