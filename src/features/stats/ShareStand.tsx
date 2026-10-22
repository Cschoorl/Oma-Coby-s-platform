import { useEffect, useRef, useState } from "react";
import { Segmented, ghostButton, primaryButton, toast } from "../../components/ui";
import { cardFileName, drawStandCard, type CardFormat, type StandData } from "./exportStand";

/** Preview of the share card, with a choice of Post or Story; shares on phones, saves elsewhere. */
export function ShareStand({ data, onClose }: { data: StandData; onClose: () => void }) {
  const [format, setFormat] = useState<CardFormat>("post");
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let alive = true;
    let url = "";
    setCard(null);
    setError(null);
    drawStandCard(data, format)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setCard({ blob, url });
      })
      .catch((err) => alive && setError(err instanceof Error ? err.message : "Het kaartje maken lukte niet."));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [data, format]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const file = card ? new File([card.blob], cardFileName(data.date, format), { type: "image/png" }) : null;
  const canShare = !!file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  function save() {
    if (!card) return;
    const a = document.createElement("a");
    a.href = card.url;
    a.download = cardFileName(data.date, format);
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast("Opgeslagen. Delen maar!");
  }

  async function share() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: "Tussenstand Oma Coby's Oliebollenbar" });
    } catch (err) {
      // Closing the share sheet is not an error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      save();
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-krent/45 p-4" role="dialog" aria-modal="true" aria-labelledby="share-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="grid max-h-full w-full max-w-md gap-3 overflow-auto rounded-kaart bg-papier p-4 shadow-zwevend">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="share-title" className="font-serif text-xl font-bold text-krent">
            Deel de stand
          </h2>
          <Segmented
            label="Formaat"
            value={format}
            onChange={setFormat}
            options={[
              ["post", "Post 4:5"],
              ["story", "Story 9:16"]
            ]}
          />
        </div>
        <div className="grid min-h-[200px] place-items-center rounded-lg bg-meel p-3">
          {card ? (
            <img src={card.url} alt="Voorbeeld van het deelkaartje" className="max-h-[52vh] w-auto max-w-full rounded-md shadow-zacht" />
          ) : error ? (
            <p className="text-sm text-feest-ink">{error}</p>
          ) : (
            <p className="text-sm text-muted">Kaartje maken…</p>
          )}
        </div>
        <p className="text-xs text-muted">Voor de groepsapp of Instagram. Het kaartje toont de stand van vandaag.</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button ref={closeRef} type="button" className={ghostButton} onClick={onClose}>
            Sluiten
          </button>
          <div className="flex gap-1.5">
            {canShare ? (
              <button type="button" className={ghostButton} disabled={!card} onClick={save}>
                Opslaan
              </button>
            ) : null}
            <button type="button" className={primaryButton} disabled={!card} onClick={() => void (canShare ? share() : save())}>
              {canShare ? "Delen" : "Opslaan als afbeelding"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
