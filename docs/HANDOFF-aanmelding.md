# Hand-off: vrijwilligersaanmelding als gesprek

Dit bestand beschrijft wat er op de branch `feat/aanmelding-gesprek` staat en wat het doet.

## Waar het staat

- **Repo:** `maxhelmantel-gif/oma-coby-dashboard` (eigen kloon van `Cschoorl/Oma-Coby-s-platform`)
- **Branch:** `feat/aanmelding-gesprek`. Er is nog geen pull request.
- **Pagina:** `#/aanmelden`. Openbaar, zonder inlog.
- **Starten:** `npm install` en dan `npm run dev`. Zonder `VITE_APPS_SCRIPT_URL` draait alles in demo-modus.

## Wat het is

De aanmelding voor vrijwilligers is een gesprek met Oma Coby in plaats van één lang formulier:

- Oma stelt één vraag tegelijk in chatberichtjes links. Ze opent met twee berichtjes: wie ze is (haar digitale versie) en de eerste vraag.
- Je antwoordt met knoppen of vinkjes in een kaart onder het gesprek.
- Elk antwoord blijft rechts als donker berichtje staan, met *Wijzig* ernaast.
- Voor elk nieuw bericht laat Oma kort typ-puntjes zien. Bij "minder beweging" (`prefers-reduced-motion`) en na *Wijzig* staat alles meteen in beeld.
- Een korte reactie op je vorige antwoord staat in hetzelfde berichtje als de volgende vraag.

## Wat het doet: de stappen

De eerste vraag kiest de route:

| Route | Stappen daarna |
| --- | --- |
| **Ik weet wat ik wil doen** (`taak`) | taak kiezen → rijbewijs (alleen bij bezorgen) → mag ik je ergens anders neerzetten → per taak de dagen → krappe momenten (alleen als die er zijn) |
| **Ik weet wanneer ik kan** (`dag`) | dagen kiezen → dagdeel per dag (alleen op dagen met meer dan één dienst) → wat wil je die dagen doen, met de knop "Maakt niet uit" → rijbewijs (alleen bij bezorgen) → mag ik je ergens anders neerzetten |
| **Zet me maar in waar het nodig is** (`flexibel`) | dagen kiezen → dagdeel per dag (alleen waar nodig) → alle taken staan aan, je haalt weg wat niet past → rijbewijs (alleen bij bezorgen) |

Na elke route volgen dezelfde stappen:

1. **Maximum:** "Je kunt op N dagen. Op hoeveel daarvan wil je helpen?" Alleen als je meer dan één dag hebt.
2. **Herinnering de dag ervoor:** WhatsApp, mail of hoeft niet.
3. **Contact:**
   - voor- en achternaam (verplicht)
   - telefoon (verplicht bij WhatsApp)
   - e-mail (verplicht bij mail)
   - woonplaats
   - adres (alleen voor bezorgers)
4. **Samenvatting:** per taak de dagen, het rijbewijs, of je ingedeeld mag worden waar het nodig is, en je maximum. Daaronder een opmerkingenveld, toestemming en de knop *Aanmelden*.

Details van de stappen:

- **Rijbewijs.** Keuze uit *Rijbewijs én auto*, *Rijbewijs, geen auto* of *Geen rijbewijs*. Bij "geen rijbewijs" valt bezorgen af. Was dat je enige taak, dan ga je terug naar de taakkeuze.
- **"Mag ik je ergens anders neerzetten"** noemt de gekozen taak, bijvoorbeeld: "Je hebt gekozen voor inpakken. Als het bij een andere taak drukker is, mag ik je daar dan ook neerzetten?" Hij wordt overgeslagen bij de route `flexibel`, en ook als je alle taken hebt gekozen. In die twee gevallen wordt hij opgeslagen als *ja*.
- **Krappe momenten.** Op dagen met weinig aanmeldingen staat een rode stip, maar alleen als hooguit de helft van de dagen krap is. In de route `taak` stelt Oma tot vier krappe momenten voor die je kunt toevoegen. In de route `flexibel` toont de samenvatting de drie momenten waar het meest nodig is.

## Taken en tijden

| Taak | Tijd | Waar ingesteld |
| --- | --- | --- |
| Inpakken (Aalsmeer) | 6:30–12:00 | `DEFAULT_TIMES` in `src/config.ts`, `DEFAULT_ROLE_TIMES` in `src/utils/agendaParser.ts` |
| Autokoerier (bezorgen) | 9:00–12:00, één ochtenddienst | idem |
| Oliebollenbar | per moment uit het tabblad Agenda | Agenda |

Over de fietskoerier:

- Je kunt je niet meer als fietskoerier aanmelden.
- De taak bestaat nog in het type `VolunteerRole`, omdat oude aanmeldingen hem hebben.
- Aanmelden, bezetting en totalen gebruiken `ACTIVE_ROLES` (`src/types/dashboard.ts`): inpakken, autokoerier en oliebollenbar.
- `applyAgenda` geeft de fietskoerier altijd een lege lijst, ook als hij nog in de Agenda staat.

## Wat er wordt opgeslagen

De aanmelding gaat naar `backend.registerVolunteer` met dezelfde velden als het Google Formulier: per taak *wil* + momenten, plus naam, contact, opmerking en toestemming. Daarnaast is er een nieuw veld `planning`:

```ts
planning: { mode, flexible, maxShifts, reminder, driving? }
```

- **Demo-modus** (`src/data/backend.ts`): alles komt in `localStorage` onder `omacoby-demo-v5`.
- **Apps Script** (`apps-script/Code.gs`): de aanmelding komt in het tabblad *Formulierreacties 1*.
  - De bestaande formulierkolommen worden gevuld zoals bij het Google Formulier.
  - Zes kolommen zet het script achteraan als ze er nog niet staan, op het moment dat ze voor het eerst een waarde krijgen:

| Kolom | Waarden |
| --- | --- |
| Adres | vrije tekst (alleen bezorgers) |
| Hoe aangemeld | Taak in gedachten / Dag in gedachten / Maakt niet uit |
| Mag ingedeeld worden waar nodig | Ja / Nee |
| Maximaal aantal dagen | 1 dag, 2 dagen, … |
| Rijbewijs | Rijbewijs en auto / Rijbewijs, geen auto |
| Herinnering 24 uur van tevoren | WhatsApp / Mail / Nee |

Bij het inlezen zet `readPlanning_` deze kolommen terug naar `planning`. Op de beheerpagina *Vrijwilligers* staan ze als labels per persoon:

- "Inzetbaar waar nodig"
- "Max N dagen"
- het rijbewijs
- "Herinnering via …"

Het opslaan van de herinneringskeuze is gebouwd. Het versturen van herinneringen is niet gebouwd.

## Bestanden

| Bestand | Wat erin zit |
| --- | --- |
| `src/features/volunteers/SignupPage.tsx` | De pagina: volgorde van de stappen (`stepIds`), Oma's teksten per stap (`copy`), de antwoordknoppen per stap (`composer`), versturen en het bedankscherm |
| `src/features/volunteers/signupFlow.ts` | Logica zonder scherm: de antwoorden (`Answers`), dagen en dagdelen uit de agenda, omzetten naar het formulierformaat (`toRoles`), krappe dagen en momenten |
| `src/types/dashboard.ts` | `ACTIVE_ROLES`, `SignupPlanning` en labels (`maxShiftsLabel`, `drivingLabel`, `reminderLabel`) |
| `src/config.ts` | Standaardtijden en -momenten per taak, `applyAgenda` |
| `src/data/backend.ts` | `planning` in de demo-opslag |
| `src/features/volunteers/VolunteersPage.tsx` | Labels per vrijwilliger; filters en totalen alleen voor actieve taken |
| `src/styles.css` | Typ-puntjes (`.oc-typing`) |
| `apps-script/Code.gs` | Extra kolommen schrijven en teruglezen |
| `docs/vrijwilligers-aanmelding.md` | Persona, keuzes achter het gesprek en de stappen in detail |

## Wat wel en niet getest is

- **Getest in demo-modus** op de lokale dev-server, alle drie de routes tot en met de samenvatting:
  - taak met "geen rijbewijs"
  - dag met "Maakt niet uit"
  - flexibel
  - dagdelen per dag, met een tijdelijke agenda met meer diensten op een dag
- **Getest op de beheerpagina:** de labels op *Vrijwilligers*.
- **Niet getest tegen een echte Google Sheet:** de wijzigingen in `apps-script/Code.gs` zijn alleen op syntax gecontroleerd. Of de extra kolommen goed worden aangemaakt en teruggelezen, moet nog in een kopie van de Sheet worden geprobeerd.
- **Er zijn geen automatische tests** voor deze flow.
