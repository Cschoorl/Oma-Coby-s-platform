import { useEffect, useRef, type ReactNode } from "react";

/**
 * Side panel for details (a volunteer, a day) next to an overview, like planning tools do:
 * the overview stays in view, Esc or the cross closes it and focus returns to where you were.
 * On a phone it covers the whole width.
 */
export function Drawer({ title, onClose, children, header }: { title: string; onClose: () => void; children: ReactNode; header?: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
    // Only on open and close; onClose may change identity on every render.
  }, []);

  return (
    <div className="fixed inset-0 z-40 print:hidden">
      <button type="button" className="absolute inset-0 h-full w-full cursor-default bg-krent/25" aria-label="Sluiten" tabIndex={-1} onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="oc-drawer absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-meel shadow-zwevend focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-lijn bg-papier px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">{header ?? <h2 className="font-serif text-xl font-bold text-krent">{title}</h2>}</div>
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-xl font-bold text-oliebol hover:bg-vul hover:text-krent"
            onClick={onClose}
            aria-label="Sluiten"
          >
            ×
          </button>
        </div>
        <div className="grid flex-1 content-start gap-5 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}
