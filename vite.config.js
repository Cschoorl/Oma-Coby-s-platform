import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
/** GitHub project pages need `/<repo>/`. Set `VITE_BASE_PATH` in CI; locally defaults to `/`. */
function appBase() {
    var _a;
    var raw = (_a = process.env.VITE_BASE_PATH) === null || _a === void 0 ? void 0 : _a.trim();
    if (!raw || raw === "/")
        return "/";
    return raw.endsWith("/") ? raw : "".concat(raw, "/");
}
export default defineConfig({
    base: appBase(),
    plugins: [react()],
});
