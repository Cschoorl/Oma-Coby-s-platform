// Code-node "Keuze": wat Claude koos, als bericht voor het Apps Script (actie wallOfFameLogo).
const cfg = $('Instellingen').first().json;
const req = $('Kandidaten').first().json;
const res = $input.first().json ?? {};
let answer = null;
try {
  const text = res.stop_reason === "refusal" ? "" : (res.content ?? []).find((b) => b.type === "text")?.text;
  answer = text ? JSON.parse(text) : null;
} catch {
  answer = null;
}
const pick = answer && Number.isInteger(answer.choice) && answer.choice >= 1 ? req.candidates[answer.choice - 1] ?? null : null;
const confidence = answer && typeof answer.confidence === "number" ? Math.max(0, Math.min(1, answer.confidence)) : null;
const failure = res.error?.message ? `Claude gaf een fout: ${res.error.message}` : "Geen bruikbaar antwoord van Claude.";
return [
  {
    json: {
      action: "wallOfFameLogo",
      secret: cfg.callbackSecret,
      key: req.key,
      found: Boolean(pick),
      logoUrl: pick ? pick.wallUrl : "",
      ink: ["donker", "licht", "kleur"].includes(answer?.ink) ? answer.ink : "donker",
      source: pick ? pick.source : "n8n",
      // Waar het logo vandaan komt. Is dat niet het domein van de besteller, dan krijgt beheer een waarschuwing.
      logoDomain: pick ? pick.domain : "",
      confidence: pick ? confidence : null,
      note: String(answer?.note ?? failure).slice(0, 400)
    }
  }
];
