# Vrijwilligersaanmelding als gesprek

De aanmelding (`#/aanmelden`, `src/features/volunteers/SignupPage.tsx`) stelt één vraag tegelijk. Oma vraagt, je antwoordt met knoppen, en eerdere antwoorden blijven als chat erboven staan met *Wijzig*. De logica staat los in `signupFlow.ts`.

## Waarom geen chatbot

We hebben gekozen voor een begeleid gesprek met knoppen in plaats van een chatbot met vrije tekst:

- **Geen misverstanden.** Vrije tekst ("na de kerst kan ik wel") moet een taalmodel omzetten naar momenten in de agenda, en dat gaat soms mis. Bij knoppen weet je zeker wat er in de Sheet komt.
- **Geen API-sleutel, kosten of persoonsgegevens naar een extern model** op een openbare pagina.
- **Toegankelijk en snel op de telefoon.** Knoppen werken met toetsenbord en schermlezer, en zijn sneller dan typen.
- **Toch het gevoel van een gesprek.** Oma stelt de vragen, en het pad past zich aan je antwoorden aan.

Een chatbot kan later alsnog als extra ingang, bijvoorbeeld via WhatsApp voor vragen. Hij zou dezelfde antwoorden invullen (`Answers` in `signupFlow.ts`).

## Het gesprek

1. **Heb je al iets in gedachten?**
   - *Taak*: wat wil je doen? Daarna per taak een rooster: een rij per dag en een kolom per dagdeel. Tot slot nog een vraag naar krappe momenten (alleen als die er zijn).
   - *Dag*: welke dagen? Hoe laat? Dit wordt alleen gevraagd als er iets te kiezen valt. Daarna: wat wil je die dag doen? Hier kan ook "maakt niet uit".
   - *Maakt niet uit*: welke dagen ben je beschikbaar? Hoe laat? Alle taken staan aan; je vinkt uit wat niet past, bijvoorbeeld autokoerier zonder auto.
2. **Mogen we je ook ergens anders indelen als het daar drukker is?** Bij "maakt niet uit" slaan we deze vraag over.
3. **Hoe vaak wil je maximaal helpen?** Keuze uit 1 keer, 2 à 3 keer of zo vaak als nodig.
4. **Een herinnering 24 uur van tevoren?** Via WhatsApp, via mail of niet.
5. **Contactgegevens.** Telefoon is verplicht bij WhatsApp, mail bij mail. Het adres vragen we alleen aan bezorgers.
6. **Klopt dit zo?** Een samenvatting, een opmerking, toestemming en dan versturen. Bij "maakt niet uit" zie je hier ook waar we je het hardst nodig hebben.

Het gesprek is 5 tot 10 vragen lang. Een rode stip betekent "nog weinig mensen". Die stip staat alleen bij de uitzonderingen: als bijna alles krap is, zegt een stip overal niets.

## Wat er in de Sheet komt

Het tabblad blijft *Formulierreacties 1*. De bestaande kolommen worden gevuld zoals bij het Google Formulier, zodat de tellingen, de agenda en de bezetting blijven werken. Bij "dag" en "maakt niet uit" zijn dat alle momenten van de gekozen taken op de gekozen dagen en dagdelen.

Er komen vier kolommen bij. Apps Script zet ze achteraan zodra ze voor het eerst een waarde krijgen:

| Kolom | Waarden |
| --- | --- |
| Hoe aangemeld | Taak in gedachten / Dag in gedachten / Maakt niet uit |
| Mag ingedeeld worden waar nodig | Ja / Nee |
| Hoe vaak maximaal | 1 keer / 2 à 3 keer / Zo vaak als nodig |
| Herinnering 24 uur van tevoren | WhatsApp / Mail / Nee |

In de demo-modus komt alles in de lokale demo-opslag terecht. Op *Vrijwilligers* zie je de antwoorden als labels per persoon.

## Nog te bouwen voor een slim rooster

Deze onderdelen volgen de gewoonte van roosterplanners voor vrijwilligers: beschikbaarheid ophalen, slim indelen, bevestigen, herinneren en ruilen.

1. **Behoefte per moment uit de bestellingen.** Het aantal mensen per moment staat nu in de agenda (`nodig`). Dat kan worden afgeleid uit de bestellingen per leverdatum: zoveel oliebollen is zoveel inpakkers, zoveel routes is zoveel bezorgers. De cijfers van vorige jaren geven de verhouding.
2. **Indelen.** Een voorstel per moment: eerst wie alleen daar kan, dan wie "inzetbaar waar nodig" is, en nooit meer dan iemands maximum. Beheer zet het rooster daarna vast. Dit hoort op een tabblad *Rooster* (moment, taak, vrijwilliger, status).
3. **Bevestigen en herinneren.** Een bericht zodra het rooster vaststaat, en 24 uur van tevoren een herinnering via het gekozen kanaal. Dat kan via een tijdgestuurde trigger in Apps Script of via n8n (zie `N8N_SETUP.md`).
4. **Afmelden en ruilen.** Een persoonlijke link om af te zeggen. Het vrijgekomen moment gaat dan als vraag naar wie "inzetbaar waar nodig" is en die dag kan.
5. **Bezetting live.** De krappe momenten tellen nu op basis van beschikbaarheid. Zodra er een rooster is, moeten ze tellen op basis van ingedeelde mensen.
