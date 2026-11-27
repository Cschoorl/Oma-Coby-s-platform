# Wall of fame

Uittreksel uit het **Bouwplan website, versie 4** (2 november 2026, `oma-cobys-bouwplan-woensdag.pdf`) en hoe het
platform het uitwerkt. Markering zoals in het bouwplan: **FEIT** staat in het plan of in Mark's feedback,
**HYPOTHESE** is een keuze van ons, **TE CHECKEN** moet Mark bevestigen.

## Wat het bouwplan vraagt

| # | Eis | Bron in het bouwplan | Soort |
|---|---|---|---|
| 1 | De wall of fame is sociale bewijskracht: "Zij lieten ouderen dansen". Bovenregel *Wall of fame*. | 02 item 8, bijlage A sectie 8 | FEIT |
| 2 | Wat je erop krijgt groeit met het pakket, nooit met korting: **Brons** (Danspartner, 50+) je naam, **Zilver** (Podiumpartner, 150+) ook je logo, **Goud** (Hoofdact, 500+) een podiumplek. | 00 principe 1, bijlage A sectie 3 | FEIT |
| 3 | Per bedrijf de naam en **het aantal ouderen**. **Nooit bedragen.** | bijlage B, veld "Wall of fame" | FEIT |
| 4 | Alleen met **toestemming**: een vinkje in het formulier (standaard uit, AVG) of een akkoord per mail. Tekst bij het vinkje: "Zet ons op de wall of fame: naam (vanaf Podiumpartner ook logo) en het aantal ouderen. Nooit bedragen." | bijlage B, bijlage A sectie 8 | FEIT |
| 5 | Zonder toestemmingen: **zes lege tegels** met "logo na toestemming", de laatste "+ jullie?". Kop "Zij lieten vorig jaar ouderen dansen", sub "Vorig jaar lieten ruim honderd bedrijven ouderen dansen. Dit jaar erbij? Dan staat jullie naam hier." | bijlage A sectie 8, bijlage C item 20 | FEIT |
| 6 | **Vroegboekers bovenaan**: "Bestel vóór 1 december en jullie staan bovenaan de wall of fame, met eerste keus van bezorgdag." Kolom *vroegboeker* in de sheet. | 07 idee 6 | HYPOTHESE |
| 7 | Na het seizoen: de wall of fame **dynamisch met logo's** en een **cumulatief impactregister**. | 08 | HYPOTHESE |
| 8 | Bedrijfsnaam (2 tot 80 tekens) is nodig voor factuur, certificaat én wall of fame. | bijlage B | FEIT |
| 9 | Geen video per bedrijf op de site; alleen Hoofdact krijgt foto of filmpje van "hun" middag, en dat staat niet op de muur. | bijlage A sectie 3 | FEIT |

## Hoe we het bouwen

De pakketten heten sinds november Schuifelpartner (Brons, 50+), Danspartner (Zilver, 150+) en Polonaisepartner (Goud,
500+). De medaille bepaalt de plek op de muur; een Feestpartner hangt als Goud. Hieronder staan de medailles.

**Bron is de echte bestelling in de Sheet.** Wie in `#/bestellen` het vinkje zet, geeft toestemming. Zodra beheer de
aanvraag **bevestigt**, zet het Apps Script het bedrijf in het tabblad **Wall of fame** (één rij per bedrijf per
seizoen, meerdere afleveradressen tellen samen). Een akkoord per mail voeg je toe op de beheerpagina *Wall of fame*
(`#/muur`). De openbare muur leest alleen dat tabblad; de verzonnen bedrijven zie je alleen in demo-modus.

Wat er **nooit** op komt:

- een aanvraag die niet bevestigd is (nieuw, teruggezet of afgewezen). Wordt een bevestigde aanvraag later
  teruggezet of afgewezen, dan verdwijnt het bedrijf weer van de muur;
- een aanvraag zonder vinkje. Bestelt een bedrijf twee keer en staat het vinkje maar één keer aan, dan telt alleen
  die ene bestelling mee;
- een testbestelling: een bedrijfsnaam die met "test" begint of op "test", "testbestelling" of "proefbestelling"
  eindigt ("Test BV", "Max test"). Een testbestelling met een gewone naam houd je tegen door hem niet te
  bevestigen, of haal je weg met *Haal van de muur*;
- een bedrag, een aantal oliebollen, een contactpersoon of een adres. De openbare API stuurt alleen naam, pakket,
  aantal ouderen, vroegboeker en het goedgekeurde logo.

| Keuze | Waarom | Soort |
|---|---|---|
| Pakket op de muur = pakket van alle bestellingen samen (`tierFor`), ouderen = oliebollen ÷ 10 naar beneden. | Zelfde rekenregel als overal (`oudjesLine`). | FEIT |
| Volgorde: Goud, Zilver, Brons; daarbinnen vroegboekers eerst, dan wie eerst bestelde. Niet op aantal. | Geen ranglijst op geld of grootte binnen een pakket. | HYPOTHESE |
| Vroegboeker = eerste bestelling vóór 1 december van het seizoen. | Idee 6. | HYPOTHESE |
| Logo's worden **gezocht door de logozoeker** (de dagelijkse taak, of n8n) maar pas getoond als beheer ze heeft **goedgekeurd**. Tot dan hangt het **naambordje**: de naam uitgeschreven op een krent bordje in de lijst. | Een verkeerd logo op de muur is erger dan geen logo, en een lege lijst is erger dan een naam. | FEIT (meeting 23 november) |
| **Geen logo van een naamgenoot of concurrent.** Het logo hoort van het domein van het e-mailadres van de besteller te komen. Komt het ergens anders vandaan (op naam gezocht, of besteld met een privé-mailadres), dan staat er bij beheer een waarschuwing en heet de knop "Logo klopt, dit is hetzelfde bedrijf". | Twee bedrijven met bijna dezelfde naam zijn vaak concurrenten. | FEIT (meeting 23 november) |
| **Geen leeg vlak.** Laadt een logo niet (kapotte link, na 5 seconden nog niets), is het een plaatje van een paar pixels, of blijft er als inkt niets of één dicht blok van over, dan hangt vanzelf het naambordje. De dagelijkse taak loopt de hangende logo's na en zet een kapot logo terug op "nakijken". Tussen de bedrijven hangt geen spiegel of lege lijst. | Een lege lijst leest als een fout. | FEIT (meeting 23 november) |
| Logo's staan in de huisstijl: als **krent-inkt** op gebroken wit (SVG-filter), in een bruine houten lijst, met de naam op een messing plaatje eronder. Kleur blijft alleen als het logo zonder kleur niet herkenbaar is (Claude kiest, beheer kan het omzetten). | Honderd logo's in honderd kleuren vloeken; in één inkt hangen ze als prenten aan de muur van een bruin café. | HYPOTHESE |
| Naar de logozoeker gaan alleen bedrijfsnaam, het domein van het e-mailadres (geen gratis mailadressen) en de plaats. Geen namen, e-mailadressen, telefoonnummers of bedragen. | Dataminimalisatie (AVG). | FEIT |
| Bedrag en oliebollen staan nergens op de openbare muur; de openbare API stuurt ze niet mee. | Eis 3. | FEIT |

**De muur** (`#/wall-of-fame`, met `?embed=1` zonder kop voor een iframe op de Shopify-pagina) is een foto van
Oma's café, geen scherm: een okergele gepleisterde muur vol bruine lijsten, zoals in een oud bruin café.

- **Bovenin** met de hand op de muur geschilderd: *Wall of fame*, het seizoen en "Zij lieten dit jaar ouderen dansen".
  Zolang het kan een briefje met plakband: "Bestel vóór 1 december: dan hangen jullie bovenaan…".
- **Goud** hangt het grootst, midden in de bovenste rij, in een walnoten lijst met een gouden biesje en een
  koperen schilderijlampje erboven.
- **Zilver**: kleinere lijsten in verschillend hout (walnoot, eiken, donker, ebben), elk net niet recht.
- Onder elke lijst een **messing plaatje** met de naam en "Zilver · 18 ouderen". Nooit bedragen.
- Zonder goedgekeurd logo hangt in de lijst het **naambordje**: de naam uitgeschreven in crème op krent, met een
  gouwe bies. Op het plaatje eronder staat dan alleen het pakket en het aantal ouderen.
- Tussen de bedrijven hangt wat in elk café hangt: Oma's portret, een affiche "Oliebollen", een affiche
  "Dansmiddag", een prent van de oliebol (zonder onderschrift) en een foto van de oudjes. Alleen sfeer: voor
  schermlezers verborgen, en op een telefoon blijven alleen Oma en de affiche over.
- **Brons** staat met krijt op het **krijtbord**, met bovenaan het totaal: "Samen 391 ouderen aan de dans".
- Vroegboekers krijgen een rozet op de hoek van de lijst (Brons een ★ op het bord). De laatste lijst is altijd
  "+ jullie?" (naar `#/bestellen`).
- Onderaan de lambrisering, een terrazzovloer, twee thonetkrukken met rood leer en een marmeren tafeltje met een
  bord oliebollen en een biertje. Voorin een gietijzeren zuil en een stenen pilaar, iets onscherp.
- Daglicht valt van links door een raam buiten beeld; de lijsten werpen hun schaduw naar rechtsonder.
- Zonder vermeldingen: zes lege lijsten ("logo na toestemming", de laatste "+ jullie?") en de tekst uit eis 5 op het bord.

Alles is CSS en SVG (houtnerf, pleister en krijt met `feTurbulence`), zonder foto's van buiten. Alleen Oma's
portret is een echte foto. De maten schalen met de breedte van de muur (container queries), dus ook in een smal
iframe. **Afwijking van de huisstijl:** de huisstijl kent alleen een licht thema met de huisstijlkleuren. Deze ene
pagina is bewust een foto, met eigen tinten hout, pleister, messing en marmer naast krent, feest, kerst en gouwe.

## Gegevens

Tabblad **Wall of fame** (zie `TABS.wallOfFame` in `apps-script/Code.gs`, type `WallEntry` in `src/types/wallOfFame.ts`):

| Kolom | Inhoud |
|---|---|
| `sleutel` | `2026:studio-noorderlicht` (seizoen + bedrijfsnaam zonder B.V. e.d.) |
| `seizoen`, `naam_op_muur`, `onderneming`, `ordernummers` | `naam_op_muur` is aan te passen door beheer |
| `pakket`, `oliebollen`, `ouderen`, `eerste_bestelling`, `vroegboeker` | uit de bevestigde bestellingen |
| `toestemming` | `formulier` of `mail` |
| `zichtbaar` | `Ja`/`Nee`; beheer kan iemand van de muur halen |
| `domein` | het domein van het e-mailadres van de besteller (leeg bij gratis mail) |
| `logo_url`, `logo_status`, `inkt`, `logo_bron`, `logo_toelichting`, `logo_zekerheid` | het logo; `logo_status` is `zoeken`, `nakijken`, `goedgekeurd` of `geen` (= het naambordje) |
| `bijgewerkt_door`, `bijgewerkt_op` | |
| `logo_domein` | het domein waar het logo vandaan komt; hoort gelijk te zijn aan `domein` |

Het tabblad maakt het script zelf aan zodra het voor het eerst nodig is. De toestemming staat in **Zakelijke
aanvragen** in de kolom `wall_of_fame` (Ja/Nee); die is er al. Een rij die op nul ouderen staat (de aanvraag is
niet meer bevestigd) blijft in het tabblad staan maar hangt niet.

Bijwerken gebeurt bij elke bevestiging of afwijzing, met de knop *Werk bij uit de bestellingen* op `#/muur` (ook de
eerste keer, voor wat al bevestigd was) en bij elke ronde van de logozoeker.

## De logozoeker

```
Formulier ─▶ Zakelijke aanvragen ─(beheer bevestigt)─▶ Wall of fame (Zilver en Goud: logo_status = zoeken)
                                                         │  het naambordje hangt meteen
                                                         ▼
                 logozoeker: actie wallTodo ▶ logo zoeken en controleren ▶ actie wallOfFameLogo
                                                         ▼
                         Wall of fame (logo_status = nakijken) ─(beheer keurt goed)─▶ het logo hangt
```

Het Apps Script heeft twee acties voor de logozoeker. Beide vragen het geheim `WALL_CALLBACK_SECRET` (een
script-eigenschap) in plaats van een toegangscode:

| Actie | Wat |
|---|---|
| `wallTodo` | Werkt de muur bij uit de bevestigde aanvragen en geeft terug: `added` (bedrijven die erbij kwamen), `search` (plekken die een logo zoeken: sleutel, bedrijfsnaam, plaats, domeinen), `check` (logo's die hangen, om na te lopen) en `review` (namen die op beheer wachten). |
| `wallOfFameLogo` | Meldt een gevonden logo (`found`, `logoUrl`, `logoDomain`, `ink`, `source`, `confidence`, `note`): de plek gaat naar "nakijken", of naar "geen" als er niets is. Alleen voor een plek die op "zoeken" staat, dus een goedgekeurd logo wordt nooit overschreven. Met `broken: true` en de `logoUrl` die nu hangt: het logo laadt niet meer of is leeg, terug naar "nakijken". |

Niemand keurt hier zelf goed: het logo hangt pas na "Logo klopt" van beheer.

Er zijn twee manieren om te zoeken:

1. **Een dagelijkse taak in Claude** (voorstel van 27 november, nog niet aangemaakt): roept elke ochtend `wallTodo`
   aan, zoekt per bedrijf het logo op de eigen website, controleert het en meldt het terug. Geen extra diensten of
   sleutels nodig.
2. **n8n** ([`automation/wall-of-fame/`](../automation/wall-of-fame/README.md)): zoekt meteen na het bevestigen, via
   Brandfetch en de Claude API. De workflow is uitgeschreven en importeerbaar, maar draait nergens: er is geen
   n8n-omgeving, Brandfetch-account of API-sleutel voor. Zet je `WALL_N8N_WEBHOOK`, dan gebruikt het script hem.

### Hoe een logo gecontroleerd wordt

| Controle | Waar |
|---|---|
| Het logo komt van het domein van het e-mailadres van de besteller. Zo niet: waarschuwing bij beheer. | logozoeker (`logoDomain`), beheer |
| Het is echt een logo van dit bedrijf: de naam staat erin of het staat als logo op hun eigen site. Geen foto, standaardicoontje of logo van een naamgenoot of concurrent. Bij twijfel: geen logo. | logozoeker (Claude bekijkt het plaatje) |
| Het blijft herkenbaar als inkt (`donker`, `licht`) of moet zijn kleur houden (`kleur`). | logozoeker, beheer ziet "Zo hangt het" |
| Het laadt, is groot genoeg en geeft geen leeg of dicht vlak. | de pagina zelf bij elk bezoek, de logozoeker elke dag |
| Een mens heeft het gezien. | beheer: "Logo klopt" |

## Acceptatie

1. Zonder vinkje of akkoord staat een bedrijf nergens op de muur, ook niet na bevestigen.
2. Brons toont alleen de naam; Zilver en Goud een logo pas na "Logo klopt", daarvoor het naambordje.
3. Nergens op de muur of in de openbare API een bedrag of aantal oliebollen; wel ouderen.
4. Zonder vermeldingen: zes tegels "logo na toestemming", de laatste "+ jullie?".
5. Een vroegboeker staat binnen zijn pakket vóór de rest en heeft de rozet.
6. Twee bestellingen van hetzelfde bedrijf (twee adressen) geven één plek met de ouderen samen.
7. Werkt op telefoon (twee lijsten naast elkaar) en in een iframe (`?embed=1`), zonder zijwaarts scrollen.
8. Een testbestelling ("Test BV") en een aanvraag die niet (meer) bevestigd is, staan nergens op de muur.
9. Geen lege lijst: een logo dat niet laadt of niets laat zien, wordt het naambordje.
10. Het label "fig. 1 · de oliebol" staat nergens meer.
