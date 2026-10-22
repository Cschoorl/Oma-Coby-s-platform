import { formatNumber } from "../../components/ui";
import { GOAL_OLIEBOLLEN, OLIEBOLLEN_PER_OUDJE } from "../../config";
import logoUrl from "../../assets/logo-oliebollenbar.svg";

export type CardFormat = "post" | "story";

export interface StandData {
  /** ISO date of the stand, e.g. "2026-12-22". */
  date: string;
  oliebollen: number;
  /** Oliebollen added up per day this season, oldest first; drawn as the "route". */
  curve: number[];
}

const SIZE: Record<CardFormat, [number, number]> = { post: [1080, 1350], story: [1080, 1920] };
const C = { meel: "#f9f3d9", krent: "#261f1f", oliebol: "#5c4238", feest: "#d05438", muted: "#6d5a4f", line: "rgba(92, 66, 56, 0.14)" };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Afbeelding laden mislukt."));
    img.src = src;
  });
}

/**
 * The stand as a minimal share card, like a Strava activity card: date and title, the season as one line,
 * three numbers in a row, a thin line to the goal, and the logo. Post is 4:5, Story is 9:16.
 */
export async function drawStandCard(data: StandData, format: CardFormat): Promise<Blob> {
  // Arvo for the numbers: canvas cannot switch on lining figures, and Vollkorn draws old-style ones.
  await Promise.all([document.fonts.load("400 120px Bangers"), document.fonts.load("700 80px Arvo"), document.fonts.load("400 30px Arvo")]);
  const [W, H] = SIZE[format];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Delen wordt niet ondersteund in deze browser.");

  const pad = 96;
  const left = pad;
  const right = W - pad;
  const oudjes = Math.floor(data.oliebollen / OLIEBOLLEN_PER_OUDJE);
  const pct = Math.min(100, Math.round((data.oliebollen / GOAL_OLIEBOLLEN) * 100));

  ctx.fillStyle = C.meel;
  ctx.fillRect(0, 0, W, H);

  const day = new Date(`${data.date}T12:00:00`).toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  ctx.fillStyle = C.muted;
  ctx.font = "700 30px Arvo";
  ctx.letterSpacing = "5px";
  ctx.fillText(`TUSSENSTAND · ${day.toUpperCase()}`, left, pad + 30);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = C.krent;
  ctx.font = "400 120px Bangers";
  ctx.fillText("DE DISCOZAAL", left, pad + 160);

  // The season so far as a route: start ring, line, end dot.
  const top = pad + 240;
  const bottom = format === "story" ? H - 760 : H - 590;
  const pts = data.curve.length > 1 ? data.curve : [0, data.oliebollen];
  const max = Math.max(1, ...pts);
  const px = (i: number) => left + (i / (pts.length - 1)) * (right - left);
  const py = (v: number) => bottom - (v / max) * (bottom - top);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();
  ctx.strokeStyle = C.feest;
  ctx.lineWidth = 12;
  ctx.beginPath();
  pts.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
  ctx.stroke();
  ctx.fillStyle = C.meel;
  ctx.strokeStyle = C.krent;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(px(0), py(pts[0]), 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.feest;
  ctx.strokeStyle = C.meel;
  ctx.beginPath();
  ctx.arc(px(pts.length - 1), py(pts[pts.length - 1]), 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Three numbers in a row.
  const statsY = bottom + (format === "story" ? 170 : 150);
  const colW = (right - left) / 3;
  const stats: Array<[string, string]> = [["Oliebollen", formatNumber(data.oliebollen)], ["Oudjes", formatNumber(oudjes)], ["Van het doel", `${pct}%`]];
  stats.forEach(([label, value], i) => {
    const x = left + i * colW;
    ctx.fillStyle = C.muted;
    ctx.font = "400 30px Arvo";
    ctx.fillText(label, x, statsY);
    ctx.fillStyle = i === 1 ? C.feest : C.krent;
    ctx.font = "700 80px Arvo";
    ctx.fillText(value, x, statsY + 92, colW - 24);
  });

  // A thin line to the goal.
  const barY = statsY + 150;
  ctx.fillStyle = "rgba(92, 66, 56, 0.12)";
  ctx.fillRect(left, barY, right - left, 8);
  ctx.fillStyle = C.feest;
  ctx.fillRect(left, barY, Math.max(8, ((right - left) * pct) / 100), 8);
  ctx.fillStyle = C.muted;
  ctx.font = "400 26px Arvo";
  ctx.fillText(
    `Op weg naar ${formatNumber(GOAL_OLIEBOLLEN)} oliebollen = ${formatNumber(GOAL_OLIEBOLLEN / OLIEBOLLEN_PER_OUDJE)} oudjes naar de Gouwe Ouwe-avond`,
    left,
    barY + 52,
    right - left
  );

  // Logo and address.
  const footY = H - pad;
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
