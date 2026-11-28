import { useEffect, useState } from "react";
import { backend } from "../../data/backend";
import type { PublicWall } from "../../types/wallOfFame";
import { Notice, OliebolLoader, Skeleton, todayIso } from "../../components/ui";
import { WallOfFame } from "./WallOfFame";
import { seasonOf } from "./wall";

/**
 * Openbaar: #/wall-of-fame. Met ?embed=1 zonder kop en marges, voor een iframe op de zakelijke pagina van de
 * website (sectie 8 van het bouwplan). Laat alleen zien wat de openbare API stuurt: geen bedragen.
 */
export function WallOfFamePage({ embed = false }: { embed?: boolean }) {
  const [wall, setWall] = useState<PublicWall | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    backend
      .getWallOfFame()
      .then((w) => live && setWall(w))
      .catch((err) => live && setError(err instanceof Error ? err.message : String(err)));
    return () => {
      live = false;
    };
  }, []);

  // Without a wall the page still shows the café wall with the invitation: never a blank spot on the website.
  if (error) {
    return (
      <div className="grid gap-3">
        {embed ? null : <Notice tone="error">De wall of fame laadt nu niet. Probeer het zo nog eens. ({error})</Notice>}
        <WallOfFame wall={{ season: seasonOf(todayIso()), entries: [] }} embed={embed} today={todayIso()} />
      </div>
    );
  }
  if (!wall) {
    return (
      <div className="grid gap-3">
        <Skeleton lines={4} />
        <OliebolLoader />
      </div>
    );
  }
  return <WallOfFame wall={wall} embed={embed} today={todayIso()} />;
}
