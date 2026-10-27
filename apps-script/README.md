# Google Sheet-koppeling (Apps Script)

Het dashboard praat met de Google Sheet via één Apps Script (`Code.gs`). Zet het script in het bestand
**"oma coby's database"**: daar staan alle tabbladen bij elkaar (bestellingen, vrijwilligers en de tabbladen
van het dashboard). Het tabblad `Uitleg` beschrijft per tabblad wat erin staat.

Gebruik je toch losse bestanden (bijv. de formulierantwoorden in een eigen bestand), zet dan het script in het
bestand met de bestellingen en koppel het vrijwilligersbestand met de Script-eigenschap `VOLUNTEERS_SPREADSHEET_ID`.

Het script:

- leest de bestellingen uit het tabblad **Totaal_lijst bestellingen** (zakelijk, particulier, barter en pop-up); het script schrijft daar alleen bij **Bewerken** en bij een **nieuwe bestelling of pop-upvoorraad** uit het beheer;
- bewaart alles van het dashboard in eigen tabbladen (maakt ze aan als ze ontbreken):
  `Dashboard_Orders`, `Inpakken`, `Gebakken`, `Routes`, `Kosten`, `Historie`, `Instellingen`, `Inpaklog`,
  `Bezorgstatus`, `Agenda`, `Locaties` (opgezochte adressen voor het automatisch indelen), `Zakelijke aanvragen`, `Zakelijke dagen`, `Wijzigingslog` en `Pop-up verkoop`;
- ontvangt zakelijke aanvragen van het bestelformulier (`#/bestellen`), stuurt de klant een kopie en info@ een melding,
  en telt bevestigde aanvragen mee als order (zie `docs/zakelijk-bestellen.md`);
- leest en schrijft vrijwilligers in het antwoordenblad van het Google Formulier (`Formulierreacties 1`),
  zodat formulier en aanmeldpagina in één lijst terechtkomen;
- zet claims van inpakkers vast met een slot (`LockService`), zodat twee mensen nooit dezelfde order pakken;
- logt elke afgeronde en heropende order met naam en tijd in het tabblad `Inpaklog`;
- berekent routes en kilometers met de ingebouwde Google Maps-dienst (geen API-sleutel nodig): één route per
  bezorger per dagdeel ("rit"), vanaf de loods (`CONFIG.START_ADDRESS`), met `CONFIG.MINUTES_PER_STOP` (15) minuten
  per stop; de laatste rit van de dag eindigt bij het woonadres van de bezorger. Andere vrijwilligers zien de route
  zonder dat woonadres;
- zoekt voor **Routes → Automatisch indelen** de adressen van bestellingen en bezorgers op (Google Maps-geocoder)
  en bewaart ze in `Locaties`, zodat elk adres maar één keer wordt opgezocht. Staat een adres verkeerd, pas het dan
  aan in de bestelling; een oude regel in `Locaties` mag je weggooien;
- berekent per stop de verwachte aankomsttijd (vertrektijd + rijtijd + 5 minuten per stop);
- houdt bij welke stops de bezorgers als afgeleverd hebben afgevinkt (`Bezorgstatus`);
- verstuurt klantbevestigingen vanuit het Google-account van de Sheet (`MailApp`);
- beheert declaraties: ingediend → goedgekeurd of afgekeurd (met reden) → uitbetaald (met datum);
- laat bonnen uitlezen door Claude en bewaart de foto's in Google Drive.

## Installeren (± 15 minuten)

1. Open "oma coby's database" → **Extensies → Apps Script**.
2. Vervang de inhoud van `Code.gs` door [`Code.gs`](./Code.gs) uit deze map.
3. Pas bovenin `CONFIG` aan:
   - `ORDERS_SHEET`: naam van het tabblad met bestellingen (standaard `Totaal_lijst bestellingen`).
   - `COLUMNS`: alleen aanpassen als kolomkoppen veranderen.
   - `START_ADDRESS`: de baklocatie.
   - `SEASON_YEAR`: alleen nodig als er geen tijdstempels in het blad staan.
4. **Projectinstellingen (tandwiel) → Script-eigenschappen**, voeg toe:

   | Eigenschap | Waarde |
   |---|---|
   | `CODE_BEHEER` | een lange, zelfbedachte code voor beheer |
   | `CODE_INPAKKER` | code voor inpakkers |
   | `CODE_BEZORGER` | code voor bezorgers |
   | `ANTHROPIC_API_KEY` | API-sleutel van console.anthropic.com (alleen nodig voor het uitlezen van bonnen) |
   | `VOLUNTEERS_SPREADSHEET_ID` | Alleen nodig als de formulierantwoorden in een **ander** bestand staan. Het ID is het lange stuk in de URL tussen `/d/` en `/edit`. Zet het hier en niet in de code: de repo is openbaar. |

5. Kies bovenin de editor de functie **`installeer`** en klik **Uitvoeren** (één keer; geef toestemming).
   Daarmee komen ook nieuwe formulierinzendingen, ingevoegde/verwijderde rijen, sorteren en plakken
   direct door in het platform. Nog eens uitvoeren kan geen kwaad.
6. **Implementeren → Nieuwe implementatie → Web-app**
   - Uitvoeren als: **Ik**
   - Wie heeft toegang: **Iedereen**
   - Geef toestemming voor Sheets, Gmail (versturen), Drive, Maps en externe verzoeken.
7. Kopieer de web-app-URL (eindigt op `/exec`).
8. In GitHub → **Settings → Secrets and variables → Actions → New repository secret**:
   `VITE_APPS_SCRIPT_URL` = die URL. Push of start de deploy-workflow opnieuw.

Lokaal testen kan met `VITE_APPS_SCRIPT_URL=... npm run dev` (of zet hem in `.env`).

Na elke wijziging aan `Code.gs`: **Implementeren → Implementaties beheren → bewerken → Nieuwe versie**,
anders draait de oude versie.

## Kolommen in Totaal_lijst bestellingen

| Kolom | Gebruikt voor |
|---|---|
| `Unique ID` | ordernummer en besteldatum (tijdstempel) voor de tussenstand |
| `Type` (Zakelijk / Barter / Particulier / Pop-up) | soort: Zakelijk en Barter (en leeg) zijn regulier; Pop-up is extra voorraad zonder vaste koper |
| `Info` | e-mailadres voor de klantbevestiging |
| `Afhalen/Bezorgen`, `Pick up locatie` | afhaalorders komen niet in de routes |
| `Datum` ("18 december") | leverdag; het jaar komt uit de tijdstempels |
| `Bezorglocatie` | adres voor de route (mag in één cel) |
| `Naam onderneming`, `Contactpersoon`, `Contactpersoon telefoonnummer` | inpakken, bezorgen, bevestiging |
| `MET krenten`, `ZONDER krenten` | aantallen |
| `Comments` | opmerkingen beoordelen |
| `Flyers`, `Dozen #`, `Zakjes #` | getoond bij inpakken en bezorgen |
| `Bezorgmoment` (optioneel) | getoond bij de bezorger |
| `Bezorger` (optioneel) | wordt anders in het dashboard ingedeeld (Routes → Bezorgers indelen) |

Een omzetkolom is er niet: de tussenstand rekent met `prijs_per_oliebol` uit het tabblad `Instellingen`.

## Vrijwilligers (Google Formulier)

Het script leest het tabblad `Formulierreacties 1` (instelbaar via `CONFIG.VOLUNTEERS_SHEET`) en herkent de kolommen
aan het begin van de vraag, bijv. "Op welke dag(en) kan je helpen als fietskoerier?". Extra kolommen achteraan
mogen blijven staan. Aanmeldingen via de aanmeldpagina (`#/aanmelden`) worden in hetzelfde tabblad toegevoegd,
in dezelfde kolommen en hetzelfde formaat als het formulier ("Vrijdag 18 december: middag").

- De aanmeldpagina zet vijf extra kolommen achteraan zodra ze voor het eerst gevuld worden: *Hoe aangemeld*,
  *Mag ingedeeld worden waar nodig*, *Maximaal aantal dagen*, *Herinnering 24 uur van tevoren* en *Rijbewijs*
  (zie `docs/vrijwilligers-aanmelding.md`). Rijen uit het Google Formulier laten die leeg.
- De agenda in het dashboard wordt gevuld uit deze aanmeldingen (beschikbaarheid, niet het definitieve rooster).
- Inpakkers en bezorgers zien alleen namen en dagen; telefoon, e-mail en opmerkingen ziet alleen beheer.
- De dagen op de aanmeldpagina staan in `src/config.ts` (`SIGNUP_OPTIONS`), het aantal benodigde mensen per
  taak per dag(deel) in `STAFFING_TARGETS`. Daarmee kleurt de bezettingskalender en stelt de aanmeldpagina
  rustige momenten voor (de aanmeldpagina krijgt alleen aantallen, geen namen).
- Vult iemand een adres in, dan voegt het script achteraan een kolom `Adres` toe (het 2025-formulier had die niet).

Het Google Formulier blijft gewoon werken; je kunt het naast de aanmeldpagina gebruiken of de aanmeldpagina
in de plaats ervan delen.

## Tabbladen die je zelf vult

- **Agenda**: de momenten waarop vrijwilligers zich kunnen aanmelden. Eén regel per dag, taak en dagdeel:

  | datum | taak | dagdeel | tijd | locatie | nodig |
  |---|---|---|---|---|---|
  | 2026-12-29 | inpakken | | 06:30–12:00 | | 4 |
  | 2026-12-30 | autokoerier | ochtend | 09:00–12:00 | | 3 |
  | 2026-12-26 | oliebollenbar | | 14:00–18:00 | Pick-up Schaatsbaan | 6 |

  - `taak` is `inpakken`, `autokoerier` of `oliebollenbar`. De fietskoerier doet niet meer mee; regels met `fietskoerier` worden overgeslagen.
  - `dagdeel` is `ochtend`, `middag`, `avond` of leeg (hele dag).
  - `datum` mag ook "26 december" zijn.
  - `nodig` leeg = standaard (4).
  - Het script vult de agenda de eerste keer met 15–24 en 27–31 december. Pas hem daarna gewoon in de Sheet aan: de aanmeldpagina en de bezettingskalender volgen direct.
  - Aanmeldingen bewaren de gekozen tekst ("Woensdag 30 december: middag"). Verander je een moment waarvoor al mensen zijn aangemeld, dan tellen die niet meer mee voor het nieuwe moment.
- **Historie**: één regel per dag van eerdere jaren: `jaar`, `datum` (JJJJ-MM-DD), `bestellingen`, `oliebollen`, `omzet`.
  Totalen per week of per seizoen mogen ook (zet dan de laatste dag van die periode als datum).
- **Instellingen** (`sleutel`, `waarde`):
  - `prijs_per_oliebol` (bijv. `0,95`) als de Sheet geen bedrag per order heeft;
  - `km_vergoeding` (bijv. `0,23`), dan toont Kosten per bezorger het bedrag voor de gereden routekilometers;
  - zakelijk bestellen (leeg = standaard uit `CONFIG.BUSINESS`): `zakelijk_prijs` (1,83), `zakelijk_btw` (9),
    `zakelijk_minimum` (50), `zakelijk_bezorgen_regio` (10), `zakelijk_bezorgen_buiten` (25), `zakelijk_toeslag_voor_10` (10),
    `zakelijk_toeslag_voor_9` (15), `zakelijk_donatie` (2), `zakelijk_uren_vooraf` (24), `zakelijk_email` en `zakelijk_melding_naar`.
- **Zakelijke dagen** (`datum`, `soort`, `tijd`, `open`): de dagen op het zakelijke bestelformulier. `soort` is `bezorgen` of
  `afhalen`; `open` = `nee` sluit een dag zonder hem te wissen. Het script vult het tabblad de eerste keer met de dagen uit
  Marks formulier (14–31 december en 4–8 januari, afhalen 30 en 31 december).

## Kosten en declaraties

Een vrijwilliger dient een declaratie in met bon, bedrag en IBAN. Daarna:

- de vrijwilliger ziet onder **Mijn declaraties** alleen zijn eigen declaraties, op naam waarmee hij inlogt, met de status en het IBAN afgeschermd (`•••• 4300`);
- beheer keurt goed of af (afkeuren vraagt een reden) en markeert als uitbetaald met de datum;
- alleen beheer ziet de volledige IBANs en kan de status wijzigen.

De tabel `Kosten` krijgt daarvoor de kolommen `iban`, `status`, `reden`, `beoordeeld_door`, `beoordeeld_op` en `uitbetaald_op`; het script voegt ze zelf toe. Bestaande regels zonder status tellen als "ingediend".

## Bestellingen bewerken en het wijzigingslog

Op **Bestellingen → Bewerken** past beheer een bestelling aan. Het script (`updateOrder`):

- schrijft de nieuwe waarden in de bron: `Totaal_lijst bestellingen` (alleen de gewijzigde cellen; `Datum volledig` en `TOTAAL` gaan mee, tenzij daar een formule staat), of `Zakelijke aanvragen` voor een bevestigde zakelijke aanvraag (het bedrag wordt dan opnieuw berekend);
- weigert de wijziging als iemand anders de bestelling net heeft aangepast ("Ververs en probeer het opnieuw");
- zet een (deels) ingepakte order terug naar "opnieuw inpakken" als de aantallen veranderen, en haalt de bezorger weg als de leverdatum verandert;
- legt elke wijziging vast in het tabblad **`Wijzigingslog`**: tijd, soort, bestelling, veld, oud, nieuw, door, rol, toelichting. Ook wijzigingen in de opmerking komen erin.

Inpakkers en bezorgers zien welke velden zijn gewijzigd, maar niet de oude en nieuwe adresgegevens. Bij "Na de actie" wordt het log gewist.

## Klantbevestiging en het tabblad Bevestigd

- **Versturen per e-mail** (`sendConfirmation`) verstuurt de mail met `MailApp`. Pas als dat lukt, wordt in `Dashboard_Orders` vastgelegd: `bevestiging_status` = `verzonden`, `bevestiging_verzonden_op` (tijdstip), `bevestiging_verzonden_naar` (adres).
- Lukt het niet (ongeldig adres, dagquotum op, storing), dan wordt `bevestiging_status` = `mislukt`, met de fout in `bevestiging_fout` en het tijdstip in `bevestiging_poging_op`. De order blijft dan uit **Bevestigd** en de fout staat bij de order. Een mislukte nieuwe poging maakt een eerder verstuurde mail niet ongedaan.
- Alleen orders met `verzonden` staan op het tabblad **Bevestigd**. Dat staat los van *Beoordeeld* (de opmerking) en van een opgeslagen concept.
- Bestaande regels met `verzonden` (van vóór deze versie) tellen gewoon mee, met hun tijdstip. De nieuwe kolommen komen er vanzelf bij.
- Pogingen staan ook in het wijzigingslog (veld *Bevestigingsmail*).
- Het e-mailadres pas je aan via **Bewerken → E-mail** (kolom `Info`).

Let op: "verzonden" betekent dat Gmail de mail heeft aangenomen. Een mail die later terugkomt (bounce) ziet het script niet; die komt binnen in de mailbox van het account dat het script draait.

## Bakkerij (beheer)

De pagina **Bakkerij** (alleen beheer) opent op de leverdag van morgen: een dag van tevoren zet je de bestellijst klaar en stuur je hem naar de bakker. Je deelt de aantallen van een leverdag (met, zonder, totaal; pop-upvoorraad telt mee) via WhatsApp, e-mail of het deelmenu van de telefoon. Elke keer delen legt het script vast (`logBakeShare`, alleen beheer) in het tabblad **`Bakkerij doorgegeven`**: `id`, `leverdatum`, `met`, `zonder`, `totaal`, `kanaal` (`whatsapp`, `email` of `deelmenu`), `door`, `verzonden_op`. Veranderen de aantallen daarna, dan toont het platform het verschil per product en kun je opnieuw delen.

Optioneel in **Instellingen**: `bakkerij_whatsapp` (telefoonnummer, bijv. `06 12345678`) en `bakkerij_email`. Dan gaat het bericht meteen naar de bakkerij; anders kies je bij het delen zelf de ontvanger.

Let op: bij WhatsApp en e-mail wordt het delen vastgelegd op het moment dat je op de knop drukt (het platform kan niet zien of je het bericht daarna echt verstuurt). Bij het deelmenu van de telefoon pas als je een app kiest; sluit je het menu, dan wordt niets vastgelegd.

## Contact bij aflevering

Standaard is het contact op het afleveradres de contactpersoon van de klant: de kolommen `Contactpersoon` en `Contactpersoon telefoonnummer` (of `contactpersoon`/`telefoon` van een zakelijke aanvraag). Op **Bestellingen → Contact bij aflevering** past beheer dat per bezorging aan, met naam, telefoon en een opmerking (bijv. "bel bij aankomst") (`setDeliveryContact`, alleen beheer). Dat staat in `Dashboard_Orders` (`afl_contact_naam`, `afl_contact_telefoon`, `afl_contact_opmerking`, `afl_contact_eigen`); de bron blijft ongemoeid. "Terug naar contact van de klant" maakt het weer leeg. Elke wijziging staat in het wijzigingslog (naam en telefoon alleen zichtbaar voor beheer). Inpakken, Routes, Bezorgen en de pakbon tonen het contact, met een klikbaar telefoonnummer.

## Gebakken aantallen goedkeuren (Bakkerij)

Op **Bakkerij** keurt beheer per leverdag goed hoeveel er echt gebakken is, per product (met en zonder), naast wat de bestellingen nodig hebben (`approveBaked`, alleen beheer). Elke goedkeuring is een nieuwe regel in **`Bakkerij goedkeuringen`**: `id`, `leverdatum`, `met`, `zonder`, `totaal`, `benodigd_met`, `benodigd_zonder`, `soort` (`goedkeuring`, `correctie` of `overgenomen`), `toelichting`, `door`, `goedgekeurd_op`. De laatste regel per dag telt.

- Na goedkeuring ligt een dag vast. Een correctie kan, maar vraagt een reden en komt als nieuwe regel met naam en tijdstip; eerdere regels blijven staan.
- Keuren twee mensen tegelijk goed, dan wordt de tweede geweigerd ("Ververs en kijk of een correctie nodig is").
- Inpakken toont de goedgekeurde aantallen alleen nog (met "goedgekeurd door … om …"); "nog bakken" telt daarvan af. Invullen op het inpakscherm kan niet meer (`setBaked` is weg).
- **Oude aantallen** uit het tabblad `Gebakken` (van het inpakscherm, zonder naam) staan als *Overgenomen van Inpakken* op Bakkerij. Bij de eerste goedkeuring zet het script ze één keer als regels in `Bakkerij goedkeuringen`; daarna keur je ze op naam goed (zonder reden). Het tabblad `Gebakken` blijft bestaan en volgt de laatste goedkeuring.

## Inpakken › Opmerkingen

Op de pagina Inpakken staat het tabblad **Opmerkingen**: per bestelling de wijzigingen uit het `Wijzigingslog` die voor het inpakken tellen (aantallen, datum, soort, naam, bezorgen/afhalen, adres, opnieuw inpakken, nieuwe bestelling) en de opmerking zoals inpakkers die zien. Inpakkers en beheer vinken een item af als verwerkt (`setPackNoteDone`). Dat staat in het tabblad **`Inpak opmerkingen`** (`item_id`, `order_id`, `verwerkt_door`, `verwerkt_op`).

`item_id` is `wijziging|<order>|<tijd>` of `opmerking|<order>|<code van de tekst>`. Een nieuwe wijziging (of een aangepaste opmerking) krijgt dus een nieuw item en staat weer open. Terugzetten kan ook (de cellen worden dan leeg).

## Particulier en pop-upvoorraad

- **+ Bestelling** en **+ Pop-upvoorraad** op de pagina Bestellingen zetten een nieuwe regel onderaan `Totaal_lijst bestellingen` (`createOrder`). Pop-upvoorraad krijgt een nummer `POP-001`, `POP-002`, …; andere bestellingen `OB-001`, …. Pop-ups zijn altijd *Afhalen* en komen dus niet in de routes.
- De soort van een bestaande bestelling pas je aan via **Bewerken → Soort** (of direct in de kolom `Type`).
- Per pop-up legt beheer vast hoeveel er verkocht is (`setPopupSales`). Dat staat in het tabblad **`Pop-up verkoop`** (`order_id`, `met_verkocht`, `zonder_verkocht`, `bedrag`, `bijgewerkt_door`, `bijgewerkt_op`) en in het wijzigingslog. Is `bedrag` leeg, dan rekent de tussenstand met `prijs_per_oliebol`.
- Tussenstand en omzet tellen van een pop-up alleen het verkochte deel; bakken en inpakken tellen de hele voorraad.

## Na de actie: persoonsgegevens verwijderen

Onder **Vrijwilligers → Na de actie** kan beheer met één knop (na het typen van VERWIJDER) alles wissen wat de toestemmingstekst belooft:

- alle aanmeldingen in `Formulierreacties 1`;
- in `Totaal_lijst bestellingen`: contactpersoon, telefoon, e-mail (`Info`), adres (`Bezorglocatie`) en opmerkingen (`Comments`);
- namen in de dashboardtabbladen, IBANs in `Kosten`, de routes, de opgezochte adressen in `Locaties`, en de bonfoto's in de Drive-map.

Aantallen, bedragen en datums blijven staan, zodat de tussenstand van volgend jaar kan vergelijken. Maak eventueel eerst een kopie van de Sheet.

## Realtime

Elke wijziging verhoogt een versienummer. Het dashboard vraagt elke 3 seconden "iets nieuw sinds versie X?";
het antwoord is klein als er niets veranderd is, en bevat meteen de nieuwe stand als er wel iets veranderd is.
Wijzigingen in de Sheet zelf verhogen het versienummer ook:

| Wat er in de Sheet gebeurt | Trigger | Zichtbaar in het platform |
|---|---|---|
| Een cel typen of aanpassen (elk tabblad) | `onEdit` (werkt altijd) | binnen een paar seconden |
| Rijen invoegen/verwijderen, sorteren, plakken | `bijWijziging` (na `installeer`) | binnen een paar seconden |
| Nieuwe bestelling of aanmelding via Google Formulier | `bijFormulier` (na `installeer`) | binnen een paar seconden |
| Iets anders (formules, import, ander script) | — | uiterlijk na 5 minuten |

**Snelheid.** Het script bouwt de stand (alle tabbladen samen) één keer per versie op en bewaart die 5 minuten
in de scriptcache (`CacheService`). Openen en verversen leest dan niets uit de Sheet; alleen na een wijziging
wordt de stand opnieuw opgebouwd. Het platform onthoudt in de browser de laatst bekende stand, zodat een pagina
direct opent en daarna op de achtergrond bijwerkt ("Bijwerken…" → "Live"). Bij uitloggen wordt die gewist.

Je kunt dus in elk tabblad met de hand corrigeren: een bezorger in `Dashboard_Orders`, een claim in `Inpakken`,
aantallen in `Gebakken`, de prijs in `Instellingen`. Pas alleen de kolomnamen in rij 1 niet aan.
Order-ID's (de eerste kolom) houdt het script als tekst, zodat Sheets er geen datum van maakt.

## Privacy

- Klantgegevens zijn in het dashboard alleen zichtbaar na inloggen met een toegangscode. Kies lange codes en wissel ze na de actie.
- Zet de Google-bestanden zelf op **Delen → Algemene toegang → Beperkt**. Het script heeft geen openbare link nodig.
- Alleen **beheer** ziet aanmeldingen van vrijwilligers en de kostenlijst.
- Verwijder na de actie de aanmeldingen en (zo nodig) de bonnenmap in Drive; dat staat in de toestemmingstekst.
