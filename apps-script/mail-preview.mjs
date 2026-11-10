// Voorbeeld van de zakelijke bevestigingsmail, met de echte template uit Code.gs.
// Draaien: node apps-script/mail-preview.mjs  →  docs/mail-zakelijke-bevestiging.html (Zilver) en -goud.html
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
  "mail-zakelijke-bevestiging-goud": {
    pakket: "goud", withRaisins: 420, withoutRaisins: 180, donation: 0, flyers: false, fulfilment: "bezorgen", area: "buiten", moment: "regulier",
    date: "2026-12-17", pickupAgreed: false, street: "Stationsplein 1", postalCode: "2011 LR", city: "Haarlem", company: "Bakkerij & Zn", contact: "Joost",
    phone: "020 1234567", email: "joost@example.nl", invoiceEmail: "joost@example.nl", invoiceAddress: "", reference: "", remark: ""
  }
};

for (const [file, input] of Object.entries(examples)) {
  const html = runInContext(
    `(function (i) {
      const info = businessInfo_();
      const d = businessMailData_(${JSON.stringify(file === "mail-zakelijke-bevestiging" ? "Z26-0002" : "Z26-0007")}, i, businessTotals_(i, info), info);
      return businessMailHtml_(d, function (name) { return '../public/mail/' + BUSINESS_MAIL_FILES[name]; });
    })`,
    context
  )(input);
  writeFileSync(new URL(`../docs/${file}.html`, here), html);
  console.log(`docs/${file}.html`);
}
