// Bouwt workflow.json (importeerbaar in n8n) uit de Code-nodes in code/ en het antwoordschema voor Claude.
// Na een wijziging in code/ of schemas/: node automation/wall-of-fame/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(here, "schemas/claude-choice.schema.json"), "utf8").trim();
const code = (file) => readFileSync(join(here, "code", file), "utf8").replace("__CLAUDE_SCHEMA__", schema.replace(/\n\s*/g, " "));

let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const codeNode = (name, file, position) => ({ id: id(), name, type: "n8n-nodes-base.code", typeVersion: 2, position, parameters: { jsCode: code(file) } });
const ifNode = (name, left, position) => ({
  id: id(),
  name,
  type: "n8n-nodes-base.if",
  typeVersion: 2.2,
  position,
  parameters: {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{ id: id(), leftValue: left, rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } }],
      combinator: "and"
    },
    options: {}
  }
});
const neverError = { response: { response: { neverError: true } } };
const headerAuth = (name) => ({ httpHeaderAuth: { id: "", name } });

const nodes = [
  {
    id: id(),
    name: "Logo gevraagd",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [0, 300],
    webhookId: id(),
    parameters: { httpMethod: "POST", path: "oma-coby-wall-of-fame", authentication: "headerAuth", responseMode: "onReceived", options: { responseCode: 202 } },
    credentials: headerAuth("Oma Coby wall of fame")
  },
  {
    id: id(),
    name: "Instellingen",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [220, 300],
    parameters: {
      assignments: {
        assignments: [
          ["scriptUrl", "={{ $env.OMA_COBY_SCRIPT_URL }}"],
          ["callbackSecret", "={{ $env.OMA_COBY_WALL_SECRET }}"],
          ["brandfetchClientId", "={{ $env.BRANDFETCH_CLIENT_ID }}"],
          ["logoDevToken", "={{ $env.LOGO_DEV_TOKEN }}"]
        ].map(([name, value]) => ({ id: id(), name, value, type: "string" }))
      },
      options: {}
    }
  },
  codeNode("Domeinen", "1-domeinen.js", [440, 300]),
  ifNode("Zoeken nodig?", "={{ $json.needSearch }}", [660, 300]),
  {
    id: id(),
    name: "Brandfetch zoeken",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [880, 180],
    alwaysOutputData: true,
    onError: "continueRegularOutput",
    parameters: {
      url: "=https://api.brandfetch.io/v2/search/{{ encodeURIComponent($json.company) }}?c={{ $('Instellingen').first().json.brandfetchClientId }}",
      options: neverError
    }
  },
  codeNode("Zoekresultaat", "2-zoekresultaat.js", [1100, 180]),
  codeNode("Per domein", "3-per-domein.js", [1320, 300]),
  {
    id: id(),
    name: "Brandfetch merk",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [1540, 300],
    alwaysOutputData: true,
    onError: "continueRegularOutput",
    parameters: {
      url: "=https://api.brandfetch.io/v2/brands/{{ $json.domain || 'onbekend.invalid' }}",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      options: neverError
    },
    credentials: headerAuth("Brandfetch")
  },
  codeNode("Kandidaten", "4-kandidaten.js", [1760, 300]),
  ifNode("Logo's gevonden?", "={{ !!$json.claudeBody }}", [1980, 300]),
  {
    id: id(),
    name: "Claude kiest",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [2200, 180],
    onError: "continueRegularOutput",
    parameters: {
      method: "POST",
      url: "https://api.anthropic.com/v1/messages",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "anthropic-version", value: "2023-06-01" },
          { name: "anthropic-beta", value: "server-side-fallback-2026-07-01" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json.claudeBody) }}",
      options: { ...neverError, timeout: 90000 }
    },
    credentials: headerAuth("Anthropic")
  },
  codeNode("Keuze", "5-keuze.js", [2420, 180]),
  codeNode("Niets gevonden", "6-niets.js", [2200, 420]),
  {
    id: id(),
    name: "Terugmelden",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [2640, 300],
    parameters: {
      method: "POST",
      url: "={{ $('Instellingen').first().json.scriptUrl }}",
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json) }}",
      options: neverError
    }
  }
];

const to = (...names) => [names.map((node) => ({ node, type: "main", index: 0 }))];
const connections = {
  "Logo gevraagd": { main: to("Instellingen") },
  Instellingen: { main: to("Domeinen") },
  Domeinen: { main: to("Zoeken nodig?") },
  "Zoeken nodig?": { main: [...to("Brandfetch zoeken"), ...to("Per domein")] },
  "Brandfetch zoeken": { main: to("Zoekresultaat") },
  Zoekresultaat: { main: to("Per domein") },
  "Per domein": { main: to("Brandfetch merk") },
  "Brandfetch merk": { main: to("Kandidaten") },
  Kandidaten: { main: to("Logo's gevonden?") },
  "Logo's gevonden?": { main: [...to("Claude kiest"), ...to("Niets gevonden")] },
  "Claude kiest": { main: to("Keuze") },
  Keuze: { main: to("Terugmelden") },
  "Niets gevonden": { main: to("Terugmelden") }
};

const workflow = {
  name: "Oma Coby · Wall of fame · logo zoeken",
  nodes,
  connections,
  settings: { executionOrder: "v1", saveDataErrorExecution: "all", saveDataSuccessExecution: "none" },
  pinData: {},
  meta: { templateCredsSetupCompleted: false }
};
writeFileSync(join(here, "workflow.json"), JSON.stringify(workflow, null, 2) + "\n");
console.log(`workflow.json: ${nodes.length} nodes`);
