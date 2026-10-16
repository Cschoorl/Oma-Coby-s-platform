import { useEffect, useState } from "react";
import { backend, type Session } from "./data/backend";
import type { Role } from "./types/dashboard";
import { AgendaPage } from "./features/agenda/AgendaPage";
import { LoginPage } from "./features/auth/LoginPage";
import { CostsPage } from "./features/costs/CostsPage";
import { OrdersAdminPage } from "./features/orders/OrdersAdminPage";
import { PackingPage } from "./features/packing/PackingPage";
import { CourierPage } from "./features/routes/CourierPage";
import { RoutesPage } from "./features/routes/RoutesPage";
import { StatsPage } from "./features/stats/StatsPage";
import { SignupPage } from "./features/volunteers/SignupPage";
import { VolunteersPage } from "./features/volunteers/VolunteersPage";
import { Notice } from "./components/ui";
import { CONTACT_EMAIL } from "./config";
import { navigate, useRoute } from "./lib/router";
import { loadSession, saveSession } from "./lib/session";
import { useDashboard } from "./lib/useDashboard";

interface NavItem {
  path: string;
  label: string;
  roles: Role[];
}

const NAV: NavItem[] = [
  { path: "/inpakken", label: "Inpakken", roles: ["beheer", "inpakker"] },
  { path: "/orders", label: "Opmerkingen & bevestiging", roles: ["beheer"] },
  { path: "/routes", label: "Routes", roles: ["beheer"] },
  { path: "/bezorger", label: "Bezorgers", roles: ["beheer", "bezorger"] },
  { path: "/tussenstand", label: "Tussenstand", roles: ["beheer"] },
  { path: "/kosten", label: "Kosten", roles: ["beheer", "inpakker", "bezorger"] },
  { path: "/vrijwilligers", label: "Vrijwilligers", roles: ["beheer"] },
  { path: "/agenda", label: "Agenda", roles: ["beheer", "inpakker", "bezorger"] }
];

const HOME: Record<Role, string> = { beheer: "/inpakken", inpakker: "/inpakken", bezorger: "/bezorger" };

const roleLabel: Record<Role, string> = { beheer: "Beheer", inpakker: "Inpakker", bezorger: "Bezorger" };

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-coby-800 via-coby-700 to-coby-600 p-6 text-white shadow-2xl">
      <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 right-24 h-24 w-24 rounded-full bg-amber-200/20 blur-xl" />
      <p className="text-sm font-medium tracking-wide text-coby-100">Oma Coby's Oliebollenbar</p>
      <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Oliebollen Platform</h1>
      {children}
    </header>
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

  const shell = (content: React.ReactNode, nav?: React.ReactNode) => (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff8ed,_#ffe5be_52%,_#ffd296)] p-4 sm:p-6">
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Header>{nav}</Header>
        {content}
      </div>
    </main>
  );

  if (route.path === "/aanmelden") return shell(<SignupPage />);
  if (!session) return shell(<LoginPage onLogin={login} />);

  const { state, error, lastSync, run } = dashboard;

  const nav = (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-coby-100">
        <span>
          {session.name} · {roleLabel[session.role]}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-full ${error ? "bg-red-300" : "bg-emerald-300"}`} />
          {error ? "Geen verbinding" : lastSync ? `Live · ${lastSync.toLocaleTimeString("nl-NL")}` : "Verbinden…"}
        </span>
        <button type="button" className="underline decoration-white/40 underline-offset-2 hover:text-white" onClick={logout}>
          Uitloggen
        </button>
      </div>
      <nav className="mt-4 flex flex-wrap gap-2">
        {allowed.map((item) => (
          <a
            key={item.path}
            href={`#${item.path}`}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              current?.path === item.path ? "bg-white/20 text-white" : "bg-white/0 text-white/90 hover:bg-white/10"
            }`}
          >
            {item.label}
          </a>
        ))}
      </nav>
    </>
  );

  let page: React.ReactNode = null;
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
        page = <CourierPage state={state} name={route.params.get("naam")} date={route.params.get("datum")} />;
        break;
      case "/tussenstand":
        page = <StatsPage state={state} />;
        break;
      case "/kosten":
        page = <CostsPage state={state} session={session} run={run} />;
        break;
      case "/vrijwilligers":
        page = <VolunteersPage state={state} />;
        break;
      case "/agenda":
        page = <AgendaPage orders={state.orders} volunteers={state.volunteers} contactEmail={CONTACT_EMAIL} />;
        break;
    }
  }

  return shell(
    <>
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
      {!state && !error ? <Notice>Gegevens laden…</Notice> : null}
      {page}
      {backend.kind === "demo" ? (
        <Notice tone="info">
          <span className="font-semibold">Demo-modus.</span> {backend.notice}
        </Notice>
      ) : null}
    </>,
    nav
  );
}

export default App;
