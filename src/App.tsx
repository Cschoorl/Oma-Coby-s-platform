import { useEffect, useMemo, useState } from "react";
import type { Order } from "./types/order";
import { OrderFilters } from "./features/orders/OrderFilters";
import { OrderList } from "./features/orders/OrderList";
import { OrderDetails } from "./features/orders/OrderDetails";
import { SupplierPicker } from "./features/orders/SupplierPicker";
import { mapsRouteUrlForOrders } from "./utils/orderUtils";
import { loadOrders } from "./data/ordersSource";
import { AgendaPage } from "./features/agenda/AgendaPage";

type View = "leveranciers" | "agenda";

function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("2026-03-24");
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [view, setView] = useState<View>("leveranciers");

  useEffect(() => {
    let active = true;

    loadOrders().then((nextOrders) => {
      if (!active) return;
      setOrders(nextOrders);
      setSelectedDate((current) => nextOrders[0]?.deliveryDate ?? current);
      setSelectedOrderId(nextOrders[0]?.id ?? null);
    });

    return () => {
      active = false;
    };
  }, []);

  const dayOrders = useMemo(() => orders.filter((order) => order.deliveryDate === selectedDate), [orders, selectedDate]);
  const availableDates = useMemo(() => Array.from(new Set(orders.map((order) => order.deliveryDate))).sort(), [orders]);

  const supplierNames = useMemo(
    () => Array.from(new Set(dayOrders.map((order) => order.supplierName))).sort(),
    [dayOrders]
  );

  useEffect(() => {
    if (selectedSupplier && !supplierNames.includes(selectedSupplier)) {
      setSelectedSupplier(null);
      setSelectedOrderId(null);
    }
  }, [selectedSupplier, supplierNames]);

  useEffect(() => {
    if (availableDates.length === 0) return;
    if (!availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
      setSelectedSupplier(null);
      setSelectedOrderId(null);
    }
  }, [availableDates, selectedDate]);

  const filteredOrders = useMemo(() => {
    return dayOrders.filter((order) => {
      const supplierMatches = selectedSupplier !== null && order.supplierName === selectedSupplier;
      return supplierMatches;
    });
  }, [dayOrders, selectedSupplier]);

  const selectedOrder = filteredOrders.find((order) => order.id === selectedOrderId) ?? filteredOrders[0] ?? null;
  const supplierRouteUrl = mapsRouteUrlForOrders(filteredOrders);
  const totalBatches = filteredOrders.reduce((sum, order) => sum + order.withRaisins + order.withoutRaisins, 0);

  function handleSelectSupplier(supplier: string) {
    setSelectedSupplier(supplier);
    setSelectedOrderId(null);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8ed,_#ffe5be_52%,_#ffd296)] p-4 sm:p-6">
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <header className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-coby-800 via-coby-700 to-coby-600 p-6 text-white shadow-2xl">
          <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 right-24 h-24 w-24 rounded-full bg-amber-200/20 blur-xl" />
          <p className="text-sm font-medium tracking-wide text-coby-100">Oma Coby's Oliebollenbar</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Leveranciers Platform</h1>
          <p className="mt-2 max-w-2xl text-sm text-coby-100">
            Kies je naam, bekijk jouw stops en open direct de slimste dagroute in Google Maps.
          </p>

          <nav className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("leveranciers")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                view === "leveranciers" ? "bg-white/20 text-white" : "bg-white/0 text-white/90 hover:bg-white/10"
              }`}
            >
              Leveranciers
            </button>
            <button
              type="button"
              onClick={() => setView("agenda")}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                view === "agenda" ? "bg-white/20 text-white" : "bg-white/0 text-white/90 hover:bg-white/10"
              }`}
            >
              Agenda
            </button>
          </nav>
        </header>

        <OrderFilters
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        {view === "agenda" ? (
          <AgendaPage orders={orders} contactEmail="planning@omacobysoliebollenbar.nl" />
        ) : (
          <>
            <SupplierPicker
              supplierNames={supplierNames}
              selectedSupplier={selectedSupplier}
              onSelectSupplier={handleSelectSupplier}
            />

            {supplierNames.length === 0 ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Geen bezorgers gevonden voor deze leverdag. Kies een andere datum of controleer of je API bezorgers met
                `Ja` bij fietskoerier/autokoerier teruggeeft.
              </section>
            ) : null}

            {selectedSupplier ? (
              <>
                <section className="grid gap-3 sm:grid-cols-3">
                  <article className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-card backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-stone-500">Leverancier</p>
                    <p className="mt-1 text-lg font-semibold text-stone-900">{selectedSupplier}</p>
                  </article>
                  <article className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-card backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-stone-500">Stops vandaag</p>
                    <p className="mt-1 text-lg font-semibold text-stone-900">{filteredOrders.length}</p>
                  </article>
                  <article className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-card backdrop-blur">
                    <p className="text-xs uppercase tracking-wide text-stone-500">Totaal oliebollen</p>
                    <p className="mt-1 text-lg font-semibold text-stone-900">{totalBatches}</p>
                  </article>
                </section>

                <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-card backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-stone-700">Route start altijd vanaf baklocatie in Aalsmeer.</p>
                    {supplierRouteUrl ? (
                      <a
                        className="inline-flex items-center rounded-xl bg-coby-600 px-4 py-2 text-sm font-semibold text-white transition hover:translate-y-[-1px] hover:bg-coby-700"
                        href={supplierRouteUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open premium dagroute in Google Maps
                      </a>
                    ) : (
                      <p className="text-xs text-stone-500">Nog geen route beschikbaar voor deze selectie.</p>
                    )}
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                  <OrderList
                    orders={filteredOrders}
                    selectedOrderId={selectedOrder?.id ?? null}
                    onSelectOrder={setSelectedOrderId}
                  />
                  <OrderDetails order={selectedOrder} />
                </section>
              </>
            ) : (
              <section className="rounded-2xl border border-white/60 bg-white/85 p-5 text-sm text-stone-700 shadow-card backdrop-blur">
                Kies eerst je naam hierboven om jouw locaties en route te bekijken.
              </section>
            )}
          </>
        )}

        <section className="rounded-2xl border border-dashed border-coby-400/70 bg-coby-50/70 p-4 text-sm text-coby-900">
          <p className="font-semibold">Data bron (demo-ready):</p>
          <p>Vul `VITE_N8N_WEBHOOK_URL` in om live data uit je n8n-flow (Google Sheet) te laden.</p>
        </section>
      </div>
    </main>
  );
}

export default App;
