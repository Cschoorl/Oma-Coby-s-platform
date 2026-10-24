# Vrijwilligersaanmelding als gesprek

De aanmelding (`#/aanmelden`, `src/features/volunteers/SignupPage.tsx`) is een gesprek met Oma Coby. Ze stelt zich voor, vraagt één ding tegelijk en reageert kort op elk antwoord. Eerdere antwoorden blijven als chat erboven staan, elk met *Wijzig*. De logica staat los in `signupFlow.ts`.

## Persona: Oma Coby

- **Toon.** Warm, een beetje ondeugend, korte zinnen, je/jij. Zodra ze je naam weet, gebruikt ze die ("Dankjewel, Ria!").
- **Eerlijk dat ze digitaal is.** "Oma Coby hier, nou ja, mijn digitale versie." Door de typ-puntjes zou je anders kunnen denken dat er echt iemand typt.
- **Rustige opening.** Twee berichtjes: wie ze is, wat dit is en dat het kort duurt, en dan meteen de eerste vraag met antwoordknoppen. De begroeting staat er direct; alleen de vraag krijgt typ-puntjes. Geen lijst met taken vooraf: uitleg komt pas bij de vraag waar hij nodig is.
- **Geen persoonsgegevens vooraf.** Naam en contact vraagt ze pas aan het eind, als je al weet waar je ja tegen zegt.
- **Weinig gebabbel.** Eén bericht per beurt. Haar reactie opent de volgende vraag ("Fijn! Je kunt op 3 dagen. …") en staat er alleen als hij iets toevoegt. Geen "Genoteerd." na elk antwoord.
- **Ritme.** Ze typt kort (een halve seconde), zodat het als antwoord leest en nooit als wachten. Bij "minder beweging" en na *Wijzig* staat alles meteen in beeld.
- **Antwoorden zijn knoppen.** Korte keuzes zijn knoppen die meteen antwoorden. Meer kiezen gaat met vinkjes en *Verder*. Vrije tekst is er alleen voor naam, contact en opmerking.
- **Geen beloftes.** Ze zegt nooit dat je ergens ingedeeld bent. Het rooster volgt later, en dat zegt ze ook.

## Waarom geen chatbot

We hebben gekozen voor een begeleid gesprek met knoppen in plaats van een chatbot met vrije tekst:

- **Geen misverstanden.** Vrije tekst ("na de kerst kan ik wel") moet een taalmodel omzetten naar momenten in de agenda, en dat gaat soms mis. Bij knoppen weet je zeker wat er in de Sheet komt.
- **Geen API-sleutel, kosten of persoonsgegevens naar een extern model** op een openbare pagina.
- **Toegankelijk en snel op de telefoon.** Knoppen werken met toetsenbord en schermlezer: het gesprek is een `log` die nieuwe berichten voorleest.

Een chatbot kan later alsnog als extra ingang, bijvoorbeeld via WhatsApp voor vragen. Hij zou dezelfde antwoorden invullen (`Answers` in `signupFlow.ts`).

## Diensten

Bestellingen worden vóór twaalf uur bezorgd. Er is dus één ochtenddienst per dag:

| Taak | Tijd |
| --- | --- |
| Inpakken (Aalsmeer) | 6:30–12:00 |
| Autokoerier | 9:00–12:00 |
| Oliebollenbar | per evenement, uit het tabblad Agenda |

De fietskoerier doet niet meer mee. De taak bestaat nog in de code (`VolunteerRole`), omdat aanmeldingen van vorig jaar hem hebben. Aanmelden, bezetting en totalen gebruiken alleen `ACTIVE_ROLES`. De agenda biedt hem ook niet meer aan als hij er nog in staat.

Heeft een dag toch meer dan één dienst in de Agenda (bijvoorbeeld de bar 's middags en 's avonds), dan vraagt Oma per dag wanneer je kunt. Daarbij staat alles eerst aan en vink je uit wat niet past. Dagen met één dienst krijgen die vraag niet.

## Het gesprek

1. **Hoi! Oma Coby hier, nou ja, mijn digitale versie. Weet je al wat je wilt doen, of wanneer je kunt?**
   - *Ik weet wat ik wil doen*: welke taak? Bij bezorgen volgt de rijbewijsvraag, dan vraag 3, daarna per taak de dagen. Tot slot nog een vraag naar krappe momenten (alleen als die er zijn).
   - *Ik weet wanneer ik kan*: welke dagen? Wanneer, alleen op dagen met meer diensten. Wat wil je op die dagen doen? Hier kan ook "maakt niet uit". Bij bezorgen volgt de rijbewijsvraag, dan vraag 3.
   - *Zet me maar in waar het nodig is*: welke dagen? Wanneer, alleen op dagen met meer diensten. Alle taken staan aan en je haalt weg wat niet past. Bij bezorgen volgt de rijbewijsvraag.
2. **Rijbewijs** (alleen bij bezorgen). Keuze uit *Rijbewijs én auto*, *Rijbewijs, geen auto* of *Geen rijbewijs*. Zonder rijbewijs valt bezorgen af. Was dat je enige taak, dan kies je opnieuw.
3. **Je hebt gekozen voor inpakken. Als het bij een andere taak drukker is, mag ik je daar dan ook neerzetten?** Direct na de taakkeuze, met de gekozen taak erin, zodat duidelijk is waar "ergens anders" tegenover staat. Na "zet me maar in" en als je al alle taken koos ("maakt niet uit") slaan we deze vraag over: dan geldt hij als ja.
4. **Je kunt op 3 dagen. Op hoeveel daarvan wil je helpen?** Oma telt voor je, dus je hoeft je dagen niet zelf na te tellen. Keuze uit 1, 2 of 3 dagen (en 5 bij meer dan 5 dagen), of *Alle 3*. Het zijn echte aantallen, zodat het rooster je nooit vaker inplant. Bij één dag vraagt Oma dit niet.
5. **Zal ik je de dag ervoor herinneren?** Via WhatsApp, via mail of het hoeft niet.
6. **Hoe heet je, en hoe kan ik je bereiken?** Voor- en achternaam, telefoon (verplicht bij WhatsApp) of mail (verplicht bij mail), woonplaats. Het adres vragen we alleen aan bezorgers.
7. **Klopt dit zo?** Een samenvatting, een opmerking, toestemming en dan versturen.

Een rode stip betekent "nog weinig mensen". Die stip staat alleen bij de uitzonderingen: als bijna alles krap is, zegt een stip overal niets.

## Wat er in de Sheet komt

Het tabblad blijft *Formulierreacties 1*. De bestaande kolommen worden gevuld zoals bij het Google Formulier, zodat de tellingen, de agenda en de bezetting blijven werken. Bij "dag" en "maakt niet uit" zijn dat alle momenten van de gekozen taken op de gekozen dagen en dagdelen.

Er komen vijf kolommen bij. Apps Script zet ze achteraan zodra ze voor het eerst een waarde krijgen:

| Kolom | Waarden |
| --- | --- |
| Hoe aangemeld | Taak in gedachten / Dag in gedachten / Maakt niet uit |
| Mag ingedeeld worden waar nodig | Ja / Nee |
| Maximaal aantal dagen | 1 dag, 2 dagen, … |
| Rijbewijs | Rijbewijs en auto / Rijbewijs, geen auto (alleen bezorgers) |
| Herinnering 24 uur van tevoren | WhatsApp / Mail / Nee |

In de demo-modus komt alles in de lokale demo-opslag terecht. Op *Vrijwilligers* zie je de antwoorden als labels per persoon.

## Getoetst aan planningstools

We hebben de flow naast gangbare rooster- en vrijwilligerstools gelegd (Shiftbase, Planday, en de best practices van vrijwilligersplanners zoals VolunteerMatrix):

- **Beschikbaarheid als vaste keuzes**, niet als vrije tekst. Dat doen we al: dagen en diensten zijn knoppen.
- **Voorkeur los van bevoegdheid.** Wat je wilt doen (taak) is iets anders dan wat je mag doen (rijbewijs). Daarom staat het rijbewijs als aparte vraag.
- **Een maximum per persoon**, zodat de planner niemand overvraagt. Dat is het aantal dagen.
- **Laat zien waar het krap is.** Tools tonen "nog 2 plekken". Wij tonen een stip, omdat de aantallen nu nog beschikbaarheid zijn en geen indeling. Met een rooster kan dit "nog 2 plekken" worden.
- **Herinneren en afmelden.** Planners raden een herinnering 2–3 dagen vooraf aan, plus een op de dag zelf, met een link om af te zeggen of te ruilen. Wij doen de dag ervoor. De afmeldlink staat hieronder.
- **Open diensten.** Shiftbase en Planday laten medewerkers lege diensten zelf oppakken en onderling ruilen. Dat is de volgende stap na het eerste rooster.

## Nog te bouwen voor een slim rooster

Deze onderdelen volgen de gewoonte van roosterplanners voor vrijwilligers: beschikbaarheid ophalen, slim indelen, bevestigen, herinneren en ruilen.

1. **Behoefte per moment uit de bestellingen.** Het aantal mensen per moment staat nu in de agenda (`nodig`). Dat kan worden afgeleid uit de bestellingen per leverdatum: zoveel oliebollen is zoveel inpakkers, zoveel routes is zoveel bezorgers. De cijfers van vorige jaren geven de verhouding.
2. **Indelen.** Een voorstel per moment: eerst wie alleen daar kan, dan wie "inzetbaar waar nodig" is, en nooit meer dan iemands maximum. Beheer zet het rooster daarna vast. Dit hoort op een tabblad *Rooster* (moment, taak, vrijwilliger, status).
3. **Bevestigen en herinneren.** Een bericht zodra het rooster vaststaat, en 24 uur van tevoren een herinnering via het gekozen kanaal. Dat kan via een tijdgestuurde trigger in Apps Script of via n8n (zie `N8N_SETUP.md`).
4. **Afmelden en ruilen.** Een persoonlijke link om af te zeggen. Het vrijgekomen moment gaat dan als vraag naar wie "inzetbaar waar nodig" is en die dag kan.
5. **Bezetting live.** De krappe momenten tellen nu op basis van beschikbaarheid. Zodra er een rooster is, moeten ze tellen op basis van ingedeelde mensen.
