# Oma Coby's Oliebollen Platform

Dashboard voor de oliebollenactie: inpakken, opmerkingen en klantbevestigingen, routes, tussenstand,
kosten en vrijwilligers. React + Vite + Tailwind, gehost op GitHub Pages, met de Google Sheet als backend
via een Apps Script.

| Pagina | Voor | Wat |
|---|---|---|
| Inpakken | inpakker, beheer | tabblad **Opmerkingen** (teller met open items): wijzigingen uit het wijzigingslog (oud → nieuw, tijd, bestelling) en opmerkingen voor het inpakken, af te vinken als verwerkt (wie en wanneer); een latere wijziging staat weer open (`src/lib/packNotes.ts`); totalen MET/ZONDER en nog te bakken (gebakken aantallen alleen-lezen: "goedgekeurd door … om …"), **Klaar vóór**: live per tijdstip hoeveel er ingepakt moet zijn (met, zonder, nog te doen), afgeleid uit het vertrek van elke berekende rit en anders uit het bezorgmoment of de afhaaltijd; op de dag zelf met "nog 20 min" of "had al klaar moeten zijn" (`src/features/packing/packTimes.ts`); filter particulier/zakelijk/barter/pop-up (pop-upvoorraad telt volledig mee in "nog bakken"); orders claimen, afvinken en afronden (live); per order de dozen (max. 50, MET en ZONDER apart) en doos-labels voor de DYMO; pakbonnen printen |
| Bestellingen | beheer | opmerkingen beoordelen en aanpassen; bevestiging per order controleren en versturen; tabblad **Bevestigd** met alleen orders waarvan de bevestigingsmail echt is verstuurd (met verzendtijd; een mislukte mail blijft erbuiten en toont de fout); filter op **soort** (regulier, particulier, pop-up); **nieuwe bestelling** of **extra pop-upvoorraad** aanmaken; per pop-up de **verkochte aantallen** vastleggen; **contact bij aflevering** per bezorging (naam, telefoon, opmerking; standaard de contactpersoon van de klant, `src/lib/deliveryContact.ts`), ook getoond bij Inpakken, Routes, Bezorgen en op de pakbon met een klikbaar nummer; **bewerken** (soort, naam, e-mail, aantallen MET/ZONDER, leverdatum, bezorgen/afhalen, bezorgmoment, adres, bedrag) en de **wijzigingsgeschiedenis** per bestelling |
| Zakelijk | beheer | aanvragen van het zakelijke bestelformulier nakijken, bevestigen (dan staan ze als order in Bestellingen, Inpakken en Routes) of afwijzen met reden; link naar het formulier kopiëren |
| Routes | beheer | **Automatisch indelen**: voorstel wie welke bezorging doet (dagdeel uit de aanmelding als autokoerier, 15 min per stop, tijdvak van de klant, max. 1.500 bollen per auto, elke rit vanaf de loods, laatste rit eindigt zo dicht mogelijk bij huis); daarna met de hand bijstellen. Vervoer is alleen de auto: een aanmelding als fietskoerier telt niet meer mee (die naam staat nog wel onder "Niet aangemeld voor dit moment"), en een route die nog voor de fiets was berekend staat als verouderd tot hij opnieuw berekend is. Per bezorger en dagdeel een rit met snelste volgorde, km, reistijd in uren en hele minuten (`formatTravelTime`) en aankomsttijd per stop; melding bij verouderde routes; route via WhatsApp. Instellingen in `PLANNING` in `src/config.ts` |
| Bezorgen (`#/bezorger`) | bezorger | mobiele pagina met stops, verwachte tijd, aantallen en Maps-route; stop afvinken als afgeleverd |
| Tussenstand | beheer | bovenaan het **doel**: verkochte oliebollen van de 40.000 (`GOAL_OLIEBOLLEN`), het percentage, de rollatorbalk met de mijlpalen (`GOAL_MILESTONES`), het aantal oudjes van de 4.000 en het verschil met vorig jaar; daaronder in één rij bestellingen, omzet (met omzet na kosten), ingepakt en bezorgd (van pop-upvoorraad telt alleen wat verkocht is); grafiek tegenover eerdere jaren, met in de grafiekkeuze ook *Aantal oudjes* (de discozaal: één dansend oudje per tien verkochte oliebollen, live meegeteld met de bestellingen); onderaan *Deel stand* (kaartje als Post of Story met oudjes, oliebollen en het verschil met vorig jaar) en de tabel per seizoen |
| Kosten (voor bezorgers: Kosten indienen) | beheer, bezorger | bon → automatisch uitgelezen → met IBAN indienen; status volgen. Beheer keurt goed/af en betaalt uit; km-vergoeding per bezorger |
| Bakkerij | beheer | de bestellijst voor **morgen** (andere dag kiezen kan): met, zonder en totaal, pop-upvoorraad inbegrepen; **gebakken aantallen goedkeuren** op naam (benodigd ↔ gebakken met verschil, daarna vergrendeld; een correctie is een nieuwe goedkeuring met reden, de geschiedenis blijft); een **opmerking voor de bakker** die in het bericht meegaat; het bericht naar de bakker sturen via WhatsApp, e-mail of het deelmenu van de telefoon, of **kopiëren** en zelf in een chat plakken (daarna met één klik vastleggen als doorgegeven); "laatst doorgegeven", een waarschuwing met het verschil per product als de aantallen daarna veranderen, en de geschiedenis (`src/lib/bakeShare.ts`) |
| Vrijwilligers | beheer | wie kan wanneer: een rij per vrijwilliger, een kolom per dag, bezetting per taak bovenaan; klik een naam of dag voor details; na de actie persoonsgegevens verwijderen |
| Rooster | beheer | wie staat wanneer: een week als agenda met per dag de diensten (inpakken, bezorgen ochtend en middag, de bar op evenementdagen); per dienst instellen hoeveel mensen er nodig zijn, zien wie zich heeft opgegeven, en vrijwilligers op een dienst zetten, verslepen of de tijden wijzigen. Bewaard in het tabblad `Rooster` van de Sheet (zie `docs/rooster.md`) |
| Aanmelden (`#/aanmelden`) | openbaar | korte vragen één voor één: taak, dag of "maakt niet uit", dan beschikbaarheid, maximum en herinnering (zie `docs/vrijwilligers-aanmelding.md`); momenten uit het tabblad Agenda; komt in hetzelfde tabblad als het Google Formulier |
| Bestellen (`#/bestellen`) | openbaar | zakelijk bestelformulier: begint met de pakketten Brons, Zilver en Goud (50, 150 of 500 oliebollen, met het aantal ouderen dat een middag gaat dansen) of zelf samenstellen (MET/ZONDER, min. 50); extra doneren, flyers, bezorgen of afhalen, dag en moment, gegevens voor de factuur; rekent prijs, btw en bezorgkosten mee. Na versturen een opgemaakte bevestigingsmail. Zie `docs/zakelijk-bestellen.md` |
| Wall of fame (`#/wall-of-fame`) | openbaar | de bedrijven die met toestemming op Oma's muur staan, als foto van een bruin café: Goud en Zilver met logo in bruine lijsten (zonder goedgekeurd logo een naambordje), Brons op het krijtbord, nooit bedragen. Alleen bevestigde bestellingen uit de Sheet; in demo-modus volgt de muur de voorbeeldaanvragen (begint leeg). Met `?embed=1` zonder kop voor een iframe op de website. Zie `docs/wall-of-fame.md` |
| Wall of fame (`#/muur`) | beheer | wie er hangt, logo's nakijken en goedkeuren, iemand van de muur halen, een akkoord per mail toevoegen |
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

## Soorten bestellingen

Elke order heeft een `category` (`src/lib/categories.ts`), afgeleid uit de kolom `Type`:

| Soort | `Type` in de Sheet | Tussenstand en omzet | Bakken en inpakken | Routes |
|---|---|---|---|---|
| Regulier | `Zakelijk`, `Barter` of leeg | helemaal | helemaal | ja (bij bezorgen) |
| Particulier | `Particulier` (of iets anders) | helemaal | helemaal | ja (bij bezorgen) |
| Pop-upvoorraad | `Pop-up` | alleen wat verkocht is (`state.popupSales`) | helemaal | nee |

Pop-upvoorraad is voorraad die mee gaat naar een pop-up, zonder vaste koper. Gebruik `salesOf(order, state, prijs)`
voor wat meetelt in de tussenstand en `popupLeft(order, state)` voor wat er nog over is.

## Wijzigingslog (voor nieuwe functies)

Elke aanpassing van een bestelling (en van een opmerking) staat in het tabblad `Wijzigingslog` en in
`state.changes` (nieuwste eerst): `{ at, kind, orderId, field, from, to, by, note }`. Hulpfuncties in
`src/lib/orderChanges.ts`:

- `changesFor(state, orderId)` – de geschiedenis van één bestelling;
- `changesSince(state, "2026-12-16 10:00:00", ["withRaisins", "withoutRaisins"])` – bijv. "aantallen gewijzigd na het inpakken" of een waarschuwing in de bakkerij;
- `routeChangedAfter(state, route)` – adres of datum gewijzigd nadat de route berekend is;
- `fieldLabel`, `formatChangeValue`, `formatChangeTime` – om een regel te tonen.

Nieuwe soorten wijzigingen schrijf je in het script met `logChanges_([{ soort, order_id, veld, oud, nieuw, door, rol, toelichting }])`.
