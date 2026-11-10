# Huisstijl-regels voor het platform

De regels voor de schermen van Oma Coby's Oliebollenbar. Ze komen uit het design system (logo, kleuren,
letters, toon) en de Platformatlas, waar elke bouwsteen en elk scherm als voorbeeld staat. Nieuwe schermen
en wijzigingen volgen deze regels; de bouwstenen staan in [`src/components/ui.tsx`](../src/components/ui.tsx)
en de kleuren in [`tailwind.config.js`](../tailwind.config.js).

## Kleur

| Naam | Tailwind | Hex | Waarvoor |
|---|---|---|---|
| Meel | `meel` | `#f9f3d9` | achtergrond van het platform |
| Papier | `papier` | `#fffdf6` | kaarten en velden |
| Krent | `krent` | `#261f1f` | tekst, hoofdknop, actieve staat |
| Oliebol | `oliebol` | `#5c4238` | tweede tekst |
| Feest | `feest` | `#d05438` | accent, volgende stop, grote knop |
| Kerstbomen | `kerst` | `#69873c` | klaar, genoeg, afgeleverd |
| Gouwe ouwe | `gouwe` | `#dcc05d` | selectie, aandacht, snelknoppen |

1. Achtergrond meel, kaarten papier, tekst krent.
2. Hoofdknoppen krent met meel-tekst. Feest of kerstbomen met lichte tekst alleen vanaf 24px (de grote knop in VTC SuperMarket), anders is het contrast te laag.
3. Status: klaar = kerstbomen, aandacht = gouwe ouwe, probleem = feest. Altijd als lichte tint met donkere tekst (`bg-kerst-50 text-kerst-ink`), en altijd met een teken (✓, ~, !) of woord erbij, nooit alleen kleur.
4. Taken hebben overal dezelfde kleur (`taskClass`): inpakken gouwe ouwe, fiets kerstbomen, auto feest, bar oliebol.
5. Alleen een licht thema, met het donkere logo.

## Letters

1. VTC SuperMarket Sale (`font-display`, schuin, zonder é/ë/€: die vallen terug op Impact) alleen voor paginatitels, stickers, de pakketnamen (Brons, Zilver, Goud) en de grote knop op telefoon. Altijd kapitalen.
2. Vollkorn (`font-serif`) voor kaarttitels en grote getallen, met rechte cijfers van gelijke breedte (`tabular-nums`; `lnum` staat globaal aan).
3. Arvo (`font-sans`, de standaard) voor alle tekst. Labels in Arvo vet kapitalen met ruime spatiëring (`fieldLabel`).
4. Eén woord voor één ding: MET, ZONDER, TOTAAL (nooit "geheel"); Bezorger; Opmerking. Uitzondering: op het zakelijke bestelformulier (voor klanten) schrijven we "met krenten" en "zonder krenten" klein, met een getekende oliebol met en zonder krenten erbij. Het zakelijke bestelformulier is er ook in het Engels: nieuwe teksten daar komen in `src/features/business/teksten.ts`, in beide talen tegelijk (zie docs/zakelijk-bestellen.md voor de vaste Engelse woorden).
5. De fonts staan in `src/assets/fonts` en worden zelf geladen, niet via Google Fonts.

## Vorm

1. Geen vakken in vakken. Eén vlak per groep; daarbinnen scheiden we met ruimte en hooguit één haarlijn (`border-lijn`).
2. Kaarten: papier op meel, 10px hoek (`rounded-kaart`), zachte schaduw (`shadow-zacht`), geen rand. Op schermen wijken we hiermee bewust af van het rechte drukwerk uit het brandbook.
3. Randen alleen voor invoervelden, de focusring en een staat die aandacht vraagt (de volgende stop bij Bezorgen).
4. Tweede knoppen, filters, leverdagen, keuze-chips en afvinktegels zijn zachte vlakken zonder rand (`bg-vul`); actief = wit pilletje met schaduw, of krent.
5. Knoppen en velden 6px hoek, badges 4px. Het schuine ovaal (`Sticker`, `Oval`) alleen voor mijlpalen en succes.
6. Tikvlakken minimaal 44px op schermen die op telefoon worden gebruikt (Bezorgen, Inpakken, Aanmelden, Bestellen, Kosten).

## Personen

1. Een persoon staat er altijd met naam en eigen poppetje (`Avatar`, `NameTag` in `src/components/Avatar.tsx`), nooit als "Jij".
2. Het poppetje is een getekend oudje in vlakke kleur, zonder outlines: een breed, zacht-rechthoekig gezicht op een rond vlak in een bleke tint van de gezichtskleur. Ogen, wenkbrauwen (balkjes, geen lijntjes) en mond zijn dichte vormen in een donkere tint van die kleur. Contrast doet het werk, niet lijnen. Alle gezichten hebben dezelfde bouw en kijken vriendelijk: glimlach, lach, tevreden of knipoog.
3. De gezichtskleuren zijn zes iets vergrijsde, op elkaar afgestemde tinten: lavendel, saliegroen, perzik, honinggeel, mistblauw en oudroze. Geen huidtinten en geen felle snoepkleuren. Het haar is warm (crème, zand, taupe, verbleekt kastanje), nooit koel grijs: dat maakt van een blauw of lila gezicht een Smurf. Alle blosjes zijn hetzelfde zachte zalmroze (`#D99294`). Hoeden en mutsen krijgen een van de andere vijf kleuren. Deze kleuren zijn alleen voor de poppetjes, net als bij de discozaal.
4. Er zijn twee tekeningen van hetzelfde poppetje. De grote (vanaf 44 px) heeft kleine details zoals lachlijntjes, plukjes en het bloemetje op de hoed. De kleine (rooster, lijsten, naamlabels) is een eigen vereenvoudigde versie, geen verkleinde kopie: alleen de grote vormen, iets vollere kleuren, ingezoomd op het gezicht.
5. Je eigen kleur zit in het poppetje, niet in de naam of de pil. Naamlabels blijven neutraal (zacht vlak, naam in krent), want kleur op een pil leest als de bezettingskleuren (roze te weinig, geel bijna, groen genoeg) en de taakkleuren. Alleen je eigen naam staat in gouwe ouwe.
6. Het poppetje krijgt ademruimte: in een naamlabel 3 px rondom, zodat het de rand niet raakt.
7. Dezelfde naam geeft overal hetzelfde poppetje. Binnen het dashboard krijgt iedereen een eigen combinatie van haar en kleur.
8. Wie ingelogd is, staat in een gouwe ouwe-pilletje (`NameTag mine`); anderen in een zacht vlak.

## Gedrag

1. Elk scherm beantwoordt één vraag; de stand staat boven de lijst.
2. Geen pop-ups van de browser (`window.confirm`, `window.prompt`): bevestigen gebeurt in de pagina met `ConfirmPanel`.
3. Elke staat is ontworpen: laden (`Skeleton`), leeg (`EmptyState`), fout (`Notice tone="error"`), verouderd en demo.
4. Na kopiëren altijd "Gekopieerd" (`CopyButton`).
5. Op telefoon een Menu-knop met een raster, nooit tabs die zijwaarts scrollen.
6. Leverdag kiezen met dagknoppen en de eigen kalender, niet met het datumveld van de browser.

## Toon

1. Je en jij, warm en nuchter, alsof Oma meekijkt.
2. Fouten zeggen wat er mis is en wat je doet, zonder grap of excuus.
3. Bij geld (declaraties, IBAN, uitbetalen) en privacy (persoonsgegevens wissen) geen humor.
4. Geen emoji in koppen; tekens als ✓ mogen.

## Knipoog

1. Alleen na een gelukte actie, bij voortgang, in lege staten en bij laden dat langer dan een seconde duurt.
2. Eén per actie, korter dan 400 ms, nooit blokkerend (`toast`, `Sticker slap`).
3. Bij iets bijzonders rolt er een getekende oliebol onderin voorbij (`rollOliebol`), over een baan van hooguit 480px in het midden, niet over de hele breedte: alles ingepakt, laatste stop afgeleverd, mijlpaal gehaald, aanmelding of zakelijke bestelling binnen. Nooit vaker dan één keer per moment.
   Kies je een pakket op `#/bestellen`, dan gaat alleen bij die kaart iets bewegen: de medaille tikt aan (`oc-medal`), er ploffen kleine oliebollen en confetti in feest, gouwe ouwe en kerstbomen als vuurwerk uit de medaille (`Burst`, 0,9 s; bij Goud een tweede, wijdere ring) en de oudjes op de kaart swingen kort na elkaar (`oc-dance`). Opnieuw kiezen speelt het opnieuw af.
   Bij écht wachten rolt een klein oliebolletje over een kort baantje met één regel tekst (`OliebolLoader`): het eerste laden van het dashboard (onder de skeletblokken), een bon uitlezen en routes berekenen. Pas na 1 seconde (0,6 s bij bon en routes), zodat snel laden niets laat flitsen. Niet bij snelle acties zoals afvinken, claimen of een bezorger kiezen: die gaan direct.
4. Oudjes rekenen we eerlijk: oliebollen gedeeld door 10, naar beneden afgerond (`oudjesLine`, `OLIEBOLLEN_PER_OUDJE`).
5. De discozaal (`src/features/stats/Discozaal.tsx`) is een optie in de grafiekkeuze op de Tussenstand (Oliebollen, Bestellingen, Omzet, Aantal oudjes), met het aantal oudjes als tellertje. Elk figuurtje is één oudje en iedereen staat op de vloer: hoe voller de zaal, hoe kleiner de oudjes, en bij een flinke drukte wordt de zaal hoger. Niemand wacht buiten. Het aantal volgt de bestellingen live: komt er een bestelling bij, dan lopen de nieuwe oudjes links binnen; valt er een weg, dan lopen ze rechts naar buiten. Onder de zaal staat de telling ("✓ Geteld: alle 73 oudjes dansen op de vloer"); klopt die niet met het getal, dan staat er een melding. Eén op de tien oudjes heeft een donkere huid (oudje 7, 17, 27, …). Achter de dansvloer het café van Oma Coby: staande lamp met franjekap, letterbord met het aantal, platenspeler, boekenkast en een tafel met oliebollen. Schiet het oudje met de rollator vooruit, dan krijgt ze een raketvlammetje.
6. *Deel stand* staat onderaan de kaart (feest, VTC SuperMarket 24px) en maakt een kaartje als Post 4:5 of Story 9:16: het aantal oudjes groot, de verkochte oliebollen, en het verschil met dezelfde periode vorig jaar met een groen pijltje rechtsomhoog of een rood pijltje linksomlaag. Onderaan een rijtje oudjes en het logo.
7. Alles staat uit bij "minder beweging" (`prefers-reduced-motion`).
8. De pakketten tekenen we als medaille aan een feest-rood lint (`Medal`). De metaalkleuren brons, zilver en goud zijn alleen voor die medaille, net als de kleuren van de poppetjes.

## Vaste teksten

| Moment | Tekst |
|---|---|
| Order afgerond | "Ingepakt! Goed voor 6 oudjes op de dansvloer." |
| Alles ingepakt | "Alles ingepakt. Tijd voor een bakkie." |
| Stop afgeleverd | "Afgeleverd. Nog 2 stops." |
| Laatste stop | "Alle bollen zijn binnen. Rij voorzichtig terug!" |
| Laden (na 1 s) | "Even de olie opwarmen…" |
| Lege lijst inpakken | "Niks meer te doen. Oma Coby is trots op je." |
| Inloggen | "Wie staat er achter de pan?" |
| Aanmelding binnen | "Je bent nu officieel Oma's hulpje." |
| Zakelijke bestelling binnen | "Bedankt!" en "Jullie laten 15 ouderen rock 'n rollen" |

## Mail

De bevestigingsmail van een zakelijke bestelling (`businessMailHtml_` in `apps-script/Code.gs`) volgt dezelfde huisstijl,
binnen wat mailprogramma's kunnen:

1. Meel als achtergrond, één papieren kaart van 600px breed met 10px hoek, ruim opgezet (44px binnenmarge, 32px tussen blokken). Blokken scheiden met één haarlijn (`lijn`); alleen het blok met de ouderen heeft een zacht vlak (gouwe ouwe 50), met bovenin de discozaal in de kleuren van de zaal op het platform.
2. Tabellen en inline stijlen, geen CSS-variabelen of flexbox: zo ziet hij er in Gmail, Outlook en Apple Mail hetzelfde uit. Op telefoon staan label en waarde onder elkaar.
3. Letters: Arvo en Vollkorn zijn in mail niet te laden, dus de tekst valt terug op Rockwell en Georgia. Getallen in Rockwell, want Georgia heeft alleen cijfers die onder de regel zakken.
4. Logo, sticker, medailles, slinger en Oma's foto zijn PNG's in `public/mail` (SVG werkt niet in Gmail en Outlook); de discobal en de dansende oudjes (`dans-1` tot `dans-10`, de oudjes uit de discozaal) zijn kleine GIF's van vier beeldjes. Ze gaan als bijlage in de mail mee. Opnieuw maken: de tekening uit het platform op 2× (medailles 3×) als PNG met doorzichtige achtergrond. Outlook laat van een GIF alleen het eerste beeldje zien; dat is ook een goed plaatje.
5. Alles wat de klant intypte wordt ge-escaped. Er gaat altijd een tekstversie mee.
