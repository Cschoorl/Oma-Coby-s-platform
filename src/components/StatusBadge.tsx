import type { DeliveryStatus } from "../types/order";
import { statusClasses, statusLabel } from "../utils/orderUtils";

interface StatusBadgeProps {
  status: DeliveryStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[status]}`}>
      {statusLabel[status]}
    </span>
  );
}
