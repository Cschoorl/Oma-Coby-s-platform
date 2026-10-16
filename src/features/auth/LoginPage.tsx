import { useState } from "react";
import { backend, DEMO_CODES, type Session } from "../../data/backend";
import { Card, Notice, SectionTitle, inputClass, primaryButton } from "../../components/ui";
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inloggen mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto grid w-full max-w-md gap-4">
      <Card>
        <SectionTitle title="Inloggen" subtitle="Vul je naam en de toegangscode van je rol in. Die krijg je van de organisatie." />
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Je naam</span>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Voor- en achternaam" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Toegangscode</span>
            <input className={inputClass} value={code} onChange={(e) => setCode(e.target.value)} type="password" autoComplete="current-password" />
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
      <p className="text-center text-sm text-stone-700">
        Wil je meehelpen?{" "}
        <a className="font-semibold text-coby-700 underline" href={appLink("/aanmelden")}>
          Meld je aan als vrijwilliger
        </a>
      </p>
    </form>
  );
}
