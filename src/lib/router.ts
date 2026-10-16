import { useEffect, useState } from "react";

export interface Route {
  path: string;
  params: URLSearchParams;
}

function parse(): Route {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = hash.split("?");
  return { path: path || "/", params: new URLSearchParams(query) };
}

/** Hash routing, so every page also works on GitHub Pages without server rewrites. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
}

/** Absolute link to a page of this app, e.g. for WhatsApp messages. */
export function appLink(path: string): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}#${path}`;
}
