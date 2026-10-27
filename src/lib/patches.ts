import type { DashboardState, PackingState } from "../types/dashboard";
import { emptyPacking } from "../types/dashboard";

/** Local time as the script writes it ("2026-12-30 09:12:00"). */
function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function packing(orderId: string, change: (p: PackingState) => Partial<PackingState>) {
  return (s: DashboardState): DashboardState => {
    const current = s.packing[orderId] ?? emptyPacking;
    return { ...s, packing: { ...s.packing, [orderId]: { ...current, ...change(current) } } };
  };
}

/** What the screen shows right after a click, before the Sheet confirms it (same rules as the script). */
export const patches = {
  claim: (orderId: string, name: string) => packing(orderId, () => ({ claimedBy: name, claimedAt: stamp() })),
  release: (orderId: string) => packing(orderId, () => ({ claimedBy: "", claimedAt: "", met: false, zonder: false, totaal: false })),
  checkPart: (orderId: string, part: "met" | "zonder" | "totaal", done: boolean) =>
    packing(orderId, () => ({ [part]: done, ...(part !== "totaal" && !done ? { totaal: false } : {}) })),
  complete: (orderId: string, name: string) => packing(orderId, () => ({ packedBy: name, packedAt: stamp() })),
  reopen: (orderId: string, name: string) => packing(orderId, () => ({ packedBy: "", packedAt: "", claimedBy: name, claimedAt: stamp() })),
  packNote: (itemId: string, name: string, done: boolean) => (s: DashboardState): DashboardState => {
    const packNotes = { ...(s.packNotes ?? {}) };
    if (done) packNotes[itemId] = { by: name, at: stamp() };
    else delete packNotes[itemId];
    return { ...s, packNotes };
  },
  delivered: (orderId: string, name: string, delivered: boolean) => (s: DashboardState): DashboardState => {
    const delivery = { ...s.delivery };
    if (delivered) delivery[orderId] = { deliveredBy: name, deliveredAt: stamp() };
    else delete delivery[orderId];
    return { ...s, delivery };
  }
};
