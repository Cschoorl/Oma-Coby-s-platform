// Voorbeeld van de zakelijke bevestigingsmail, met de echte template uit Code.gs.
// Draaien: node apps-script/mail-preview.mjs  →  docs/mail-zakelijke-bevestiging*.html (Polonaisepartner, Feestpartner, muziekmiddag, donatie)
import { readFileSync, writeFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const here = new URL(".", import.meta.url);
const context = createContext({ console });
runInContext(readFileSync(new URL("Code.gs", here), "utf8"), context);
// Geen Sheet: Instellingen en Zakelijke dagen leeg, dus de standaarden uit CONFIG.BUSINESS.
context.readTab_ = () => [];

const extra = { wallOfFame: false, certificate: false, certificateName: "", linkedin: false, source: "", ambassador: "", via: "" };
const examples = {
  // Polonaisepartner, bezorgen in Amsterdam vóór 10:00, met donatie en alle vinkjes.
  "mail-zakelijke-bevestiging": {
    ...extra, pakket: "zilver", withRaisins: 110, withoutRaisins: 40, donation: 20, flyers: false, fulfilment: "bezorgen", area: "regio",
    moment: "voor10", date: "2026-12-14", pickupAgreed: false, street: "Keizersgracht 210", postalCode: "1016 DZ", city: "Amsterdam",
    company: "Studio Grachtengordel", contact: "Sanne de Vries", phone: "06 12345678", email: "sanne@studiograchtengordel.nl",
    invoiceEmail: "facturen@studiograchtengordel.nl", invoiceAddress: "", reference: "PO-2026-118", remark: "Graag bij de receptie afgeven, 2e verdieping.",
    wallOfFame: true, certificate: true, certificateName: "Studio Grachtengordel", linkedin: true
  },
  // Feestpartner buiten Amsterdam.
  "mail-zakelijke-bevestiging-goud": {
    ...extra, pakket: "goud", withRaisins: 420, withoutRaisins: 180, donation: 0, flyers: false, fulfilment: "bezorgen", area: "buiten", moment: "regulier",
    date: "2026-12-17", pickupAgreed: false, street: "Stationsplein 1", postalCode: "2011 LR", city: "Haarlem", company: "Bakkerij & Zn", contact: "Joost",
    phone: "020 1234567", email: "joost@example.nl", invoiceEmail: "joost@example.nl", invoiceAddress: "", reference: "", remark: ""
  },
  // Een hele muziekmiddag adopteren.
  "mail-zakelijke-bevestiging-muziekmiddag": {
    ...extra, pakket: "middag60", withRaisins: 1750, withoutRaisins: 750, donation: 0, flyers: false, fulfilment: "bezorgen", area: "regio", moment: "regulier",
    date: "2026-12-18", pickupAgreed: false, street: "Legmeerdijk 313", postalCode: "1431 GB", city: "Aalsmeer", company: "Bloemenveiling Noord",
    contact: "Petra Jansen", phone: "06 87654321", email: "petra@example.nl", invoiceEmail: "petra@example.nl", invoiceAddress: "", reference: "", remark: "",
    wallOfFame: true, certificate: true, certificateName: "Bloemenveiling Noord", linkedin: true
  },
  // Alleen een donatie, zonder oliebollen.
  "mail-zakelijke-bevestiging-donatie": {
    ...extra, pakket: "", withRaisins: 0, withoutRaisins: 0, donation: 40, flyers: false, fulfilment: "donatie", area: "", moment: "regulier",
    date: "", pickupAgreed: false, street: "", postalCode: "", city: "", company: "Advocatenkantoor Vondel", contact: "Mark Bakker",
    phone: "06 11223344", email: "mark@example.nl", invoiceEmail: "mark@example.nl", invoiceAddress: "", reference: "", remark: ""
  }
};

const numbers = {
  "mail-zakelijke-bevestiging": "Z26-0002",
  "mail-zakelijke-bevestiging-goud": "Z26-0007",
  "mail-zakelijke-bevestiging-muziekmiddag": "Z26-0011",
  "mail-zakelijke-bevestiging-donatie": "Z26-0014"
};

for (const [file, input] of Object.entries(examples)) {
  const html = runInContext(
    `(function (i) {
      const info = businessInfo_();
      const d = businessMailData_(${JSON.stringify(numbers[file])}, i, businessTotals_(i, info), info);
      return businessMailHtml_(d, function (name) { return '../public/mail/' + BUSINESS_MAIL_FILES[name]; });
    })`,
    context
  )(input);
  writeFileSync(new URL(`../docs/${file}.html`, here), html);
  console.log(`docs/${file}.html`);
}
