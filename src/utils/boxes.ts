import { MAX_PER_DOOS } from "../config";
import type { Order } from "../types/order";

export type BoxKind = "met" | "zonder";

export interface Box {
  kind: BoxKind;
  /** Oliebollen in this box. */
  count: number;
  /** 1-based number within the whole order: MET boxes first, then ZONDER. */
  number: number;
  /** Boxes in the whole order. */
  total: number;
}

/** Fewest boxes that keep every box at or under the maximum. */
export function minBoxes(pieces: number, max = MAX_PER_DOOS): number {
  return pieces > 0 ? Math.ceil(pieces / max) : 0;
}

/**
 * Splits `pieces` over `boxes` boxes as evenly as possible (120 in 3 → 40, 40, 40; 51 in 2 → 26, 25),
 * so there is never a box with one lonely oliebol. Fewer boxes than the minimum are raised to it.
 */
export function splitPieces(pieces: number, boxes = minBoxes(pieces), max = MAX_PER_DOOS): number[] {
  if (pieces <= 0) return [];
  const n = Math.min(pieces, Math.max(boxes, minBoxes(pieces, max)));
  const base = Math.floor(pieces / n);
  const extra = pieces % n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/** The boxes of one order with their numbering; `counts` overrides the number of boxes per kind. */
export function orderBoxes(order: Pick<Order, "withRaisins" | "withoutRaisins">, counts?: Partial<Record<BoxKind, number>>): Box[] {
  const met = splitPieces(order.withRaisins, counts?.met);
  const zonder = splitPieces(order.withoutRaisins, counts?.zonder);
  const total = met.length + zonder.length;
  return [
    ...met.map((count, i) => ({ kind: "met" as const, count, number: i + 1, total })),
    ...zonder.map((count, i) => ({ kind: "zonder" as const, count, number: met.length + i + 1, total }))
  ];
}
