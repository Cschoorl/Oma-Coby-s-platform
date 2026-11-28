// Code-node "Niets gevonden": geen enkel logo bij Brandfetch of Logo.dev. Het naambordje blijft hangen.
const cfg = $('Instellingen').first().json;
const req = $input.first().json;
return [
  {
    json: {
      action: "wallOfFameLogo",
      secret: cfg.callbackSecret,
      key: req.key,
      found: false,
      logoUrl: "",
      ink: "donker",
      source: "n8n",
      logoDomain: "",
      confidence: null,
      note: `Geen logo gevonden bij Brandfetch of Logo.dev voor ${req.name}${req.domains.length ? ` (${req.domains.join(", ")})` : ""}; het naambordje blijft hangen.`
    }
  }
];
