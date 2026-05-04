// ============================================================
//  api.js — LI.DA.BOX v3
// ============================================================

export const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzE7WwvquBsu0QBSM_g60XWRj2fyxySB_3QPK10iUU9A2b02WRiSGXIGmqWMgwIts8Q/exec";

async function get(action, params={}) {
  const query = new URLSearchParams({ action, ...params }).toString();
  const res   = await fetch(`${APPS_SCRIPT_URL}?${query}`, { redirect:"follow" });
  if(!res.ok) throw new Error(`Error HTTP ${res.status}`);
  return res.json();
}

async function post(body) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method:"POST", redirect:"follow",
    headers:{"Content-Type":"text/plain"},
    body: JSON.stringify(body),
  });
  if(!res.ok) throw new Error(`Error HTTP ${res.status}`);
  return res.json();
}

// ── Tabla y fechas
export const fetchTabla       = ()  => get("getTabla");
export const fetchFixture     = ()  => get("getFixture");
export const fetchInscriptas  = ()  => get("getInscriptas");
export const fetchEtapaInfo   = ()  => get("getEtapa");
export const fetchFechaData   = (n) => get("getFechaData", { fecha: n });

// ── Inscripción
export const inscribirse      = (nombre) => post({ action:"inscribirse",  nombre });
export const desinscribir     = (nombre) => post({ action:"desinscribir", nombre });
export const fetchInscConfig  = ()       => get("getInscConfig");

// ── Admin
export const adminLogin       = (nombre, pin) => post({ action:"adminLogin", nombre, pin });
export const fetchPagos       = ()             => get("getPagos");
export const updatePago       = (nombre, estado) => post({ action:"updatePago", nombre, estado });
export const setInscConfig    = (abierta)      => post({ action:"setInscConfig", abierta });

// ── Fotos
export const fetchFoto        = (nombre) => get("getFoto", { nombre });
export const subirFoto        = (nombre, base64, mimeType) =>
  post({ action:"subirFoto", nombre, base64, mimeType });
