import { useState } from "react";
import { backend, DEMO_CODES, type Session } from "../../data/backend";
import { Card, Notice, fieldLabel, inputClass, primaryButton, textAction, toast } from "../../components/ui";
import { appLink } from "../../lib/router";

export function LoginPage({ onLogin }: { onLogin: (session: Session) => void }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Vul je naam in, zodat zichtbaar is wie wat heeft gedaan.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const role = await backend.login(code);
      onLogin({ code: code.trim(), role, name: name.trim() });
      toast(`Welkom, ${name.trim().split(" ")[0]}!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto grid w-full max-w-md gap-4 pt-2">
      <h1 className="text-center font-display text-[38px] uppercase leading-none tracking-wide text-krent">
        Wie staat er <span className="text-feest">achter de pan</span>?
      </h1>
      <Card>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className={fieldLabel}>Je naam</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Voor- en achternaam" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className={fieldLabel}>Toegangscode</span>
            <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} type="password" autoComplete="current-password" />
            <span className="text-xs text-muted">De code van je rol krijg je van de organisatie.</span>
          </label>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <button type="submit" className={primaryButton} disabled={busy}>
            {busy ? "Controleren…" : "Inloggen"}
          </button>
        </div>
      </Card>
      {backend.kind === "demo" ? (
        <Notice tone="info">
          Demo-codes: beheer <code>{DEMO_CODES.beheer}</code>, inpakker <code>{DEMO_CODES.inpakker}</code>, bezorger <code>{DEMO_CODES.bezorger}</code>.
        </Notice>
      ) : null}
      <p className="text-center text-sm text-krent">
        Wil je meehelpen?{" "}
        <a className={textAction} href={appLink("/aanmelden")}>
          Meld je aan als vrijwilliger
        </a>
      </p>
    </form>
  );
}
