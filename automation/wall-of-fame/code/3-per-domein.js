// Code-node "Per domein": één item per domein voor Brandfetch. Geen domein: één leeg item, dan meldt de
// workflow netjes "niets gevonden" terug in plaats van stil te stoppen.
const req = $input.first().json;
const domains = req.domains.length ? req.domains : [""];
return domains.map((domain) => ({ json: { ...req, domain } }));
