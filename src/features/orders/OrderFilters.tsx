interface OrderFiltersProps {
  selectedDate: string;
  availableDates: string[];
  onDateChange: (value: string) => void;
}

function formatDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

export function OrderFilters({ selectedDate, availableDates, onDateChange }: OrderFiltersProps) {
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
      {availableDates.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {availableDates.map((date) => (
            <button
              key={date}
              type="button"
              onClick={() => onDateChange(date)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                date === selectedDate
                  ? "border-coby-500 bg-coby-100 text-coby-900"
                  : "border-stone-200 bg-white text-stone-700 hover:border-coby-300"
              }`}
            >
              {formatDateLabel(date)}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
