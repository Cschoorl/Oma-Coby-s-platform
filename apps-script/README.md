# Google Sheet-koppeling (Apps Script)

Het dashboard praat met de Google Sheets via één Apps Script (`Code.gs`). Zet het script in het
**bestellingenbestand** ("Aanvraagformulier zakelijke bestelling (Antwoorden)"); het vrijwilligersbestand
koppel je met een Script-eigenschap.

Het script:

- leest de bestellingen uit het tabblad **Totaal_lijst bestellingen** (zakelijk, particulier en barter; dat tabblad wordt nooit aangepast);
- bewaart alles van het dashboard in eigen tabbladen, die het zelf aanmaakt:
  `Dashboard_Orders`, `Inpakken`, `Gebakken`, `Routes`, `Kosten`, `Historie`, `Instellingen`;
- leest en schrijft vrijwilligers in het antwoordenblad van het Google Formulier (`Formulierreacties 1`),
  zodat formulier en aanmeldpagina in één lijst terechtkomen;
- zet claims van inpakkers vast met een slot (`LockService`), zodat twee mensen nooit dezelfde order pakken;
- logt elke afgeronde en heropende order met naam en tijd in het tabblad `Inpaklog`;
- berekent routes en kilometers met de ingebouwde Google Maps-dienst (geen API-sleutel nodig);
- verstuurt klantbevestigingen vanuit het Google-account van de Sheet (`MailApp`);
- laat bonnen uitlezen door Claude en bewaart de foto's in Google Drive.

## Installeren (± 15 minuten)

1. Open het bestellingenbestand → **Extensies → Apps Script**.
2. Vervang de inhoud van `Code.gs` door [`Code.gs`](./Code.gs) uit deze map.
3. Pas bovenin `CONFIG` aan:
   - `ORDERS_SHEET`: naam van het tabblad met bestellingen (standaard `Totaal_lijst bestellingen`).
   - `COLUMNS`: alleen aanpassen als kolomkoppen veranderen.
   - `START_ADDRESS`: de baklocatie.
   - `SEASON_YEAR`: alleen nodig als er geen tijdstempels in het blad staan.
4. **Projectinstellingen (tandwiel) → Script-eigenschappen**, voeg toe:

   | Eigenschap | Waarde |
   |---|---|
   | `CODE_BEHEER` | lange code voor beheer, bijv. `Coby-beheer-7391` |
   | `CODE_INPAKKER` | code voor inpakkers |
   | `CODE_BEZORGER` | code voor bezorgers |
   | `ANTHROPIC_API_KEY` | API-sleutel van console.anthropic.com (alleen nodig voor het uitlezen van bonnen) |
   | `VOLUNTEERS_SPREADSHEET_ID` | ID van het bestand met de formulierantwoorden, als dat een ander bestand is dan waar het script in staat. Het ID is het lange stuk in de URL tussen `/d/` en `/edit`. Zet het hier en niet in de code: de repo is openbaar. |

5. **Implementeren → Nieuwe implementatie → Web-app**
   - Uitvoeren als: **Ik**
   - Wie heeft toegang: **Iedereen**
   - Geef toestemming voor Sheets, Gmail (versturen), Drive, Maps en externe verzoeken.
6. Kopieer de web-app-URL (eindigt op `/exec`).
7. In GitHub → **Settings → Secrets and variables → Actions → New repository secret**:
   `VITE_APPS_SCRIPT_URL` = die URL. Push of start de deploy-workflow opnieuw.

Lokaal testen kan met `VITE_APPS_SCRIPT_URL=... npm run dev` (of zet hem in `.env`).

Na elke wijziging aan `Code.gs`: **Implementeren → Implementaties beheren → bewerken → Nieuwe versie**,
anders draait de oude versie.

## Kolommen in Totaal_lijst bestellingen

| Kolom | Gebruikt voor |
|---|---|
| `Unique ID` | ordernummer en besteldatum (tijdstempel) voor de tussenstand |
| `Type` (Zakelijk / Particulier / Barter / …) | splitsing in de inpaktool |
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

- De agenda in het dashboard wordt gevuld uit deze aanmeldingen (beschikbaarheid, niet het definitieve rooster).
- Inpakkers en bezorgers zien alleen namen en dagen; telefoon, e-mail en opmerkingen ziet alleen beheer.
- De dagen op de aanmeldpagina staan in `src/config.ts` (`SIGNUP_OPTIONS`), het aantal benodigde mensen per
  taak per dag(deel) in `STAFFING_TARGETS`. Daarmee kleurt de bezettingskalender en stelt de aanmeldpagina
  rustige momenten voor (de aanmeldpagina krijgt alleen aantallen, geen namen).
- Vult iemand een adres in, dan voegt het script achteraan een kolom `Adres` toe (het 2025-formulier had die niet).

Het Google Formulier blijft gewoon werken; je kunt het naast de aanmeldpagina gebruiken of de aanmeldpagina
in de plaats ervan delen.

## Tabbladen die je zelf vult

- **Historie**: één regel per dag van eerdere jaren: `jaar`, `datum` (JJJJ-MM-DD), `bestellingen`, `oliebollen`, `omzet`.
  Totalen per week of per seizoen mogen ook (zet dan de laatste dag van die periode als datum).
- **Instellingen**: `prijs_per_oliebol` (bijv. `0,95`) als de Sheet geen bedrag per order heeft.

## Realtime

Elke wijziging verhoogt een versienummer. Het dashboard vraagt dat elke 3 seconden op en laadt alleen
opnieuw als er iets veranderd is. Wijzigingen die je direct in de Sheet typt, komen via `onEdit` ook door.

## Privacy

- Klantgegevens zijn in het dashboard alleen zichtbaar na inloggen met een toegangscode. Kies lange codes en wissel ze na de actie.
- Zet de Google-bestanden zelf op **Delen → Algemene toegang → Beperkt**. Het script heeft geen openbare link nodig.
- Alleen **beheer** ziet aanmeldingen van vrijwilligers en de kostenlijst.
- Verwijder na de actie de aanmeldingen en (zo nodig) de bonnenmap in Drive; dat staat in de toestemmingstekst.
