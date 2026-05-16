interface OrderFiltersProps {
  selectedDate: string;
  onDateChange: (value: string) => void;
}

export function OrderFilters({
  selectedDate,
  onDateChange
}: OrderFiltersProps) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-card backdrop-blur">
      <label className="grid gap-2 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Leverdag</span>
        <input
          type="date"
          className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm focus:border-coby-500 focus:outline-none"
          value={selectedDate}
          onChange={(event) => onDateChange(event.target.value)}
        />
      </label>
    </section>
  );
}
