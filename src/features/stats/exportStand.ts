import { OLIEBOL_SVG, formatEuro, formatNumber } from "../../components/ui";
import { GOAL_OLIEBOLLEN, OLIEBOLLEN_PER_OUDJE } from "../../config";
import logoUrl from "../../assets/logo-oliebollenbar.svg";

export interface StandData {
  /** ISO date of the stand, e.g. "2026-12-22". */
  date: string;
  oliebollen: number;
  orders: number;
  revenue: number | null;
  revenueIsEstimate: boolean;
  /** e.g. "+9% t.o.v. 2025"; left out when there is nothing to compare with. */
  comparison?: string;
}

const W = 1080;
const H = 1350;
const C = { meel: "#f9f3d9", papier: "#fffdf6", krent: "#261f1f", oliebol: "#5c4238", feest: "#d05438", kerst: "#69873c", gouwe: "#dcc05d", muted: "#6d5a4f", vul: "rgba(92, 66, 56, 0.08)" };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Afbeelding laden mislukt."));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the stand of the day as a 1080 × 1350 image in the house style and offers it as a download. */
export async function exportStand(data: StandData): Promise<void> {
  await Promise.all([
    document.fonts.load("400 72px Bangers"),
    document.fonts.load("700 200px Arvo"),
    document.fonts.load("700 26px Arvo"),
    document.fonts.load("400 26px Arvo")
  ]);
  const [logo, bol] = await Promise.all([loadImage(logoUrl), loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(OLIEBOL_SVG.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" '))}`)]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Exporteren wordt niet ondersteund in deze browser.");

  ctx.fillStyle = C.meel;
  ctx.fillRect(0, 0, W, H);

  // The colour strip from the brand book.
  const strip: Array<[string, number]> = [[C.krent, 0.8], [C.oliebol, 1.2], [C.feest, 1.6], [C.kerst, 1.4], [C.gouwe, 1]];
  const total = strip.reduce((s, [, w]) => s + w, 0);
  let sx = 0;
  for (const [color, w] of strip) {
    ctx.fillStyle = color;
    ctx.fillRect(sx, 0, (w / total) * W, 14);
    sx += (w / total) * W;
  }

  const pad = 80;
  const logoW = 300;
  ctx.drawImage(logo, pad, 70, logoW, (logo.height / logo.width) * logoW);

  const day = new Date(`${data.date}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  ctx.fillStyle = C.muted;
  ctx.font = "700 24px Arvo";
  ctx.letterSpacing = "4px";
  ctx.fillText(`TUSSENSTAND · ${day.toUpperCase()}`, pad, 250);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = C.krent;
  ctx.font = "400 76px Bangers";
  ctx.fillText("OLIEBOLLEN VERKOCHT", pad, 340);

  // Arvo, not Vollkorn: canvas cannot switch on lining figures, and Vollkorn draws old-style ones.
  ctx.font = "700 200px Arvo";
  ctx.fillText(formatNumber(data.oliebollen), pad - 6, 560);

  const oudjes = Math.floor(data.oliebollen / OLIEBOLLEN_PER_OUDJE);
  ctx.font = "400 64px Bangers";
  const eq = "= ";
  const num = formatNumber(oudjes);
  const tail = ` ${oudjes === 1 ? "OUDJE" : "OUDJES"} OP DE DANSVLOER`;
  ctx.fillText(eq, pad, 660);
  let x = pad + ctx.measureText(eq).width;
  ctx.fillStyle = C.feest;
  ctx.fillText(num, x, 660);
  x += ctx.measureText(num).width;
  ctx.fillStyle = C.krent;
  ctx.fillText(tail, x, 660);

  // Progress towards the goal.
  const barY = 730;
  const barW = W - pad * 2;
  const pct = Math.min(1, data.oliebollen / GOAL_OLIEBOLLEN);
  ctx.fillStyle = C.vul;
  roundRect(ctx, pad, barY, barW, 36, 18);
  ctx.fill();
  if (pct > 0) {
    const grad = ctx.createLinearGradient(pad, 0, pad + barW, 0);
    grad.addColorStop(0, C.gouwe);
    grad.addColorStop(1, C.feest);
    ctx.fillStyle = grad;
    roundRect(ctx, pad, barY, Math.max(36, barW * pct), 36, 18);
    ctx.fill();
  }
  ctx.fillStyle = C.muted;
  ctx.font = "400 26px Arvo";
  ctx.fillText(`${Math.round(pct * 100)}% van het doel: ${formatNumber(GOAL_OLIEBOLLEN)} oliebollen = ${formatNumber(GOAL_OLIEBOLLEN / OLIEBOLLEN_PER_OUDJE)} oudjes naar de Gouwe Ouwe-avond`, pad, barY + 80);

  // Three key numbers on a paper card.
  const cardY = 880;
  ctx.fillStyle = C.papier;
  roundRect(ctx, pad, cardY, barW, 190, 20);
  ctx.fill();
  const cells: Array<[string, string]> = [
    ["BESTELLINGEN", formatNumber(data.orders)],
    [data.revenueIsEstimate ? "OMZET (SCHATTING)" : "OMZET", data.revenue === null ? "—" : formatEuro(data.revenue)],
    ["T.O.V. VORIG JAAR", data.comparison ?? "—"]
  ];
  cells.forEach(([label, value], i) => {
    const cx = pad + 40 + i * (barW / 3);
    ctx.fillStyle = C.muted;
    ctx.font = "700 20px Arvo";
    ctx.letterSpacing = "3px";
    ctx.fillText(label, cx, cardY + 62);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = C.krent;
    ctx.font = "700 56px Arvo";
    ctx.fillText(value, cx, cardY + 140, barW / 3 - 60);
  });

  // The oliebol, tilted, and the slogan.
  ctx.save();
  ctx.translate(W - pad - 120, H - 190);
  ctx.rotate(-0.25);
  ctx.drawImage(bol, -110, -110, 220, 220);
  ctx.restore();
  ctx.fillStyle = C.krent;
  ctx.font = "400 54px Bangers";
  ctx.fillText("MET 10 OLIEBOLLEN LAAT JE", pad, H - 200);
  ctx.fillText("1 OUDJE", pad, H - 140);
  ctx.fillStyle = C.feest;
  ctx.fillText("ROCK EN ROLLEN.", pad + ctx.measureText("1 OUDJE ").width, H - 140);
  ctx.fillStyle = C.muted;
  ctx.font = "400 24px Arvo";
  ctx.fillText("omacobysoliebollenbar.nl", pad, H - 80);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Exporteren mislukt.");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tussenstand-${data.date}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
