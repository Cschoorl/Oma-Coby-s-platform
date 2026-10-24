# Vrijwilligersaanmelding als gesprek

De aanmelding (`#/aanmelden`, `src/features/volunteers/SignupPage.tsx`) is een gesprek met Oma Coby. Ze stelt zich voor, vraagt één ding tegelijk en reageert kort op elk antwoord. Eerdere antwoorden blijven als chat erboven staan, elk met *Wijzig*. De logica staat los in `signupFlow.ts`.

## Persona: Oma Coby

- **Toon.** Warm, een beetje ondeugend, korte zinnen, je/jij. Ze spreekt je aan met je voornaam: "Leuk je te ontmoeten, Sanne!".
- **Ritme.** Ze reageert kort op elk antwoord ("Genoteerd.", "Jij bent een kanjer.") en stelt dan de volgende vraag. Ze "typt" even met drie puntjes, net lang genoeg voor een gesprek maar nooit wachten. Bij "minder beweging" en na *Wijzig* staat alles meteen in beeld.
- **Rustige start.** Eerst stelt ze zich voor en vraagt ze alleen je voornaam. Pas daarna komt de eerste keuze, als drie korte antwoordknoppen.
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

1. **Hoi, ik ben Oma Coby. Hoe mag ik je noemen?** Je vult alleen je voornaam in.
2. **Heb je al een idee wat je wilt doen, of wanneer je kunt?**
   - *Ik weet wat ik wil doen*: welke taak? Daarna per taak de dagen. Tot slot nog een vraag naar krappe momenten (alleen als die er zijn).
   - *Ik weet wanneer ik kan*: welke dagen? Wanneer, alleen op dagen met meer diensten. En wat wil je die dag doen? Hier kan ook "maakt niet uit".
   - *Zet me maar in waar het nodig is*: welke dagen? Wanneer, alleen op dagen met meer diensten. Alle taken staan aan en je haalt weg wat niet past.
3. **Mag ik je ook ergens anders neerzetten als het daar drukker is?** Na "zet me maar in" slaan we deze vraag over.
4. **Je kunt op 4 dagen. Hoe vaak wil je maximaal helpen?** Keuze uit 1, 2 of 3 keer (en 5 keer bij meer dan 5 dagen), of *Alle 4 dagen*. Het zijn echte aantallen, zodat het rooster iemand nooit vaker inplant, en nooit meer dan de dagen die je koos. Bij één dag vraagt Oma dit niet.
5. **Zal ik je de dag ervoor herinneren?** Via WhatsApp, via mail of het hoeft niet.
6. **Hoe kan ik je bereiken?** Achternaam, telefoon (verplicht bij WhatsApp) of mail (verplicht bij mail), woonplaats. Het adres vragen we alleen aan bezorgers.
7. **Klopt dit zo?** Een samenvatting, een opmerking, toestemming en dan versturen.

Een rode stip betekent "nog weinig mensen". Die stip staat alleen bij de uitzonderingen: als bijna alles krap is, zegt een stip overal niets.

## Wat er in de Sheet komt

Het tabblad blijft *Formulierreacties 1*. De bestaande kolommen worden gevuld zoals bij het Google Formulier, zodat de tellingen, de agenda en de bezetting blijven werken. Bij "dag" en "maakt niet uit" zijn dat alle momenten van de gekozen taken op de gekozen dagen en dagdelen.

Er komen vier kolommen bij. Apps Script zet ze achteraan zodra ze voor het eerst een waarde krijgen:

| Kolom | Waarden |
| --- | --- |
| Hoe aangemeld | Taak in gedachten / Dag in gedachten / Maakt niet uit |
| Mag ingedeeld worden waar nodig | Ja / Nee |
| Hoe vaak maximaal | 1 keer, 2 keer, … (een aantal) |
| Herinnering 24 uur van tevoren | WhatsApp / Mail / Nee |

In de demo-modus komt alles in de lokale demo-opslag terecht. Op *Vrijwilligers* zie je de antwoorden als labels per persoon.

## Nog te bouwen voor een slim rooster

Deze onderdelen volgen de gewoonte van roosterplanners voor vrijwilligers: beschikbaarheid ophalen, slim indelen, bevestigen, herinneren en ruilen.

1. **Behoefte per moment uit de bestellingen.** Het aantal mensen per moment staat nu in de agenda (`nodig`). Dat kan worden afgeleid uit de bestellingen per leverdatum: zoveel oliebollen is zoveel inpakkers, zoveel routes is zoveel bezorgers. De cijfers van vorige jaren geven de verhouding.
2. **Indelen.** Een voorstel per moment: eerst wie alleen daar kan, dan wie "inzetbaar waar nodig" is, en nooit meer dan iemands maximum. Beheer zet het rooster daarna vast. Dit hoort op een tabblad *Rooster* (moment, taak, vrijwilliger, status).
3. **Bevestigen en herinneren.** Een bericht zodra het rooster vaststaat, en 24 uur van tevoren een herinnering via het gekozen kanaal. Dat kan via een tijdgestuurde trigger in Apps Script of via n8n (zie `N8N_SETUP.md`).
4. **Afmelden en ruilen.** Een persoonlijke link om af te zeggen. Het vrijgekomen moment gaat dan als vraag naar wie "inzetbaar waar nodig" is en die dag kan.
5. **Bezetting live.** De krappe momenten tellen nu op basis van beschikbaarheid. Zodra er een rooster is, moeten ze tellen op basis van ingedeelde mensen.
