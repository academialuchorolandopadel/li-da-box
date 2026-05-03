// ============================================================
//  api.js — Comunicación con Google Apps Script
//  Reemplazá APPS_SCRIPT_URL con la URL de tu deployment
// ============================================================

// 👇 REEMPLAZÁ esto con tu URL real de Google Apps Script
export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzoHozq_5m6Ov5rAMTIVTC5awXjKtGrs0xn5ub6K1gVjNiSJ2WBWOXItClbDNBJgnZB/exec";

async function get(action) {
  const res = await fetch(`${APPS_SCRIPT_URL}?action=${action}`, {
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  return res.json();
}

async function post(body) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    redirect: "follow",
    headers: { "Content-Type": "text/plain" }, // evita preflight CORS
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  return res.json();
}

// ── Exports ──────────────────────────────────────────────────

/** Retorna { jugadoras: [...], total } */
export const fetchTabla = () => get("getTabla");

/** Retorna { partidos: [...] } */
export const fetchFixture = () => get("getFixture");

/** Retorna { inscriptas: [...], fecha } */
export const fetchInscriptas = () => get("getInscriptas");

/** Retorna { etapa, fecha, nombre, temporada } */
export const fetchEtapaInfo = () => get("getEtapa");

/** Inscribir jugadora */
export const inscribirse = (nombre) =>
  post({ action: "inscribirse", nombre });

/** Cancelar inscripción */
export const desinscribir = (nombre) =>
  post({ action: "desinscribir", nombre });
