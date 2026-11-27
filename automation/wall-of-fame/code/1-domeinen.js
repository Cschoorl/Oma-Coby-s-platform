// Code-node "Domeinen": wat het Apps Script meestuurde. Zonder domein zoeken we eerst op de bedrijfsnaam.
const body = $('Logo gevraagd').first().json.body ?? {};
if (!/^\d{4}:[a-z0-9-]+$/.test(String(body.key ?? ""))) throw new Error("Geen geldige sleutel ontvangen.");
const domains = (Array.isArray(body.domains) ? body.domains : [])
  .map((d) => String(d).trim().toLowerCase())
  .filter((d) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d))
  .slice(0, 3);
return [
  {
    json: {
      key: String(body.key),
      company: String(body.company ?? ""),
      name: String(body.name ?? body.company ?? ""),
      city: String(body.city ?? ""),
      tier: String(body.tier ?? ""),
      domains,
      needSearch: domains.length === 0
    }
  }
];
