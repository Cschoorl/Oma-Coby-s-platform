import { useEffect, useState } from "react";
import { backend, type Session } from "./data/backend";
import type { DashboardState, Role } from "./types/dashboard";
import { AgendaPage } from "./features/agenda/AgendaPage";
import { LoginPage } from "./features/auth/LoginPage";
import { CostsPage } from "./features/costs/CostsPage";
import { OrdersAdminPage } from "./features/orders/OrdersAdminPage";
import { PackingPage } from "./features/packing/PackingPage";
import { BakeryPage } from "./features/bakery/BakeryPage";
import { PackingSlipsPage } from "./features/packing/PackingSlipsPage";
import { CourierPage } from "./features/routes/CourierPage";
import { RoutesPage } from "./features/routes/RoutesPage";
import { StatsPage } from "./features/stats/StatsPage";
import { SignupPage } from "./features/volunteers/SignupPage";
import { VolunteersPage } from "./features/volunteers/VolunteersPage";
import { BusinessAdminPage } from "./features/business/BusinessAdminPage";
import { BusinessOrderPage } from "./features/business/BusinessOrderPage";
import { Notice, Skeleton, Toaster } from "./components/ui";
import { Avatar, setAvatarRoster } from "./components/Avatar";
import logoUrl from "./assets/logo-oliebollenbar.svg";
import { CONTACT_EMAIL, applyAgenda } from "./config";
import { navigate, useRoute } from "./lib/router";
import { loadSession, saveSession } from "./lib/session";
import { clearSnapshots, useDashboard } from "./lib/useDashboard";

interface NavItem {
  path: string;
  label: string;
  /** One line under the page title. */
  description: string;
  roles: Role[];
  /** Reachable by link only (not in the menu). */
  hidden?: boolean;
  /** Other name and line for inpakkers and bezorgers. */
  asVolunteer?: { label: string; description: string };
}

const NAV: NavItem[] = [
  { path: "/orders", label: "Bestellingen", description: "Opmerkingen beoordelen en klantbevestigingen versturen.", roles: ["beheer"] },
  { path: "/zakelijk", label: "Zakelijk", description: "Aanvragen van het zakelijke bestelformulier nakijken, bevestigen of afwijzen.", roles: ["beheer"] },
  { path: "/tussenstand", label: "Tussenstand", description: "Bestellingen, oliebollen en omzet tegenover eerdere jaren. Achter de discobal-knop: de discozaal.", roles: ["beheer"] },
  { path: "/agenda", label: "Agenda", description: "Waar nog plek is en wie er op een dag is.", roles: ["beheer"] },
  { path: "/inpakken", label: "Inpakken", description: "Pak een order, vink MET en ZONDER af, dan TOTAAL, en rond af.", roles: ["beheer", "inpakker"] },
  { path: "/routes", label: "Routes", description: "Bezorgers indelen, routes en kilometers berekenen en via WhatsApp delen.", roles: ["beheer"] },
  { path: "/vrijwilligers", label: "Vrijwilligers", description: "Wie kan wanneer: per vrijwilliger en per dag, met contactgegevens.", roles: ["beheer"] },
  { path: "/bakkerij", label: "Bakkerij", description: "De bestellijst voor morgen: hoeveel oliebollen de bakker moet maken, en naar de bakker sturen.", roles: ["beheer"] },
  { path: "/bezorger", label: "Bezorgen", description: "Je stops van vandaag, in de beste volgorde.", roles: ["bezorger"] },
  {
    path: "/kosten",
    label: "Kosten",
    description: "Bon declareren en de status volgen; beheer keurt goed en betaalt uit.",
    roles: ["beheer", "bezorger"],
    // Volunteers only hand in receipts; beheer also approves and pays.
    asVolunteer: { label: "Kosten indienen", description: "Maak een foto van je bon, dien hem in en volg de status." }
  },
  { path: "/pakbonnen", label: "Pakbonnen", description: "Per order een pakbon om te printen en bij de doos te leggen.", roles: ["beheer", "inpakker"], hidden: true }
];

/** Pages without login; a logged-in visitor can open them too. */
const PUBLIC = ["/aanmelden", "/bestellen"];

const HOME: Record<Role, string> = { beheer: "/orders", inpakker: "/inpakken", bezorger: "/bezorger" };

const roleLabel: Record<Role, string> = { beheer: "Beheer", inpakker: "Inpakker", bezorger: "Bezorger" };

/** One glyph per page for the phone menu grid. */
const menuGlyph: Record<string, string> = {
  "/inpakken": "▣",
  "/orders": "@",
  "/zakelijk": "Z",
  "/routes": "→",
  "/bezorger": "✓",
  "/tussenstand": "%",
  "/vrijwilligers": "♥",
  "/agenda": "#",
  "/kosten": "€"
};

function Brand() {
  return (
    <a href="#/" className="block shrink-0" aria-label="Oma Coby's Oliebollenbar, naar de startpagina">
      <img src={logoUrl} alt="Oma Coby's Oliebollenbar" className="h-auto w-28" />
    </a>
  );
}

function DemoPill() {
  if (backend.kind !== "demo") return null;
  return (
    <span className="rounded bg-gouwe px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-krent" title={backend.notice}>
      Demo
    </span>
  );
}

/** Everyone with a name in the dashboard: volunteers, packers, couriers and whoever is logged in. */
function rosterNames(state: DashboardState, me: string): string[] {
  return [
    me,
    ...state.volunteers.map((v) => v.name),
    ...Object.values(state.packing).flatMap((p) => [p.claimedBy, p.packedBy]),
    ...Object.values(state.meta).map((m) => m.courier),
    ...state.orders.map((o) => o.supplierName),
    ...Object.values(state.delivery).map((d) => d.deliveredBy)
  ];
}

function App() {
  const route = useRoute();
  const [session, setSession] = useState<Session | null>(loadSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const dashboard = useDashboard(session);

  // Each role's start page comes first in its menu; the rest keeps the NAV order.
  const allowed = session
    ? NAV.filter((item) => item.roles.includes(session.role))
        .sort((a, b) => Number(b.path === HOME[session.role]) - Number(a.path === HOME[session.role]))
        .map((item) => (item.asVolunteer && session.role !== "beheer" ? { ...item, ...item.asVolunteer } : item))
    : [];
  const current = allowed.find((item) => item.path === route.path);

  useEffect(() => {
    if (session && !PUBLIC.includes(route.path) && !current) navigate(HOME[session.role]);
  }, [session, route.path, current]);

  useEffect(() => setMenuOpen(false), [route.path]);

  function login(next: Session) {
    saveSession(next);
    setSession(next);
  }

  function logout() {
    clearSnapshots();
    saveSession(null);
    setSession(null);
  }

  // Pages without login (signup, login) get a simple centred layout.
  const simpleShell = (content: React.ReactNode, wide = false) => (
    <div className="min-h-screen bg-meel">
      <header className="border-b border-lijn bg-papier">
        <div className={`mx-auto flex h-16 items-center justify-between px-4 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
          <Brand />
          <DemoPill />
        </div>
      </header>
      <main className={`mx-auto grid grid-cols-[minmax(0,1fr)] gap-4 px-4 py-6 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>{content}</main>
      <Toaster />
    </div>
  );

  if (route.path === "/aanmelden") return simpleShell(<SignupPage />);
  if (route.path === "/bestellen") return simpleShell(<BusinessOrderPage />, true);
  if (!session) return simpleShell(<LoginPage onLogin={login} />);

  const { state, error, lastSync, saving, run } = dashboard;

  let page: React.ReactNode = null;
  // The signup options and targets follow the Agenda tab of the Sheet.
  if (state) applyAgenda(state.agenda);
  // Everyone the dashboard knows gets their own outfit; see components/Avatar.tsx.
  if (state) setAvatarRoster(rosterNames(state, session.name));
  if (state) {
    switch (current?.path) {
      case "/inpakken":
        page = <PackingPage state={state} session={session} run={run} />;
        break;
      case "/orders":
        page = <OrdersAdminPage state={state} session={session} run={run} />;
        break;
      case "/zakelijk":
        page = <BusinessAdminPage state={state} session={session} run={run} />;
        break;
      case "/routes":
        page = <RoutesPage state={state} session={session} run={run} isDemo={backend.kind === "demo"} />;
        break;
      case "/bezorger":
        page = <CourierPage state={state} session={session} run={run} name={route.params.get("naam")} date={route.params.get("datum")} />;
        break;
      case "/bakkerij":
        page = <BakeryPage state={state} session={session} run={run} />;
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
        page = <AgendaPage volunteers={state.volunteers} contactEmail={CONTACT_EMAIL} me={session.name} />;
        break;
    }
  }

  const menu = allowed.filter((item) => !item.hidden);
  const liveDot = error ? "bg-feest shadow-[0_0_0_3px_#fbe5dd]" : lastSync ? "bg-kerst shadow-[0_0_0_3px_#e7efd8]" : "bg-lijn-2";

  return (
    <div className="min-h-screen bg-meel">
      <header className="sticky top-0 z-30 border-b border-lijn bg-papier/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
          <Brand />
          <div className="flex items-center gap-3 text-xs text-muted">
            <DemoPill />
            <span className="inline-flex items-center gap-1.5" title={lastSync ? `Bijgewerkt ${lastSync.toLocaleTimeString("nl-NL")}` : undefined}>
              <span className={`inline-block h-2 w-2 rounded-full ${liveDot}`} />
              <span className="hidden sm:inline">{saving ? "Opslaan…" : error ? "Geen verbinding" : lastSync ? "Live" : state ? "Bijwerken…" : "Verbinden…"}</span>
            </span>
            <span className="hidden items-center gap-2 text-krent sm:inline-flex">
              <Avatar name={session.name} size={28} />
              <span>
                <b>{session.name}</b> · {roleLabel[session.role]}
              </span>
            </span>
            <button type="button" className="hidden rounded-md px-2 py-1 font-bold text-oliebol underline decoration-lijn-2 underline-offset-4 hover:text-krent sm:inline" onClick={logout}>
              Uitloggen
            </button>
            <button
              type="button"
              className="rounded-md bg-vul px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-krent sm:hidden"
              aria-expanded={menuOpen}
              aria-controls="menu-raster"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? "Sluiten" : "Menu"}
            </button>
          </div>
        </div>
        {/* Laptop: tabs. Telefoon: een raster achter de Menu-knop, nooit zijwaarts scrollen. */}
        <nav className="mx-auto hidden max-w-6xl flex-wrap gap-x-1 px-3 sm:flex" aria-label="Hoofdmenu">
          {menu.map((item) => (
            <a
              key={item.path}
              href={`#${item.path}`}
              aria-current={current?.path === item.path ? "page" : undefined}
              className={`border-b-[3px] px-2.5 pb-2 pt-2.5 text-xs font-bold uppercase tracking-[0.08em] transition ${
                current?.path === item.path ? "border-feest text-krent" : "border-transparent text-muted hover:text-krent"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
        {menuOpen ? (
          <nav id="menu-raster" className="grid grid-cols-3 gap-1.5 px-3.5 pb-3.5 sm:hidden" aria-label="Hoofdmenu">
            {menu.map((item) => (
              <a
                key={item.path}
                href={`#${item.path}`}
                aria-current={current?.path === item.path ? "page" : undefined}
                className={`grid min-h-[64px] justify-items-center gap-0.5 rounded-kaart px-1 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] ${
                  current?.path === item.path ? "bg-gouwe-100 text-krent" : "bg-vul text-krent"
                }`}
              >
                <span className="font-display text-[22px] leading-6 tracking-normal text-feest">{menuGlyph[item.path] ?? "•"}</span>
                {item.label}
              </a>
            ))}
            <button type="button" className="grid min-h-[64px] justify-items-center gap-0.5 rounded-kaart bg-vul px-1 py-2.5 text-[11px] font-bold uppercase tracking-[0.06em] text-krent" onClick={logout}>
              <span className="font-display text-[22px] leading-6 tracking-normal text-feest">×</span>
              Uitloggen
            </button>
            <p className="col-span-3 flex items-center justify-center gap-1.5 pt-1 text-xs text-muted">
              <Avatar name={session.name} size={22} />
              Ingelogd als <b className="text-krent">{session.name}</b> · {roleLabel[session.role]}
            </p>
          </nav>
        ) : null}
      </header>

      {/* minmax(0, 1fr): wide tables scroll inside their card instead of widening the page on phones. */}
      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-5 px-4 py-6">
        {current ? (
          <div className="grid gap-1 print:hidden">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">#{current.path}</p>
            <h1 className="font-display text-[40px] uppercase leading-none tracking-wide text-krent">{current.label}</h1>
            <p className="text-sm text-oliebol">{current.description}</p>
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
        {!state && !error ? <Skeleton /> : null}
        {page}
        {backend.kind === "demo" ? <p className="pt-2 text-center text-xs text-muted">Demo-modus: {backend.notice}</p> : null}
        <p className="text-center text-[10px] text-muted/70 print:hidden">
          Versie {new Date(__BUILD_TIME__).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </p>
      </main>
      <Toaster />
    </div>
  );
}

export default App;
