import { Card, Oval } from "../../components/ui";

interface SupplierPickerProps {
  supplierNames: string[];
  selectedSupplier: string | null;
  onSelectSupplier: (supplier: string) => void;
}

export function SupplierPicker({ supplierNames, selectedSupplier, onSelectSupplier }: SupplierPickerProps) {
  return (
    <Card>
      <h2 className="mb-3 font-serif text-xl font-bold text-krent">Wie ben jij?</h2>
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
              className={`flex min-h-[52px] items-center gap-3 rounded-kaart px-3 py-2.5 text-left text-sm font-bold transition ${
                selectedSupplier === supplier ? "bg-gouwe-50 text-krent ring-1 ring-gouwe/70" : "bg-vul text-krent hover:bg-gouwe-50"
              }`}
            >
              <Oval>{initials}</Oval>
              <span>{supplier}</span>
            </button>
          );
        })}
      </div>
      {supplierNames.length === 0 ? <p className="mt-3 text-sm text-muted">Nog geen bezorgers ingedeeld op deze datum.</p> : null}
    </Card>
  );
}
