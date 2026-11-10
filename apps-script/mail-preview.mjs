// Voorbeeld van de zakelijke bevestigingsmail, met de echte template uit Code.gs.
// Draaien: node apps-script/mail-preview.mjs  →  docs/mail-zakelijke-bevestiging.html (+ -afhalen.html)
import { readFileSync, writeFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const here = new URL(".", import.meta.url);
const context = createContext({ console });
runInContext(readFileSync(new URL("Code.gs", here), "utf8"), context);
// Geen Sheet: Instellingen en Zakelijke dagen leeg, dus de standaarden uit CONFIG.BUSINESS.
context.readTab_ = () => [];

const examples = {
  "mail-zakelijke-bevestiging": {
    pakket: "zilver", withRaisins: 110, withoutRaisins: 40, donation: 20, flyers: true, fulfilment: "bezorgen", area: "regio",
    moment: "voor10", date: "2026-12-14", pickupAgreed: false, street: "Keizersgracht 210", postalCode: "1016 DZ", city: "Amsterdam",
    company: "Studio Grachtengordel", contact: "Sanne de Vries", phone: "06 12345678", email: "sanne@studiograchtengordel.nl",
    invoiceEmail: "facturen@studiograchtengordel.nl", invoiceAddress: "", reference: "PO-2026-118", remark: "Graag bij de receptie afgeven, 2e verdieping."
  },
  "mail-zakelijke-bevestiging-afhalen": {
    pakket: "zelf", withRaisins: 60, withoutRaisins: 20, donation: 0, flyers: false, fulfilment: "afhalen", area: "", moment: "regulier",
    date: "2026-12-30", pickupAgreed: true, street: "", postalCode: "", city: "", company: "Bakkerij & Zn", contact: "Joost", phone: "020 1234567",
    email: "joost@example.nl", invoiceEmail: "joost@example.nl", invoiceAddress: "", reference: "", remark: ""
  }
};

for (const [file, input] of Object.entries(examples)) {
  const html = runInContext(
    `(function (i) {
      const info = businessInfo_();
      const d = businessMailData_(${JSON.stringify(file === "mail-zakelijke-bevestiging" ? "Z26-0002" : "Z26-0007")}, i, businessTotals_(i, info), info);
      return businessMailHtml_(d, function (name) { return '../public/mail/' + name + '.png'; });
    })`,
    context
  )(input);
  writeFileSync(new URL(`../docs/${file}.html`, here), html);
  console.log(`docs/${file}.html`);
}
