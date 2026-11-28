# Wall of fame · logo zoeken (n8n)

Zoekt het logo van een bedrijf dat op de wall of fame komt (Zilver en Goud) en meldt het terug aan het Apps Script.
Claude kiest en controleert; **beheer keurt goed** op de beheerpagina *Wall of fame* (`#/muur`). Tot dan hangt het
naambordje. Achtergrond en eisen: [`docs/wall-of-fame.md`](../../docs/wall-of-fame.md).

> **Stand 27 november 2026: uitgeschreven, nooit gedraaid.** De workflow is importeerbaar en hoort bij het script,
> maar er is geen n8n-omgeving, geen Brandfetch-account en geen API-sleutel voor. Het platform heeft hem niet nodig:
> zonder `WALL_N8N_WEBHOOK` zet het script een plek op "zoeken" en haalt de logozoeker (de dagelijkse taak in Claude,
> zie `docs/wall-of-fame.md`) hem op met de actie `wallTodo`. n8n is de keuze als logo's binnen een minuut na het
> bevestigen klaar moeten staan in plaats van de volgende ochtend.

```
Apps Script (bevestigen, of "Zoek opnieuw")
   │  POST + header X-Oma-Coby-Secret          schemas/logo-request.schema.json
   ▼
Logo gevraagd ─▶ Instellingen ─▶ Domeinen ─▶ Zoeken nodig? ─ja─▶ Brandfetch zoeken ─▶ Zoekresultaat ─┐
                                                   └─nee──────────────────────────────────────────────┤
                                                                                                      ▼
            Terugmelden ◀─ Keuze ◀─ Claude kiest ◀─ja─ Logo's gevonden? ◀─ Kandidaten ◀─ Brandfetch merk ◀─ Per domein
                 ▲                                         └─nee─▶ Niets gevonden ─┐
                 └────────────────────────────────────────────────────────────────┘
   │  POST actie wallOfFameLogo                schemas/logo-callback.schema.json
   ▼
Apps Script: logo_status "nakijken" (of "geen")
```

| Stap | Wat | Code |
|---|---|---|
| Logo gevraagd | Webhook, antwoordt meteen 202. Controleert de header `X-Oma-Coby-Secret`. | |
| Domeinen | Domeinen uit de bestelling (het zakelijke e-mailadres). Gratis mail is er in het script al uit. | `code/1-domeinen.js` |
| Brandfetch zoeken | Alleen zonder domein: Brand Search op de bedrijfsnaam. | |
| Zoekresultaat | Houdt drie domeinen over: zelfde naam, door het merk beheerd, `.nl` eerst. | `code/2-zoekresultaat.js` |
| Brandfetch merk | Brand API per domein: logo's per soort en thema, SVG en PNG. | `code/3-per-domein.js` |
| Kandidaten | Maximaal vier logo's (woordmerk eerst); Logo.dev als terugval; bouwt de vraag aan Claude. | `code/4-kandidaten.js` |
| Claude kiest | `claude-opus-5-5` met de logo's als plaatjes en een vast antwoordschema. | `schemas/claude-choice.schema.json` |
| Keuze / Niets gevonden | Maakt het bericht voor het script. Bij een fout of twijfel: `found: false`. | `code/5-keuze.js`, `code/6-niets.js` |
| Terugmelden | POST naar de web-app-URL van het Apps Script. | |

## Installeren

1. **Importeer** `workflow.json` in n8n (*Workflows › Import from file*).
2. **Credentials** (type *Header Auth*), op naam gekoppeld:
   - `Oma Coby wall of fame`: naam `X-Oma-Coby-Secret`, waarde = een lang willekeurig geheim.
   - `Brandfetch`: naam `Authorization`, waarde `Bearer <Brandfetch API key>`.
   - `Anthropic`: naam `x-api-key`, waarde = de Anthropic API key.
3. **Omgevingsvariabelen** voor de node *Instellingen* (of typ de waarden daar zelf in als je n8n `$env` blokkeert):
   - `OMA_COBY_SCRIPT_URL`: de web-app-URL van het Apps Script (eindigt op `/exec`).
   - `OMA_COBY_WALL_SECRET`: hetzelfde geheim als hierboven.
   - `BRANDFETCH_CLIENT_ID`: de client-ID voor Brand Search (openbaar, staat in je Brandfetch-account).
   - `LOGO_DEV_TOKEN`: de publishable key van Logo.dev (`pk_…`), mag leeg; dan geen terugval.
4. **Activeer** de workflow en kopieer de productie-URL van *Logo gevraagd*.
5. **Script-eigenschappen** in Apps Script (*Projectinstellingen*):
   - `WALL_N8N_WEBHOOK`: de URL uit stap 4.
   - `WALL_CALLBACK_SECRET`: hetzelfde geheim.
6. Het tabblad **Wall of fame** maakt het script zelf aan zodra het nodig is.

Testen zonder bestelling: stuur `examples/logo-request.json` naar de test-URL van de webhook, met de header. Het
script negeert een terugmelding voor een sleutel die niet op "zoeken" staat, dus een test kan niets overschrijven.

## Wat er heen en terug gaat

- **Heen** (`schemas/logo-request.schema.json`, voorbeeld `examples/logo-request.json`): sleutel, seizoen,
  bedrijfsnaam, naam op de muur, pakket, plaats en domeinen. Geen contactpersoon, telefoon, e-mail of bedragen.
- **Terug** (`schemas/logo-callback.schema.json`, voorbeelden `examples/logo-callback*.json`): gevonden of niet,
  de logo-URL (SVG als die er is), het domein waar het logo vandaan komt, de inkt, de bron, hoe zeker en één zin
  voor beheer.
- Het script accepteert een terugmelding alleen met het juiste geheim, en alleen voor een plek die op "zoeken"
  staat: een goedgekeurd logo wordt nooit overschreven.

## Waarom deze diensten

| Dienst | Rol |
|---|---|
| Domein uit de bestelling | Eerste bron en gratis: de klant gaf het zelf. |
| Brandfetch Brand Search | Bedrijfsnaam → domeinen, als de klant geen website gaf en met gratis mail bestelde. |
| Brandfetch Brand API | Domein → woordmerk, symbool en icoon, licht en donker, in SVG: precies wat in een lijst past. |
| Logo.dev | Terugval: een vierkant icoon per domein. |
| Claude (`claude-opus-5-5`) | Kijkt naar de plaatjes en kiest. Is dit *deze* Studio Noorderlicht uit Amsterdam of een naamgenoot? Is het een logo of een standaardicoontje? Blijft het herkenbaar als inkt? Liever "geen" dan een verkeerd logo. |

Clearbit Logo bestaat niet meer en een favicon is te klein voor een lijst; die gebruiken we niet.

## Aanpassen

De Code-nodes staan als losse bestanden in `code/`, het antwoordschema voor Claude in `schemas/`. Pas die aan en
bouw de workflow opnieuw:

```bash
node automation/wall-of-fame/build.mjs
```

Importeer daarna `workflow.json` opnieuw (of plak de code in de node).

Claude kan geen SVG bekijken. Daarom krijgt het de PNG te zien, en gaat de SVG van hetzelfde logo naar de muur.
Kan Claude een plaatje niet openen, dan faalt de hele vraag. Dan komt er `found: false` met de foutmelding als
toelichting, en kan beheer op "Zoek opnieuw" klikken of zelf een logo-link plakken.
