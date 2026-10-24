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
2. Hoofdknoppen krent met meel-tekst. Feest of kerstbomen met lichte tekst alleen vanaf 24px (de grote Bangers-knop), anders is het contrast te laag.
3. Status: klaar = kerstbomen, aandacht = gouwe ouwe, probleem = feest. Altijd als lichte tint met donkere tekst (`bg-kerst-50 text-kerst-ink`), en altijd met een teken (✓, ~, !) of woord erbij, nooit alleen kleur.
4. Taken hebben overal dezelfde kleur (`taskClass`): inpakken gouwe ouwe, fiets kerstbomen, auto feest, bar oliebol.
5. Alleen een licht thema, met het donkere logo.

## Letters

1. Bangers (`font-display`) alleen voor paginatitels, stickers en de grote knop op telefoon. Altijd kapitalen.
2. Vollkorn (`font-serif`) voor kaarttitels en grote getallen, met rechte cijfers van gelijke breedte (`tabular-nums`; `lnum` staat globaal aan).
3. Arvo (`font-sans`, de standaard) voor alle tekst. Labels in Arvo vet kapitalen met ruime spatiëring (`fieldLabel`).
4. Eén woord voor één ding: MET, ZONDER, TOTAAL (nooit "geheel"); Bezorger; Opmerking.
5. De fonts staan in `src/assets/fonts` en worden zelf geladen, niet via Google Fonts.

## Vorm

1. Geen vakken in vakken. Eén vlak per groep; daarbinnen scheiden we met ruimte en hooguit één haarlijn (`border-lijn`).
2. Kaarten: papier op meel, 10px hoek (`rounded-kaart`), zachte schaduw (`shadow-zacht`), geen rand. Op schermen wijken we hiermee bewust af van het rechte drukwerk uit het brandbook.
3. Randen alleen voor invoervelden, de focusring en een staat die aandacht vraagt (de volgende stop bij Bezorgen).
4. Tweede knoppen, filters, leverdagen, keuze-chips en afvinktegels zijn zachte vlakken zonder rand (`bg-vul`); actief = wit pilletje met schaduw, of krent.
5. Knoppen en velden 6px hoek, badges 4px. Het schuine ovaal (`Sticker`, `Oval`) alleen voor mijlpalen en succes.
6. Tikvlakken minimaal 44px op schermen die op telefoon worden gebruikt (Bezorgen, Inpakken, Aanmelden, Kosten).

## Personen

1. Een persoon staat er altijd met naam en eigen poppetje (`Avatar`, `NameTag` in `src/components/Avatar.tsx`), nooit als "Jij".
2. Het poppetje is getekend in de doodle-stijl van corporate memphis: een egale gekleurde cirkel met losse zwarte lijntjes voor het haar of de hoed, het gezicht en soms een bril of snor. Het haar mag buiten de cirkel steken. De felle kleuren zijn alleen voor de poppetjes, net als bij de discozaal.
3. Dezelfde naam geeft overal hetzelfde poppetje. Binnen het dashboard krijgt iedereen een eigen combinatie van haar en kleur.
4. Wie ingelogd is, staat in een gouwe ouwe-pilletje (`NameTag mine`); anderen in een zacht vlak.

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
3. Bij iets bijzonders rolt er een getekende oliebol onderin voorbij (`rollOliebol`), over een baan van hooguit 480px in het midden, niet over de hele breedte: alles ingepakt, laatste stop afgeleverd, mijlpaal gehaald, aanmelding binnen. Nooit vaker dan één keer per moment.
   Bij écht wachten rolt een klein oliebolletje over een kort baantje met één regel tekst (`OliebolLoader`): het eerste laden van het dashboard (onder de skeletblokken), een bon uitlezen en routes berekenen. Pas na 1 seconde (0,6 s bij bon en routes), zodat snel laden niets laat flitsen. Niet bij snelle acties zoals afvinken, claimen of een bezorger kiezen: die gaan direct.
4. Oudjes rekenen we eerlijk: oliebollen gedeeld door 10, naar beneden afgerond (`oudjesLine`, `OLIEBOLLEN_PER_OUDJE`).
5. De discozaal (`src/features/stats/Discozaal.tsx`) is een optie in de grafiekkeuze op de Tussenstand (Oliebollen, Bestellingen, Omzet, Discozaal), met het aantal oudjes als tellertje. Elk figuurtje is één oudje: drie rijen op een platte dansvloer, verspringend zodat elk hoofd zichtbaar blijft; ongeveer één op de tien oudjes heeft een donkerdere huid. Vanaf 60 oudjes komt af en toe een polonaise langs (die telt mee); wie niet past staat als aantal "in de rij voor de deur", zodat de zaal altijd optelt tot het getal. Achter de dansvloer het café van Oma Coby: staande lamp met franjekap, letterbord met het aantal, platenspeler, boekenkast en een tafel met oliebollen. Schiet het oudje met de rollator vooruit, dan krijgt ze een raketvlammetje.
6. *Deel stand* staat onderaan de kaart (feest, Bangers 24px) en maakt een kaartje als Post 4:5 of Story 9:16: het aantal oudjes groot, de verkochte oliebollen, en het verschil met dezelfde periode vorig jaar met een groen pijltje rechtsomhoog of een rood pijltje linksomlaag. Onderaan een rijtje oudjes en het logo.
7. Alles staat uit bij "minder beweging" (`prefers-reduced-motion`).

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
