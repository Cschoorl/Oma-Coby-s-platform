import { useEffect, useState } from "react";
import { backend, type Session } from "./data/backend";
import type { Role } from "./types/dashboard";
import { AgendaPage } from "./features/agenda/AgendaPage";
import { LoginPage } from "./features/auth/LoginPage";
import { CostsPage } from "./features/costs/CostsPage";
import { OrdersAdminPage } from "./features/orders/OrdersAdminPage";
import { PackingPage } from "./features/packing/PackingPage";
import { PackingSlipsPage } from "./features/packing/PackingSlipsPage";
import { CourierPage } from "./features/routes/CourierPage";
import { RoutesPage } from "./features/routes/RoutesPage";
import { StatsPage } from "./features/stats/StatsPage";
import { SignupPage } from "./features/volunteers/SignupPage";
import { VolunteersPage } from "./features/volunteers/VolunteersPage";
import { Notice } from "./components/ui";
import { CONTACT_EMAIL, applyAgenda } from "./config";
import { navigate, useRoute } from "./lib/router";
import { loadSession, saveSession } from "./lib/session";
import { useDashboard } from "./lib/useDashboard";

interface NavItem {
  path: string;
  label: string;
  /** One line under the page title. */
  description: string;
  roles: Role[];
  /** Reachable by link only (not in the menu). */
  hidden?: boolean;
}

const NAV: NavItem[] = [
  { path: "/inpakken", label: "Inpakken", description: "Claim een order, vink MET en ZONDER af, dan GEHEEL, en rond af.", roles: ["beheer", "inpakker"] },
  { path: "/orders", label: "Bestellingen", description: "Opmerkingen beoordelen en klantbevestigingen versturen.", roles: ["beheer"] },
  { path: "/routes", label: "Routes", description: "Bezorgers indelen, routes en kilometers berekenen en via WhatsApp delen.", roles: ["beheer"] },
  { path: "/bezorger", label: "Bezorgen", description: "Je stops van vandaag, in de beste volgorde.", roles: ["beheer", "bezorger"] },
  { path: "/tussenstand", label: "Tussenstand", description: "Bestellingen, oliebollen en omzet tegenover eerdere jaren.", roles: ["beheer"] },
  { path: "/vrijwilligers", label: "Vrijwilligers", description: "Aanmeldingen en bezetting per dag.", roles: ["beheer"] },
  { path: "/agenda", label: "Agenda", description: "Wie wanneer beschikbaar is.", roles: ["beheer", "inpakker", "bezorger"] },
  { path: "/kosten", label: "Kosten", description: "Bon declareren en de status volgen; beheer keurt goed en betaalt uit.", roles: ["beheer", "inpakker", "bezorger"] },
  { path: "/pakbonnen", label: "Pakbonnen", description: "Per order een pakbon om te printen en bij de doos te leggen.", roles: ["beheer", "inpakker"], hidden: true }
];

const HOME: Record<Role, string> = { beheer: "/inpakken", inpakker: "/inpakken", bezorger: "/bezorger" };

const roleLabel: Record<Role, string> = { beheer: "Beheer", inpakker: "Inpakker", bezorger: "Bezorger" };

function Brand() {
  return (
    <a href="#/" className="flex items-center gap-2.5">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-coby-600 text-sm font-bold text-white">OC</span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold text-stone-900">Oma Coby</span>
        <span className="block text-xs text-stone-500">Oliebollen platform</span>
      </span>
    </a>
  );
}

function DemoPill() {
  if (backend.kind !== "demo") return null;
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900" title={backend.notice}>
      Demo
    </span>
  );
}

function App() {
  const route = useRoute();
  const [session, setSession] = useState<Session | null>(loadSession);
  const dashboard = useDashboard(session);

  const allowed = session ? NAV.filter((item) => item.roles.includes(session.role)) : [];
  const current = allowed.find((item) => item.path === route.path);

  useEffect(() => {
    if (session && route.path !== "/aanmelden" && !current) navigate(HOME[session.role]);
  }, [session, route.path, current]);

  function login(next: Session) {
    saveSession(next);
    setSession(next);
  }

  function logout() {
    saveSession(null);
    setSession(null);
  }

  // Pages without login (signup, login) get a simple centred layout.
  const simpleShell = (content: React.ReactNode) => (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <Brand />
          <DemoPill />
        </div>
      </header>
      <main className="mx-auto grid max-w-3xl gap-4 px-4 py-6">{content}</main>
    </div>
  );

  if (route.path === "/aanmelden") return simpleShell(<SignupPage />);
  if (!session) return simpleShell(<LoginPage onLogin={login} />);

  const { state, error, lastSync, run } = dashboard;

  let page: React.ReactNode = null;
  // The signup options and targets follow the Agenda tab of the Sheet.
  if (state) applyAgenda(state.agenda);
  if (state) {
    switch (current?.path) {
      case "/inpakken":
        page = <PackingPage state={state} session={session} run={run} />;
        break;
      case "/orders":
        page = <OrdersAdminPage state={state} session={session} run={run} />;
        break;
      case "/routes":
        page = <RoutesPage state={state} session={session} run={run} isDemo={backend.kind === "demo"} />;
        break;
      case "/bezorger":
        page = <CourierPage state={state} session={session} run={run} name={route.params.get("naam")} date={route.params.get("datum")} />;
        break;
      case "/tussenstand":
        page = <StatsPage state={state} />;
        break;
      case "/kosten":
        page = <CostsPage state={state} session={session} run={run} />;
        break;
      case "/vrijwilligers":
        page = <VolunteersPage state={state} session={session} run={run} />;
        break;
      case "/pakbonnen":
        page = <PackingSlipsPage state={state} date={route.params.get("datum")} />;
        break;
      case "/agenda":
        page = <AgendaPage orders={state.orders} volunteers={state.volunteers} contactEmail={CONTACT_EMAIL} />;
        break;
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Brand />
          <div className="flex items-center gap-3 text-xs text-stone-600">
            <DemoPill />
            <span className="hidden items-center gap-1.5 sm:inline-flex" title={lastSync ? `Bijgewerkt ${lastSync.toLocaleTimeString("nl-NL")}` : undefined}>
              <span className={`inline-block h-2 w-2 rounded-full ${error ? "bg-red-500" : lastSync ? "bg-emerald-500" : "bg-stone-300"}`} />
              {error ? "Geen verbinding" : lastSync ? "Live" : "Verbinden…"}
            </span>
            <span className="hidden text-stone-300 sm:inline">|</span>
            <span className="text-stone-800">
              <span className="font-semibold">{session.name}</span>
              <span className="hidden text-stone-500 sm:inline"> · {roleLabel[session.role]}</span>
            </span>
            <button type="button" className="rounded-md px-2 py-1 font-semibold text-stone-600 hover:bg-stone-100 hover:text-stone-900" onClick={logout}>
              Uitloggen
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-2 sm:px-4" aria-label="Hoofdmenu">
          {allowed.filter((item) => !item.hidden).map((item) => (
            <a
              key={item.path}
              href={`#${item.path}`}
              aria-current={current?.path === item.path ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm transition ${
                current?.path === item.path ? "border-coby-600 font-semibold text-stone-900" : "border-transparent text-stone-600 hover:text-stone-900"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-6">
        {current ? (
          <div className="print:hidden">
            <h1 className="text-xl font-semibold text-stone-900 sm:text-2xl">{current.label}</h1>
            <p className="mt-0.5 text-sm text-stone-600">{current.description}</p>
          </div>
        ) : null}
        {error && !state ? (
          <Notice tone="error">
            {error}
            {/toegang/i.test(error) ? (
              <>
                {" "}
                <button type="button" className="font-semibold underline" onClick={logout}>
                  Opnieuw inloggen
                </button>
              </>
            ) : null}
          </Notice>
        ) : null}
        {error && state ? <Notice tone="warning">Verbinding verbroken, je ziet de laatst bekende stand. ({error})</Notice> : null}
        {!state && !error ? <p className="text-sm text-stone-500">Gegevens laden…</p> : null}
        {page}
        {backend.kind === "demo" ? <p className="pt-2 text-center text-xs text-stone-500">Demo-modus: {backend.notice}</p> : null}
      </main>
    </div>
  );
}

export default App;
