// Code-node "Kandidaten": de logo's van Brandfetch (of Logo.dev als terugval) en de vraag aan Claude.
const cfg = $('Instellingen').first().json;
const asked = $('Per domein').all().map((i) => i.json);
const req = asked[0];
const RANK = { logo: 0, symbol: 1, icon: 2 };
// Claude kan geen SVG zien; die gaat wel naar de muur (scherp op elke maat).
const VIEWABLE = ["png", "jpeg", "webp"];

const candidates = [];
$input.all().forEach((item, i) => {
  const brand = item.json ?? {};
  const domain = brand.domain ?? asked[i]?.domain ?? "";
  for (const logo of brand.logos ?? []) {
    const formats = logo.formats ?? [];
    const view = formats.find((f) => VIEWABLE.includes(f.format) && /^https:\/\//.test(f.src ?? ""));
    if (!view) continue;
    const svg = formats.find((f) => f.format === "svg" && /^https:\/\//.test(f.src ?? ""));
    candidates.push({ source: "brandfetch", domain, brand: brand.name ?? "", type: logo.type ?? "logo", theme: logo.theme ?? "", viewUrl: view.src, wallUrl: (svg ?? view).src });
  }
});
candidates.sort((a, b) => (RANK[a.type] ?? 3) - (RANK[b.type] ?? 3));

if (!candidates.length && cfg.logoDevToken) {
  for (const { domain } of asked.filter((a) => a.domain)) {
    const url = `https://img.logo.dev/${domain}?token=${cfg.logoDevToken}&size=300&format=png&retina=true`;
    candidates.push({ source: "logo.dev", domain, brand: "", type: "icon", theme: "", viewUrl: url, wallUrl: url });
  }
}

const shown = candidates.slice(0, 4);
const intro = [
  "Je helpt Oma Coby's Oliebollen met de wall of fame: een muur vol lijsten met de logo's van bedrijven die oliebollen bestelden voor dansmiddagen voor ouderen.",
  `Bedrijf: ${req.company} (op de muur: ${req.name}). Plaats: ${req.city || "onbekend"}. Domeinen uit de bestelling of de zoektocht: ${asked.map((a) => a.domain).filter(Boolean).join(", ") || "geen"}.`,
  `Hieronder ${shown.length} kandidaat-logo's. Kies het logo dat echt van dit bedrijf is. Let op naamgenoten in andere landen of branches, verouderde logo's en plaatjes die geen logo zijn (foto's, standaardicoontjes, lege favicons). Een woordmerk met de naam heeft de voorkeur boven alleen een symbool. Kies 0 als geen enkel plaatje zeker van dit bedrijf is: liever geen logo dan een verkeerd logo.`,
  "Het logo wordt op de muur als donkere inkt op gebroken wit gedrukt. ink = donker voor een donker logo op een lichte of doorzichtige achtergrond, licht voor een wit of licht logo, kleur alleen als het zonder zijn kleuren niet meer herkenbaar is."
].join("\n\n");
const content = [{ type: "text", text: intro }];
shown.forEach((c, n) => {
  content.push({ type: "text", text: `Kandidaat ${n + 1}: ${c.source}, domein ${c.domain}${c.brand ? `, merknaam "${c.brand}"` : ""}, soort ${c.type}${c.theme ? `, thema ${c.theme}` : ""}.` });
  content.push({ type: "image", source: { type: "url", url: c.viewUrl } });
});

const claudeBody = {
  model: "claude-opus-5-5",
  max_tokens: 1500,
  fallbacks: "default",
  output_config: { effort: "low", format: { type: "json_schema", schema: __CLAUDE_SCHEMA__ } },
  messages: [{ role: "user", content }]
};
return [{ json: { ...req, domains: asked.map((a) => a.domain).filter(Boolean), candidates: shown, claudeBody: shown.length ? claudeBody : null } }];
