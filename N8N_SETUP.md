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
