import { useEffect, useRef, useState } from "react";
import { Icon, todayIso } from "../../components/ui";

interface OrderFiltersProps {
  selectedDate: string;
  availableDates: string[];
  onDateChange: (value: string) => void;
  /** Label before the days; "Leverdag" by default. */
  label?: string;
}

function formatDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const WEEKDAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

/** Month calendar in the house style: Monday first, six fixed rows, delivery days marked. */
function MonthCalendar({ selected, marked, onPick }: { selected: string; marked: Set<string>; onPick: (value: string) => void }) {
  const start = new Date(`${selected}T12:00:00`);
  const [month, setMonth] = useState(() => new Date(start.getFullYear(), start.getMonth(), 1));
  const first = new Date(month);
  first.setDate(1 - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  const today = todayIso();
  return (
    <div className="w-[280px] rounded-kaart bg-papier p-3 shadow-zwevend">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" className="rounded-md px-2 py-1 text-oliebol hover:bg-vul" aria-label="Vorige maand" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          ‹
        </button>
        <p className="font-serif text-base font-bold capitalize">{month.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}</p>
        <button type="button" className="rounded-md px-2 py-1 text-oliebol hover:bg-vul" aria-label="Volgende maand" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase text-muted">
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d) => {
          const key = iso(d);
          const inMonth = d.getMonth() === month.getMonth();
          const isSel = key === selected;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPick(key)}
              className={`relative h-9 rounded-md text-sm tabular-nums transition ${
                isSel ? "bg-krent font-bold text-meel" : marked.has(key) ? "bg-gouwe-50 font-bold text-krent hover:bg-gouwe-100" : inMonth ? "text-krent hover:bg-vul" : "text-muted/50 hover:bg-vul"
              }`}
              aria-pressed={isSel}
              aria-label={d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" })}
            >
              {d.getDate()}
              {key === today ? <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-feest" /> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">Leverdagen staan in gouwe ouwe.</p>
    </div>
  );
}

/** Day picker: the delivery days as soft buttons, plus a house-style calendar for any other day. */
export function OrderFilters({ selectedDate, availableDates, onDateChange, label = "Leverdag" }: OrderFiltersProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const today = todayIso();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const otherDay = !availableDates.includes(selectedDate);

  return (
    <div className="relative flex flex-wrap items-center gap-1.5" ref={wrapRef}>
      <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{label}</span>
      {availableDates.map((date) => (
        <button
          key={date}
          type="button"
          onClick={() => onDateChange(date)}
          aria-pressed={date === selectedDate}
          className={`relative rounded-md px-3 py-1.5 text-[13px] transition ${date === selectedDate ? "bg-krent font-bold text-meel" : "bg-vul text-krent hover:bg-vul-2"}`}
        >
          {formatDateLabel(date)}
          {date === today ? <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-feest" aria-label="vandaag" /> : null}
        </button>
      ))}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] transition ${otherDay ? "bg-krent font-bold text-meel" : "bg-vul text-krent hover:bg-vul-2"}`}
      >
        <Icon name="calendar" className="h-3.5 w-3.5" />
        {otherDay ? formatDateLabel(selectedDate) : "Andere dag"}
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-2">
          <MonthCalendar
            selected={selectedDate}
            marked={new Set(availableDates)}
            onPick={(value) => {
              onDateChange(value);
              setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
