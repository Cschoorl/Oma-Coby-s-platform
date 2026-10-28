import { formatNumber } from "../../components/ui";
import { OLIEBOLLEN_PER_OUDJE } from "../../config";
import logoUrl from "../../assets/logo-oliebollenbar.svg";
import { cardDancerSvgs } from "./Discozaal";

export type CardFormat = "post" | "story";

export interface StandData {
  /** ISO date of the stand, e.g. "2026-12-22". */
  date: string;
  /** Oliebollen sold this season so far. */
  oliebollen: number;
  /** The same period last season, to compare with; left out when there is nothing to compare. */
  previous?: { year: number; now: number; then: number };
}

const SIZE: Record<CardFormat, [number, number]> = { post: [1080, 1350], story: [1080, 1920] };
const C = { meel: "#f9f3d9", papier: "#fffdf6", krent: "#261f1f", oliebol: "#5c4238", feest: "#d05438", kerst: "#69873c", muted: "#6d5a4f" };

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

/** Arrow in a circle: up and to the right when it went better, down and to the left when it went less. */
function drawArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, up: boolean, color: string, tint: string) {
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.arc(cx, cy, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(up ? 0 : Math.PI);
  ctx.strokeStyle = color;
  ctx.lineWidth = 12;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-22, 22);
  ctx.lineTo(22, -22);
  ctx.moveTo(-6, -22);
  ctx.lineTo(22, -22);
  ctx.lineTo(22, 6);
  ctx.stroke();
  ctx.restore();
}

/**
 * The stand as a share card: how many oudjes are dancing, how many oliebollen that took,
 * and how it compares with last season. Post is 4:5, Story is 9:16.
 */
export async function drawStandCard(data: StandData, format: CardFormat): Promise<Blob> {
  try {
    return await render(data, format, true);
  } catch {
    // Some browsers refuse SVG drawings on a canvas they export; then the card goes without them.
    return render(data, format, false);
  }
}

async function render(data: StandData, format: CardFormat, withDrawings: boolean): Promise<Blob> {
  // Arvo for the numbers: canvas cannot switch on lining figures, and Vollkorn draws old-style ones.
  await Promise.all([document.fonts.load('400 120px "VTC SuperMarket"'), document.fonts.load("700 80px Arvo"), document.fonts.load("400 30px Arvo")]);
  const [W, H] = SIZE[format];
  const story = format === "story";
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Delen wordt niet ondersteund in deze browser.");

  const pad = 96;
  const left = pad;
  const right = W - pad;
  const oudjes = Math.floor(data.oliebollen / OLIEBOLLEN_PER_OUDJE);

  ctx.fillStyle = C.meel;
  ctx.fillRect(0, 0, W, H);

  // Head: date and title.
  const day = new Date(`${data.date}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  ctx.fillStyle = C.muted;
  ctx.font = "700 30px Arvo";
  ctx.letterSpacing = "5px";
  ctx.fillText(`TUSSENSTAND · ${day.toUpperCase()}`, left, pad + 30);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = C.krent;
  ctx.font = '400 110px "VTC SuperMarket", Impact, sans-serif';
  ctx.fillText("DE DISCOZAAL", left, pad + 150);

  // The number of oudjes, big.
  let y = pad + (story ? 470 : 400);
  ctx.fillStyle = C.feest;
  ctx.font = "700 230px Arvo";
  ctx.fillText(formatNumber(oudjes), left - 8, y);
  y += 84;
  ctx.fillStyle = C.krent;
  ctx.font = '400 72px "VTC SuperMarket", Impact, sans-serif';
  ctx.fillText(oudjes === 1 ? "OUDJE OP DE DANSVLOER" : "OUDJES OP DE DANSVLOER", left, y);
  y += 70;
  ctx.fillStyle = C.oliebol;
  ctx.font = "400 40px Arvo";
  ctx.fillText(`dankzij ${formatNumber(data.oliebollen)} verkochte oliebollen`, left, y);

  // Compared with last season: arrow up-right in green, or down-left in red.
  y += story ? 110 : 80;
  const boxH = 170;
  ctx.fillStyle = C.papier;
  roundRect(ctx, left, y, right - left, boxH, 24);
  ctx.fill();
  const p = data.previous;
  if (p && p.then > 0) {
    const pct = Math.round(((p.now - p.then) / p.then) * 100);
    const up = pct >= 0;
    drawArrow(ctx, left + 100, y + boxH / 2, up, up ? C.kerst : C.feest, up ? "#e7efd8" : "#fbe5dd");
    ctx.fillStyle = up ? "#3c561b" : "#9a3219";
    ctx.font = "700 84px Arvo";
    ctx.fillText(`${pct > 0 ? "+" : pct < 0 ? "−" : "±"}${Math.abs(pct)}%`, left + 196, y + 92);
    ctx.fillStyle = C.muted;
    ctx.font = "400 30px Arvo";
    ctx.fillText(`t.o.v. ${p.year}, zelfde periode (${formatNumber(p.then)} oliebollen)`, left + 196, y + 136, right - left - 220);
  } else {
    ctx.fillStyle = C.muted;
    ctx.font = "400 34px Arvo";
    ctx.fillText("Nog geen cijfers van vorig jaar om mee te vergelijken.", left + 40, y + 96, right - left - 80);
  }

  // A row of dancing oudjes.
  const footY = H - pad;
  if (withDrawings) {
    const count = 7;
    const imgs = await Promise.all(cardDancerSvgs(count).map((svg) => loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)));
    const w = (right - left) / count;
    const h = w * (92 / 60);
    const rowY = footY - 90 - h;
    ctx.fillStyle = "rgba(92, 66, 56, 0.08)";
    ctx.fillRect(0, rowY + h - 6, W, 4);
    imgs.forEach((img, i) => ctx.drawImage(img, left + i * w, rowY, w, h));
  }

  // Logo and address.
  try {
    const logo = await loadImage(logoUrl);
    const lw = 240;
    ctx.drawImage(logo, left, footY - (logo.height / logo.width) * lw, lw, (logo.height / logo.width) * lw);
  } catch {
    ctx.fillStyle = C.oliebol;
    ctx.font = "700 30px Arvo";
    ctx.fillText("Oma Coby's Oliebollenbar", left, footY);
  }
  ctx.fillStyle = C.muted;
  ctx.font = "400 26px Arvo";
  ctx.textAlign = "right";
  ctx.fillText("omacobysoliebollenbar.nl", right, footY);
  ctx.textAlign = "left";

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Het kaartje maken lukte niet.");
  return blob;
}

export function cardFileName(date: string, format: CardFormat): string {
  return `tussenstand-${date}-${format}.png`;
}
