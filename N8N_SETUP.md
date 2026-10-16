# n8n + Google Sheet koppeling

## 1) Env variabele zetten

Kopieer `.env.example` naar `.env` en vul jouw webhook URL in:

`VITE_N8N_WEBHOOK_URL=https://jouw-n8n-domein/webhook/oliebollen-orders`

Als de URL leeg is, gebruikt de app automatisch placeholder data.

## 2) Verwachte payload vanuit n8n

De webhook mag 1 van deze vormen teruggeven:

- direct een array met rows
- `{ "rows": [...] }`
- `{ "orders": [...] }`
- `{ "data": [...] }`

Elke row verwacht deze velden:

- `order_id`
- `leverdatum` (YYYY-MM-DD)
- `leverancier_naam`
- `locatie_naam`
- `contactpersoon`
- `telefoon`
- `adres`
- `postcode`
- `plaats`
- `geplande_tijd` (bijv. `10:30`)
- `status` (`open`, `onderweg`, `bezorgd`)
- `oliebollen_met_krenten`
- `oliebollen_zonder_krenten`
- `extra_notities` (optioneel)

Getallen als tekst (`"25"`), lege cellen, datums als `30-12-2026` en tijden als `9:30`
worden automatisch omgezet. Een array met n8n-items (`[{ "json": {...} }]`) mag ook.

De webhook moet CORS toestaan voor `https://cschoorl.github.io` (in n8n: *Respond to
Webhook* → header `Access-Control-Allow-Origin`).

## 3) Live data op GitHub Pages

1. GitHub → **Settings → Secrets and variables → Actions → New repository secret**
   - Naam: `VITE_N8N_WEBHOOK_URL`
   - Waarde: jouw webhook URL
2. GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   Staat dit op "Deploy from a branch", dan publiceert GitHub óók de ruwe broncode
   en krijg je soms een witte pagina.
3. Push naar `main` (of start de workflow handmatig) om opnieuw te deployen.

Zonder werkende webhook toont de app voorbeelddata, met een melding onderaan de pagina.
