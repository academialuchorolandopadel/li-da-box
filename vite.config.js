import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Cambiá "padel-app" por el nombre exacto de tu repositorio en GitHub
export default defineConfig({
  plugins: [react()],
  base: "/li-da-box/",   // ← debe coincidir con el nombre del repo
});
