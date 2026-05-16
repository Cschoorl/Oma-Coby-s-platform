import type { Order } from "../../types/order";
import { mapsUrl } from "../../utils/orderUtils";

interface OrderDetailsProps {
  order: Order | null;
}

export function OrderDetails({ order }: OrderDetailsProps) {
  if (!order) {
    return (
      <section className="rounded-2xl border border-white/60 bg-white/85 p-6 shadow-card backdrop-blur">
        <p className="text-sm text-stone-600">Selecteer een bezorging om details te zien.</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-white/60 bg-white/85 p-4 shadow-card backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-wide text-stone-500">Locatie details</p>
        <h2 className="text-lg font-semibold text-stone-900">{order.locationName}</h2>
      </div>

      <div className="grid gap-2 text-sm text-stone-700">
        <p className="font-medium text-stone-900">Contactpersoon: {order.contactPerson}</p>
        <a
          className="inline-flex w-fit items-center rounded-lg bg-coby-100 px-3 py-1.5 font-medium text-coby-900 transition hover:bg-coby-200"
          href={`tel:${order.phone}`}
        >
          Bel: {order.phone}
        </a>
        <a
          className="inline-flex w-fit items-center rounded-lg bg-stone-100 px-3 py-1.5 font-medium text-stone-800 transition hover:bg-stone-200"
          href={mapsUrl(order)}
          target="_blank"
          rel="noreferrer"
        >
          Open locatie in Maps
        </a>
        <p className="text-sm text-stone-600">
          {order.address}, {order.postalCode} {order.city}
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50/80 p-3 text-sm">
        <p className="font-semibold text-stone-900">Bestellingsdetails</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white p-2">
            <p className="text-xs text-stone-500">Met krenten</p>
            <p className="text-base font-semibold text-stone-900">{order.withRaisins}</p>
          </div>
          <div className="rounded-lg bg-white p-2">
            <p className="text-xs text-stone-500">Zonder krenten</p>
            <p className="text-base font-semibold text-stone-900">{order.withoutRaisins}</p>
          </div>
        </div>
        <p>Extra: {order.extras ?? "Geen extra aantekeningen"}</p>
      </div>
    </section>
  );
}
