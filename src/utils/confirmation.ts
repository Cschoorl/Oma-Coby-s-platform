import type { Order } from "../types/order";

function formatDate(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function confirmationSubject(order: Order): string {
  return `Bevestiging van je bestelling ${order.id} – Oma Coby's Oliebollenbar`;
}

/** Default text for a customer confirmation. Deliberately an order confirmation, not an invoice. */
export function defaultConfirmation(order: Order, note: string): string {
  const name = order.contactPerson || order.locationName || "klant";
  const lines = [
    `Beste ${name},`,
    "",
    "Bedankt voor je bestelling bij Oma Coby's Oliebollenbar! Hierbij bevestigen we wat we voor je klaarzetten.",
    "",
    `Ordernummer: ${order.id}`,
    `Leverdatum: ${formatDate(order.deliveryDate)}${order.plannedTime ? `, rond ${order.plannedTime}` : ""}`,
    `Afleveradres: ${[order.locationName, order.address, `${order.postalCode} ${order.city}`.trim()].filter(Boolean).join(", ")}`,
    "",
    `Oliebollen met krenten: ${order.withRaisins}`,
    `Oliebollen zonder krenten: ${order.withoutRaisins}`,
    `Totaal: ${order.withRaisins + order.withoutRaisins} oliebollen`
  ];
  if (note) lines.push("", `Opmerking: ${note}`);
  lines.push(
    "",
    "Klopt er iets niet? Antwoord dan op deze e-mail, dan passen we het aan.",
    "",
    "Let op: dit is een bevestiging van je bestelling, geen factuur.",
    "",
    "Hartelijke groet,",
    "Oma Coby's Oliebollenbar"
  );
  return lines.join("\n");
}
