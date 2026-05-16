interface SupplierPickerProps {
  supplierNames: string[];
  selectedSupplier: string | null;
  onSelectSupplier: (supplier: string) => void;
}

export function SupplierPicker({ supplierNames, selectedSupplier, onSelectSupplier }: SupplierPickerProps) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-card backdrop-blur">
      <h2 className="mb-3 text-base font-semibold text-stone-900">Leveranciers van deze dag</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {supplierNames.map((supplier) => {
          const initials = supplier
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();

          return (
            <button
              key={supplier}
              type="button"
              onClick={() => onSelectSupplier(supplier)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                selectedSupplier === supplier
                  ? "border-coby-500 bg-coby-100 text-coby-900 shadow-sm"
                  : "border-stone-200 bg-white text-stone-800 hover:border-coby-300 hover:bg-coby-50/40"
              }`}
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-coby-200 text-xs font-bold text-coby-900">
                {initials}
              </span>
              <span>{supplier}</span>
            </button>
          );
        })}
      </div>
      {supplierNames.length === 0 ? (
        <p className="mt-3 text-sm text-stone-600">Geen leveranciers gevonden voor deze datum.</p>
      ) : null}
    </section>
  );
}
