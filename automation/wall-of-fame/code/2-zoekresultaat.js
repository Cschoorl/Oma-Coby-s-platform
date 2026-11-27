// Code-node "Zoekresultaat": Brandfetch Search gaf merken bij de naam. Hou er drie over; Claude kiest straks.
const req = $('Domeinen').first().json;
const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(b\.?\s?v\.?|n\.?\s?v\.?|holding)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
const want = norm(req.company);
const hits = $input
  .all()
  .map((i) => i.json)
  .filter((r) => r && typeof r.domain === "string" && r.domain);
// Zelfde naam eerst, dan merken die hun gegevens bij Brandfetch zelf beheren, dan een .nl-domein.
const score = (r) => (norm(r.name) === want ? 4 : norm(r.name).includes(want) || want.includes(norm(r.name)) ? 2 : 0) + (r.claimed ? 1 : 0) + (r.domain.endsWith(".nl") ? 1 : 0);
hits.sort((a, b) => score(b) - score(a));
return [{ json: { ...req, domains: [...new Set(hits.map((h) => h.domain))].slice(0, 3) } }];
