import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** GitHub project pages need `/<repo>/`. Set `VITE_BASE_PATH` in CI; locally defaults to `/`. */
function appBase(): string {
  const raw = process.env.VITE_BASE_PATH?.trim();
  if (!raw || raw === "/") return "/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}

export default defineConfig({
  base: appBase(),
  plugins: [react()],
});
