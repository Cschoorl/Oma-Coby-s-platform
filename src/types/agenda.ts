export type DeliveryRole = "Fietskoerier" | "Autokoerier" | "Inpakken" | "Oliebollenbar";

export interface AgendaShift {
  id: string;
  personName: string;
  role: DeliveryRole;
  dateLabel: string; // e.g. "17 december"
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "12:00"
  locationName?: string;

  // Sorting helpers (jaar onbekend)
  monthIndex: number; // 0-11
  dayOfMonth: number;
}

