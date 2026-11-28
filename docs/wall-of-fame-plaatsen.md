# Wall of fame: het Apps Script plaatsen

Voor wie het script van de Google Sheet beheert. De wall of fame werkt pas met echte bestellingen als het
nieuwe script in de Sheet staat. Dit overzicht zegt welk bestand, waar het hoort en in welke volgorde.

## Kort

| Wat | Waar |
|---|---|
| Het script | [`apps-script/Code.gs`](../apps-script/Code.gs) (één bestand, de hele inhoud) |
| Waar het moet staan | Google Sheet **"oma coby's database"** → **Extensies → Apps Script** → bestand `Code.gs` |
| Wie kan het doen | iemand met bewerkrechten op die Sheet |
| Tijd | ongeveer 10 minuten |

Tot de pull request gemerged is, staat het bestand op de branch `claude/charming-khorana-643e62`
([Code.gs op GitHub](https://github.com/Cschoorl/Oma-Coby-s-platform/blob/claude/charming-khorana-643e62/apps-script/Code.gs)).
Daarna staat hetzelfde bestand op `main`.

## Volgorde

Plaats eerst het script, merge daarna de pull request.

- **Script eerst:** er verandert niets aan wat bezoekers zien. De muurpagina's bestaan dan nog niet op de site.
- **Site eerst:** de openbare muur is leeg en de knoppen op `#/muur` geven een foutmelding, tot het script erbij staat.

## Stappen

1. **Bewaar wat er nu staat.** Open de Sheet → **Extensies → Apps Script**. Kopieer de hele inhoud van `Code.gs`
   naar een tekstbestand, zodat je terug kunt.
2. **Vervang de inhoud** van `Code.gs` door het nieuwe bestand.
3. **Controleer `CONFIG` bovenin.** Staat daar in het oude script iets anders dan in het nieuwe (naam van het
   tabblad met bestellingen, het startadres, het seizoensjaar), neem dan de oude waarden over.
4. **Sla op.** Let op: de koppelingen met de Sheet (nieuwe formulierinzending, wijziging in een tabblad) draaien
   vanaf nu al op de nieuwe code. De website gebruikt de oude versie tot stap 5.
5. **Zet de nieuwe versie aan**, op een van deze twee manieren:
   - **Eerst testen, de site blijft op de oude versie:** **Implementeren → Nieuwe implementatie → Web-app**,
     *Uitvoeren als: Ik*, *Wie heeft toegang: Iedereen*. Je krijgt een tweede URL die op `/exec` eindigt. Zet die
     lokaal in `.env` als `VITE_APPS_SCRIPT_URL` en start `npm run dev`. Dit werkt op de echte Sheet: wat je daar
     bevestigt of wijzigt, is echt.
   - **Direct live:** **Implementeren → Implementaties beheren → bewerken (potlood) → Versie: Nieuwe versie →
     Implementeren**. De URL blijft dezelfde, de site gebruikt meteen het nieuwe script.
6. **Vul de muur.** Log in als beheer, ga naar `#/muur` en klik op **Werk bij uit de bestellingen**. Het tabblad
   **Wall of fame** maakt het script zelf aan.
7. **Loop de lijst na** op testbestellingen met een gewone naam. Zet die op "Haal van de muur".

## Wat er op de muur komt

- Alleen aanvragen in **Zakelijke aanvragen** met status **bevestigd** en **wall_of_fame = Ja**. Een aanvraag die
  nog op "nieuw" staat, komt er niet op. Bevestigen doe je op de pagina Zakelijk.
- Meerdere bevestigde bestellingen van hetzelfde bedrijf tellen samen.
- Een bedrijfsnaam die met "test" begint of eindigt, slaat het script over.
- De openbare muur toont naam of logo, pakket en aantal ouderen. Nooit bedragen, aantallen oliebollen of
  contactgegevens.
- Zonder goedgekeurd logo hangt er een naambordje. Een logo zet je op `#/muur` met **Ander logo (link)** en keur
  je goed met **Logo klopt**.

## Wat er in de Sheet verandert

Eén nieuw tabblad, **Wall of fame**, met een rij per bedrijf per seizoen:

`sleutel`, `seizoen`, `naam_op_muur`, `onderneming`, `ordernummers`, `pakket`, `oliebollen`, `ouderen`,
`eerste_bestelling`, `vroegboeker`, `toestemming`, `zichtbaar`, `domein`, `logo_url`, `logo_status`, `inkt`,
`logo_bron`, `logo_toelichting`, `logo_zekerheid`, `bijgewerkt_door`, `bijgewerkt_op`, `logo_domein`

Pas de kolomnamen in rij 1 niet aan. Aan de andere tabbladen verandert niets.

## Script-eigenschappen

Voor de muur zelf is geen nieuwe eigenschap nodig. Alleen voor de logozoeker, later:

| Eigenschap | Waarde |
|---|---|
| `WALL_CALLBACK_SECRET` | een lang willekeurig geheim. Daarmee haalt de logozoeker de zoeklijst op en meldt hij een logo terug. Leeg = geen logozoeker; beheer zet logo's dan zelf. |
| `WALL_N8N_WEBHOOK` | leeg laten |

Je vindt ze onder **Projectinstellingen (tandwiel) → Script-eigenschappen**.

## Terugdraaien

**Implementeren → Implementaties beheren → bewerken** en kies de vorige versie. Zet daarna de bewaarde inhoud
van stap 1 terug in `Code.gs`. Het tabblad Wall of fame mag blijven staan; het oude script kijkt er niet naar.

## Nog niet gedaan

- Het nieuwe script is getest met een nagebootste Sheet, niet met de echte.
- De logozoeker (dagelijks logo's zoeken met het Claude-account van Mark) is nog niet ingericht. Tot die tijd
  hangen nieuwe bedrijven met een naambordje.

Meer achtergrond: [`docs/wall-of-fame.md`](wall-of-fame.md) en [`apps-script/README.md`](../apps-script/README.md).
