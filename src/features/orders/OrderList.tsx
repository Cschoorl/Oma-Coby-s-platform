import type { Order } from "../../types/order";
import { orderTotal } from "../../utils/orderUtils";

interface OrderListProps {
  orders: Order[];
  selectedOrderId: string | null;
  onSelectOrder: (id: string) => void;
}

export function OrderList({ orders, selectedOrderId, onSelectOrder }: OrderListProps) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-3 shadow-card backdrop-blur">
      <h2 className="mb-3 px-1 text-base font-semibold text-stone-900">Jouw locaties vandaag</h2>
      <div className="grid gap-2">
        {orders.map((order) => (
          <button
            key={order.id}
            type="button"
            className={`grid gap-2 rounded-xl border p-3 text-left transition ${
              selectedOrderId === order.id
                ? "border-coby-500 bg-coby-50 shadow-sm"
                : "border-stone-200 bg-white hover:border-coby-300 hover:bg-coby-50/40"
            }`}
            onClick={() => onSelectOrder(order.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-stone-900">{order.locationName}</p>
              <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700">{order.id}</span>
            </div>
            <p className="text-sm text-stone-600">Contact: {order.contactPerson}</p>
            <div className="flex items-center justify-between text-sm text-stone-700">
              <span>{order.plannedTime}</span>
              <span>{orderTotal(order)} oliebollen</span>
            </div>
          </button>
        ))}
      </div>
      {orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 p-4 text-sm text-stone-600">
          Geen bestellingen in deze selectie.
        </p>
      ) : null}
    </section>
  );
}
