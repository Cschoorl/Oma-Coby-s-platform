import type { DeliveryContact } from "../lib/deliveryContact";
import { telHref } from "../lib/deliveryContact";

/** "Contact: Anna de Vries · 06 12345678 · bel bij aankomst", with a tappable phone number. */
export function DeliveryContactLine({ contact, className = "" }: { contact: DeliveryContact; className?: string }) {
  if (!contact.name && !contact.phone && !contact.note) return null;
  return (
    <p className={`text-sm text-krent ${className}`}>
      <span className="text-muted">Contact: </span>
      {contact.name ? <span>{contact.name}</span> : null}
      {contact.phone ? (
        <>
          {contact.name ? <span className="text-muted"> · </span> : null}
          <a className="font-bold underline decoration-gouwe underline-offset-2 hover:text-feest-ink" href={telHref(contact.phone)}>
            {contact.phone}
          </a>
        </>
      ) : null}
      {contact.note ? <span className="text-oliebol"> · {contact.note}</span> : null}
    </p>
  );
}
