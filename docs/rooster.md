# Rooster: wie staat wanneer

De pagina **Rooster** (`#/rooster`, alleen beheer) is het rooster van de vrijwilligers. De pagina **Vrijwilligers**
laat zien wie *kan*; het rooster legt vast wie er *staat*, met de definitieve tijden. De oude pagina Agenda
("waar is nog plek") is hierin opgegaan; een oude link naar `#/agenda` komt op het rooster uit.

## Het scherm

- **Bovenaan de stand:** open plekken deze week, hoeveel diensten er zijn ingepland en hoeveel aanmelders nog
  nergens staan.
- **De week als agenda:** één kolom per dag, met de diensten in de volgorde van de klok:
  Inpakken 7:00–9:30, Bezorgen ochtend 9:00–12:30, Bezorgen middag 12:30–15:00 en op evenementdagen de Bar met de
  naam en tijd van het evenement. Zaterdag 19 en zondag 20 december hebben alleen een kolom omdat er dan een evenement
  is. Per dienst staat wie er is ingepland en *ingepland/nodig* (bijvoorbeeld `2/3`, met ✓ als de dienst vol is).
- **Plannen op een dag:** klik een dag. Links de diensten, rechts wie zich voor die dag heeft opgegeven.
  - **Nodig:** met − en + stel je per dienst in hoeveel mensen er nodig zijn. `0` kan: dan is er niemand nodig.
    *Zet 3 op alle dagen* neemt het aantal over voor dezelfde dienst op alle dagen (niet voor de bar: elk evenement
    is anders).
  - **Inplannen:** sleep een naam naar een dienst, of klik op de knop met de dienst bij die naam (`+ Inpakken`).
    Knoppen in de taakkleur zijn diensten waarvoor iemand zich heeft opgegeven. Wie *inzetbaar waar nodig* is,
    krijgt ook de andere diensten van die dag aangeboden (bezorgen alleen met een eigen auto).
  - **Iemand anders:** zoek op naam om iemand in te plannen die zich niet voor die dag heeft opgegeven, of typ een
    naam die niet bij de aanmeldingen staat.
  - **Verplaatsen:** sleep een ingeplande naam naar een andere dienst, of in de week naar een andere dag. Naar
    dezelfde dienst op een andere dag blijven de tijden staan; een andere dienst krijgt zijn eigen tijden.
  - **Tijden wijzigen:** klik op de tijd achter een naam. Daar kan ook een opmerking bij.
  - **Weghalen:** het kruisje, of sleep de naam terug naar de lijst rechts.
- **Klik op een naam** voor het paneel met contactgegevens, de ingeplande diensten en alle dagen waarop iemand kan.

Slepen werkt met de muis. Op een telefoon of tablet plan je met de knoppen.

## Opmerkingen bij een dienst

Onder een ingeplande naam staat in het klein wat de planner wil weten. Het zijn opmerkingen, geen blokkades:

- niet opgegeven voor deze dienst;
- staat niet bij de aanmeldingen;
- staat ook op een andere dienst die in tijd overlapt (inpakken tot 9:30 en bezorgen vanaf 9:00 overlappen);
- staat op meer dagen dan het eigen maximum;
- heeft geen eigen auto (bij bezorgen).

In de week staat bij zo'n naam een `~`.

## Waar het staat

| Wat | Waar |
|---|---|
| Ingeplande diensten | tabblad `Rooster` van de Sheet (`state.roster`), zie `apps-script/README.md` |
| Hoeveel mensen nodig | kolom `nodig` van het tabblad `Agenda` (`state.agenda`); leeg = standaard uit `STAFFING_TARGETS` |
| Dagen, diensten en tijden | `SEASON_WORKDAYS`, `SHIFT_TIMES` en `BAR_EVENTS` in `src/config.ts` |
| Beschikbaarheid | de aanmeldingen (`Formulierreacties 1`), alleen gelezen via `canDo` in `src/features/rooster/roster.ts` |

| Bestand | Wat erin zit |
|---|---|
| `src/features/rooster/roster.ts` | dagen, weken, diensten per dag, wie kan, de opmerkingen bij een dienst |
| `src/features/rooster/RoosterPage.tsx` | de pagina, de week en het slepen |
| `src/features/rooster/DayPlanner.tsx` | plannen op één dag: diensten, nodig, beschikbaar |
| `apps-script/Code.gs` | `saveShift`, `removeShift`, `setNeeded`, `readRoster_` |

Verandert de vorm van de aanmeldingen, dan is `canDo` de enige plek in het rooster die mee moet.

## Dagelijkse mail aan de planner

Elke ochtend krijgt de planner een mail met wie er de volgende dag op het rooster staat: telefoonnummer, diensten,
een klaargezet bericht en een knop die WhatsApp opent met dat bericht ingevuld. De planner verstuurt zelf. Ontvanger,
afzender, het aantal dagen vooraf en de tekst van het bericht stel je in het tabblad Instellingen in; zie
`apps-script/README.md` (*Dagelijkse roostermail aan de planner*) en het voorbeeld in `docs/mail-rooster.html`.

## Nog niet

- Een automatisch voorstel ("vul voor"): de planner plant met de hand.
- Bevestiging of herinnering aan de vrijwilliger vanuit het rooster.
- Slepen op een aanraakscherm.
