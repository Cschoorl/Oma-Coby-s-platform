# Google Sheet-koppeling (Apps Script)

Het dashboard praat met de Google Sheet via één Apps Script (`Code.gs`). Dat script:

- leest de bestellingen uit het tabblad **Bestellingen** (dat tabblad wordt nooit aangepast);
- bewaart alles van het dashboard in eigen tabbladen, die het zelf aanmaakt:
  `Dashboard_Orders`, `Inpakken`, `Gebakken`, `Routes`, `Kosten`, `Historie`, `Instellingen`;
- leest en schrijft vrijwilligers in het antwoordenblad van het Google Formulier (`Formulierreacties 1`),
  zodat formulier en aanmeldpagina in één lijst terechtkomen;
- zet claims van inpakkers vast met een slot (`LockService`), zodat twee mensen nooit dezelfde order pakken;
- berekent routes en kilometers met de ingebouwde Google Maps-dienst (geen API-sleutel nodig);
- verstuurt klantbevestigingen vanuit het Google-account van de Sheet (`MailApp`);
- laat bonnen uitlezen door Claude en bewaart de foto's in Google Drive.

## Installeren (± 15 minuten)

1. Open de Google Sheet → **Extensies → Apps Script**.
2. Vervang de inhoud van `Code.gs` door [`Code.gs`](./Code.gs) uit deze map.
3. Pas bovenin `CONFIG` aan:
   - `ORDERS_SHEET`: naam van het tabblad met bestellingen.
   - `COLUMNS`: de kolomkoppen van jouw Sheet (meerdere namen per veld mogen).
   - `START_ADDRESS`: de baklocatie.
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

## Kolommen in het tabblad Bestellingen

Verplicht: `order_id`, `leverdatum`, `leverancier_naam` (de bezorger), `locatie_naam`, `adres`, `postcode`, `plaats`,
`oliebollen_met_krenten`, `oliebollen_zonder_krenten`.

Optioneel, maar nodig voor sommige functies:

| Kolom | Gebruikt voor |
|---|---|
| `email` | klantbevestiging versturen |
| `type_klant` (`particulier` / `zakelijk`) | B2B-splitsing in de inpaktool |
| `bedrag` | omzet in de tussenstand (anders: oliebollen × `prijs_per_oliebol`) |
| `besteldatum` | tussenstand per besteldatum (anders: leverdatum) |
| `extra_notities` | opmerkingen beoordelen |

## Vrijwilligers (Google Formulier)

Het script leest het tabblad `Formulierreacties 1` (instelbaar via `CONFIG.VOLUNTEERS_SHEET`) en herkent de kolommen
aan het begin van de vraag, bijv. "Op welke dag(en) kan je helpen als fietskoerier?". Extra kolommen achteraan
mogen blijven staan. Aanmeldingen via de aanmeldpagina (`#/aanmelden`) worden in hetzelfde tabblad toegevoegd,
in dezelfde kolommen en hetzelfde formaat als het formulier ("Vrijdag 18 december: middag").

- De agenda in het dashboard wordt gevuld uit deze aanmeldingen (beschikbaarheid, niet het definitieve rooster).
- Inpakkers en bezorgers zien alleen namen en dagen; telefoon, e-mail en opmerkingen ziet alleen beheer.
- De dagen op de aanmeldpagina staan in `src/config.ts` (`SIGNUP_OPTIONS`).

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

- Klantgegevens zijn alleen zichtbaar na inloggen met een toegangscode. Kies lange codes en wissel ze na de actie.
- Alleen **beheer** ziet aanmeldingen van vrijwilligers en de kostenlijst.
- Verwijder na de actie de aanmeldingen en (zo nodig) de bonnenmap in Drive; dat staat in de toestemmingstekst.
