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

/** Compact day picker: the delivery days as buttons, with a date field for any other day. */
export function OrderFilters({ selectedDate, availableDates, onDateChange }: OrderFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium text-stone-600">Leverdag</span>
      {availableDates.map((date) => (
        <button
          key={date}
          type="button"
          onClick={() => onDateChange(date)}
          aria-pressed={date === selectedDate}
          className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
            date === selectedDate ? "border-coby-600 bg-coby-600 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
          }`}
        >
          {formatDateLabel(date)}
        </button>
      ))}
      <input
        type="date"
        aria-label="Andere datum"
        className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm text-stone-700 focus:border-coby-500 focus:outline-none"
        value={selectedDate}
        onChange={(event) => onDateChange(event.target.value)}
      />
    </div>
  );
}
