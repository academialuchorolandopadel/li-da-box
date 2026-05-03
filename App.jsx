import { useState, useEffect, useCallback } from "react";
import {
  fetchTabla, fetchFixture, fetchInscriptas,
  fetchEtapaInfo, inscribirse, desinscribir,
} from "./api.js";

// ── Utilidades ───────────────────────────────────────────────
const initials = (name) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

const scoreColor = (v) =>
  v >= 3 ? "#4ade80" : v >= 1 ? "#a78bfa" : v >= 0 ? "#94a3b8" : "#f87171";

const rankMedal = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null);

const AVATAR_COLORS = [
  "#e84fa0","#b06fc4","#f97316","#fbbf24",
  "#4ade80","#60a5fa","#f472b6","#a78bfa",
  "#34d399","#fb923c",
];
const avatarColor = (id) => AVATAR_COLORS[id % AVATAR_COLORS.length];

// ── Componente Spinner ────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid rgba(232,79,160,0.2)",
        borderTopColor: "#e84fa0",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Componente Error ──────────────────────────────────────────
function ErrorMsg({ msg, onRetry }) {
  return (
    <div style={{
      margin: 20, padding: 16, borderRadius: 12,
      background: "rgba(248,113,113,0.1)",
      border: "1px solid rgba(248,113,113,0.3)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 22, marginBottom: 8 }}>⚠️</div>
      <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 12 }}>{msg}</div>
      <button onClick={onRetry} style={{
        background: "rgba(232,79,160,0.2)", border: "1px solid rgba(232,79,160,0.4)",
        color: "#f9a8d4", fontSize: 11, fontWeight: 700,
        padding: "6px 16px", borderRadius: 100, cursor: "pointer",
        letterSpacing: 1, textTransform: "uppercase",
      }}>Reintentar</button>
    </div>
  );
}

// ── APP PRINCIPAL ─────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("tabla");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // ── Estado de datos
  const [jugadoras,  setJugadoras]  = useState([]);
  const [partidos,   setPartidos]   = useState([]);
  const [inscriptas, setInscriptas] = useState([]);
  const [etapaInfo,  setEtapaInfo]  = useState({ etapa:"Primera Etapa", fecha:1, temporada:"Otoño 2026" });

  // ── Estado UI
  const [loading,   setLoading]   = useState({});
  const [errors,    setErrors]    = useState({});
  const [searchQ,   setSearchQ]   = useState("");
  const [myName,    setMyName]    = useState(() => localStorage.getItem("padel_nombre") || "");
  const [showLogin, setShowLogin] = useState(!localStorage.getItem("padel_nombre"));
  const [loginInput, setLoginInput] = useState("");

  // ── Helpers carga
  const load = useCallback(async (key, fn, setter) => {
    setLoading((p) => ({ ...p, [key]: true }));
    setErrors((p) => ({ ...p, [key]: null }));
    try {
      const data = await fn();
      setter(data);
    } catch (e) {
      setErrors((p) => ({ ...p, [key]: e.message }));
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  }, []);

  const reloadTabla    = useCallback(() => load("tabla",    fetchTabla,       (d) => setJugadoras(d.jugadoras || [])), [load]);
  const reloadFixture  = useCallback(() => load("fixture",  fetchFixture,     (d) => setPartidos(d.partidos || [])),   [load]);
  const reloadInsc     = useCallback(() => load("insc",     fetchInscriptas,  (d) => setInscriptas(d.inscriptas || [])), [load]);
  const reloadEtapa    = useCallback(() => load("etapa",    fetchEtapaInfo,   (d) => setEtapaInfo(d)),                 [load]);

  // Carga inicial
  useEffect(() => {
    reloadTabla();
    reloadFixture();
    reloadInsc();
    reloadEtapa();
  }, []);

  // ── Login
  const handleLogin = () => {
    const nombre = loginInput.trim();
    if (!nombre) return;
    localStorage.setItem("padel_nombre", nombre);
    setMyName(nombre);
    setShowLogin(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("padel_nombre");
    setMyName("");
    setShowLogin(true);
  };

  // ── Inscripción
  const [inscLoading, setInscLoading] = useState(false);
  const isInscripta = inscriptas.some(n => n.toLowerCase() === myName.toLowerCase());

  const handleToggleInsc = async () => {
    if (!myName) return;
    setInscLoading(true);
    try {
      if (isInscripta) {
        await desinscribir(myName);
        setInscriptas((prev) => prev.filter(n => n.toLowerCase() !== myName.toLowerCase()));
      } else {
        await inscribirse(myName);
        setInscriptas((prev) => [...prev, myName]);
      }
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setInscLoading(false);
    }
  };

  const myPlayer = jugadoras.find((p) => p.nombre?.toLowerCase() === myName?.toLowerCase());
  const myRank   = myPlayer ? jugadoras.indexOf(myPlayer) + 1 : null;
  const filteredPlayers = jugadoras.filter((p) =>
    p.nombre?.toLowerCase().includes(searchQ.toLowerCase())
  );

  const tabs = [
    { id: "tabla",      icon: "🏆", label: "Tabla" },
    { id: "fixture",    icon: "📅", label: "Fixture" },
    { id: "inscripcion",icon: "✅", label: "Anotar" },
    { id: "perfil",     icon: "👤", label: "Mi Perfil" },
  ];

  // ── PANTALLA LOGIN ────────────────────────────────────────
  if (showLogin) {
    return (
      <div style={{
        minHeight: "100vh", background: "#0f0023",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: 24, fontFamily: "'Trebuchet MS', sans-serif",
      }}>
        <div style={{ position: "fixed", top: -80, left: "50%", transform: "translateX(-50%)",
          width: 400, height: 300,
          background: "radial-gradient(ellipse,rgba(232,79,160,0.3) 0%,transparent 70%)",
          pointerEvents: "none" }} />

        <div style={{ textAlign: "center", marginBottom: 32, position: "relative" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎾</div>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#e84fa0",
            fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
            Temporada Otoño 2026
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "white", lineHeight: 1 }}>
            Liga de Damas
          </div>
          <div style={{ fontSize: 18, letterSpacing: 6, color: "#f472b6", fontWeight: 700 }}>
            PADEL BOX
          </div>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(232,79,160,0.3)",
          borderRadius: 20, padding: "28px 24px",
          width: "100%", maxWidth: 360,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)",
            marginBottom: 16, textAlign: "center" }}>
            Ingresá tu nombre para continuar
          </div>
          <div style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12, display: "flex", alignItems: "center",
            gap: 8, padding: "10px 14px", marginBottom: 12,
          }}>
            <span style={{ opacity: 0.5 }}>👤</span>
            <input
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Ej: Lore Garay"
              style={{
                background: "none", border: "none", outline: "none",
                color: "white", fontSize: 14, flex: 1,
                fontFamily: "'Trebuchet MS', sans-serif",
              }}
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={!loginInput.trim()}
            style={{
              width: "100%",
              background: loginInput.trim()
                ? "linear-gradient(135deg,#e84fa0,#b06fc4)"
                : "rgba(255,255,255,0.08)",
              border: "none", borderRadius: 12, padding: 14,
              color: "white", fontSize: 13, fontWeight: 700,
              letterSpacing: 1, textTransform: "uppercase",
              cursor: loginInput.trim() ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}>
            Entrar a la App →
          </button>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)",
            textAlign: "center", marginTop: 12, lineHeight: 1.5 }}>
            Tu nombre se guarda en tu dispositivo.<br />
            Solo vos ves tu perfil personalizado.
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN APP ──────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh", background: "#0f0023",
      fontFamily: "'Trebuchet MS', sans-serif",
      display: "flex", flexDirection: "column",
      maxWidth: 480, margin: "0 auto", position: "relative",
    }}>
      <div style={{ position: "fixed", top: -80, left: "50%", transform: "translateX(-50%)",
        width: 500, height: 300,
        background: "radial-gradient(ellipse,rgba(232,79,160,0.22) 0%,transparent 70%)",
        pointerEvents: "none", zIndex: 0 }} />

      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(135deg,#1e0640,#3d1260)",
        borderBottom: "1px solid rgba(232,79,160,0.3)",
        padding: "16px 20px 12px",
        position: "sticky", top: 0, zIndex: 100,
        boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#e84fa0",
              fontWeight: 700, textTransform: "uppercase" }}>
              🍂 {etapaInfo.temporada}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "white", lineHeight: 1.1 }}>
              Liga de Damas
              <span style={{ color: "#f472b6", fontSize: 14, letterSpacing: 4,
                display: "block", fontWeight: 700 }}>PADEL BOX</span>
            </div>
          </div>
          <div
            onClick={() => { setSelectedPlayer(myPlayer || null); setTab("perfil"); }}
            style={{
              width: 44, height: 44, borderRadius: "50%", cursor: "pointer",
              background: `linear-gradient(135deg,${avatarColor(myRank || 0)},#2d1040)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 900, color: "white",
              border: "2px solid rgba(232,79,160,0.6)",
              boxShadow: "0 0 12px rgba(232,79,160,0.4)", flexShrink: 0,
            }}>
            {initials(myName)}
          </div>
        </div>
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            background: "rgba(232,79,160,0.2)", border: "1px solid rgba(232,79,160,0.5)",
            color: "#f9a8d4", fontSize: 9, fontWeight: 700, letterSpacing: 2,
            padding: "3px 10px", borderRadius: 100, textTransform: "uppercase",
          }}>{etapaInfo.etapa}</span>
          <span style={{
            background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.4)",
            color: "#fde68a", fontSize: 9, fontWeight: 700, letterSpacing: 2,
            padding: "3px 10px", borderRadius: 100, textTransform: "uppercase",
          }}>📅 Fecha {etapaInfo.fecha}</span>
          {myRank && (
            <span style={{
              background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.35)",
              color: "#c4b5fd", fontSize: 9, fontWeight: 700, letterSpacing: 2,
              padding: "3px 10px", borderRadius: 100, textTransform: "uppercase",
            }}>Tu pos: #{myRank}</span>
          )}
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 84px", position: "relative", zIndex: 1 }}>

        {/* ══ TABLA ══ */}
        {tab === "tabla" && (
          <div>
            <div style={{ padding: "14px 16px 8px" }}>
              <div style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12, display: "flex", alignItems: "center",
                gap: 8, padding: "8px 14px",
              }}>
                <span style={{ opacity: 0.5 }}>🔍</span>
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Buscar jugadora..."
                  style={{
                    background: "none", border: "none", outline: "none",
                    color: "white", fontSize: 13, flex: 1,
                    fontFamily: "'Trebuchet MS', sans-serif",
                  }}
                />
              </div>
            </div>

            {loading.tabla && <Spinner />}
            {errors.tabla && <ErrorMsg msg={errors.tabla} onRetry={reloadTabla} />}

            {!loading.tabla && !errors.tabla && (
              <>
                <div style={{
                  display: "grid", gridTemplateColumns: "32px 1fr 44px 44px 56px",
                  gap: 4, padding: "4px 16px", marginBottom: 2,
                }}>
                  {["#", "JUGADORA", "FAV", "CON", "CLAS"].map((h, i) => (
                    <div key={i} style={{
                      fontSize: 8, fontWeight: 700, letterSpacing: 1.5,
                      color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
                      textAlign: i === 1 ? "left" : "center",
                    }}>{h}</div>
                  ))}
                </div>

                {filteredPlayers.map((p, idx) => {
                  const realRank = jugadoras.indexOf(p);
                  const medal    = rankMedal(realRank);
                  const isMe     = p.nombre?.toLowerCase() === myName?.toLowerCase();
                  return (
                    <div
                      key={p.nombre}
                      onClick={() => { setSelectedPlayer(p); setTab("perfil"); }}
                      style={{
                        display: "grid", gridTemplateColumns: "32px 1fr 44px 44px 56px",
                        gap: 4, alignItems: "center", padding: "8px 16px",
                        margin: "0 8px 3px", borderRadius: 10, cursor: "pointer",
                        background: isMe
                          ? "linear-gradient(90deg,rgba(232,79,160,0.25),rgba(176,111,196,0.15))"
                          : realRank === 0
                            ? "linear-gradient(90deg,rgba(251,191,36,0.15),rgba(232,79,160,0.08))"
                            : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isMe ? "rgba(232,79,160,0.55)" : realRank === 0 ? "rgba(251,191,36,0.35)" : "rgba(255,255,255,0.07)"}`,
                        transition: "transform 0.15s",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateX(3px)")}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateX(0)")}
                    >
                      <div style={{
                        textAlign: "center", fontSize: 12, fontWeight: 900, lineHeight: 1,
                        color: realRank === 0 ? "#fbbf24" : realRank === 1 ? "#e2e8f0" : realRank === 2 ? "#fb923c" : "rgba(255,255,255,0.3)",
                      }}>{medal || (realRank + 1)}</div>

                      <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                          background: `linear-gradient(135deg,${avatarColor(realRank)},#2d1040)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 900, color: "white",
                        }}>{initials(p.nombre)}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 10.5, fontWeight: 700, textTransform: "uppercase",
                            color: isMe ? "#fde68a" : "rgba(255,255,255,0.88)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {p.nombre} {isMe && <span style={{ color: "#f472b6", fontSize: 9 }}>← Tú</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#86efac" }}>{p.favor}</div>
                      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#fca5a5" }}>{p.contra}</div>
                      <div style={{
                        textAlign: "center", fontSize: 12, fontWeight: 900,
                        color: scoreColor(p.clasif),
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 6, padding: "2px 0",
                      }}>{p.clasif?.toFixed(2)}</div>
                    </div>
                  );
                })}

                <div style={{
                  display: "flex", justifyContent: "center", gap: 14,
                  padding: "14px 16px", flexWrap: "wrap",
                }}>
                  {[["#86efac","G. Favor"],["#fca5a5","G. Contra"],["#a78bfa","Clasif."]].map(([c, l]) => (
                    <div key={l} style={{ display: "flex", alignItems: "center", gap: 5,
                      fontSize: 9, color: "rgba(255,255,255,0.35)",
                      letterSpacing: 1, textTransform: "uppercase" }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                      {l}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ FIXTURE ══ */}
        {tab === "fixture" && (
          <div style={{ padding: "16px 12px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3,
              color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
              marginBottom: 14, textAlign: "center" }}>
              Fixture · Fecha {etapaInfo.fecha}
            </div>

            {loading.fixture && <Spinner />}
            {errors.fixture && <ErrorMsg msg={errors.fixture} onRetry={reloadFixture} />}

            {!loading.fixture && !errors.fixture && partidos.length === 0 && (
              <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)",
                fontSize: 13, padding: "40px 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
                El fixture aún no fue cargado.<br />
                <span style={{ fontSize: 11, marginTop: 6, display: "block" }}>
                  Completá la hoja FIXTURE en Google Sheets.
                </span>
              </div>
            )}

            {[...new Set(partidos.map((p) => p.hora))].map((hora) => (
              <div key={hora}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 8px" }}>
                  <div style={{ height: 1, flex: 1, background: "rgba(232,79,160,0.25)" }} />
                  <div style={{
                    background: "rgba(232,79,160,0.18)", border: "1px solid rgba(232,79,160,0.4)",
                    color: "#f9a8d4", fontSize: 10, fontWeight: 700,
                    letterSpacing: 2, padding: "4px 14px", borderRadius: 100,
                  }}>⏰ {hora}hs</div>
                  <div style={{ height: 1, flex: 1, background: "rgba(232,79,160,0.25)" }} />
                </div>
                {partidos.filter((p) => p.hora === hora).map((partido, i) => {
                  const involucra = [partido.pareja1, partido.pareja2].some((par) =>
                    par?.toLowerCase().includes(myName?.toLowerCase())
                  );
                  return (
                    <div key={i} style={{
                      background: involucra
                        ? "linear-gradient(135deg,rgba(232,79,160,0.18),rgba(176,111,196,0.12))"
                        : "rgba(255,255,255,0.04)",
                      border: `1px solid ${involucra ? "rgba(232,79,160,0.45)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 14, padding: "12px 14px", marginBottom: 8,
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2,
                        color: "#f472b6", textTransform: "uppercase", marginBottom: 8 }}>
                        🎾 {partido.cancha}{involucra ? " ← Tu partido" : ""}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          flex: 1, background: "rgba(255,255,255,0.06)",
                          borderRadius: 8, padding: "8px 10px",
                          fontSize: 10, fontWeight: 700, color: "white", textAlign: "center",
                        }}>{partido.pareja1}</div>
                        <div style={{
                          fontSize: 12, fontWeight: 900, color: "#e84fa0",
                          background: "rgba(232,79,160,0.12)",
                          borderRadius: 8, padding: "5px 8px",
                          border: "1px solid rgba(232,79,160,0.3)",
                        }}>VS</div>
                        <div style={{
                          flex: 1, background: "rgba(255,255,255,0.06)",
                          borderRadius: 8, padding: "8px 10px",
                          fontSize: 10, fontWeight: 700, color: "white", textAlign: "center",
                        }}>{partido.pareja2}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ══ INSCRIPCIÓN ══ */}
        {tab === "inscripcion" && (
          <div style={{ padding: "16px 12px" }}>
            <div style={{
              background: "linear-gradient(135deg,rgba(232,79,160,0.18),rgba(176,111,196,0.12))",
              border: "1px solid rgba(232,79,160,0.35)",
              borderRadius: 18, padding: "20px", marginBottom: 16, textAlign: "center",
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📅</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: "white", marginBottom: 4 }}>
                Próxima Fecha — Fecha {(etapaInfo.fecha || 1) + 1}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                Liga de Damas · Padel Box · Damas Domingos
              </div>
            </div>

            {/* Mi estado */}
            <div style={{
              background: isInscripta
                ? "linear-gradient(90deg,rgba(74,222,128,0.12),rgba(74,222,128,0.07))"
                : "rgba(255,255,255,0.04)",
              border: `1px solid ${isInscripta ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: 14, padding: "14px 16px", marginBottom: 16,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 3 }}>
                  Tu estado
                </div>
                <div style={{ fontSize: 13, fontWeight: 700,
                  color: isInscripta ? "#4ade80" : "rgba(255,255,255,0.5)" }}>
                  {isInscripta ? "✅ Inscripta" : "⭕ No inscripta"}
                </div>
              </div>
              <button
                onClick={handleToggleInsc}
                disabled={inscLoading}
                style={{
                  background: isInscripta
                    ? "rgba(248,113,113,0.18)"
                    : "linear-gradient(135deg,#e84fa0,#b06fc4)",
                  border: isInscripta ? "1px solid rgba(248,113,113,0.4)" : "none",
                  color: "white", fontSize: 10, fontWeight: 700,
                  letterSpacing: 1, textTransform: "uppercase",
                  padding: "8px 18px", borderRadius: 100,
                  cursor: inscLoading ? "not-allowed" : "pointer",
                  opacity: inscLoading ? 0.7 : 1, transition: "all 0.2s",
                }}>
                {inscLoading ? "..." : isInscripta ? "Cancelar" : "Anotarme"}
              </button>
            </div>

            {loading.insc && <Spinner />}
            {errors.insc && <ErrorMsg msg={errors.insc} onRetry={reloadInsc} />}

            {!loading.insc && (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2,
                  color: "rgba(255,255,255,0.3)", textTransform: "uppercase",
                  marginBottom: 8 }}>
                  Inscriptas ({inscriptas.length})
                </div>
                {inscriptas.map((nombre) => {
                  const pData = jugadoras.find((p) => p.nombre?.toLowerCase() === nombre.toLowerCase());
                  const rank  = pData ? jugadoras.indexOf(pData) + 1 : null;
                  return (
                    <div key={nombre} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "rgba(255,255,255,0.045)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: "9px 14px", marginBottom: 4,
                    }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                        background: `linear-gradient(135deg,${avatarColor(rank || 0)},#2d1040)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 900, color: "white",
                      }}>{initials(nombre)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "white",
                          textTransform: "uppercase" }}>
                          {nombre}{" "}
                          {nombre.toLowerCase() === myName.toLowerCase() && (
                            <span style={{ color: "#f9a8d4", fontSize: 9 }}>← Tú</span>
                          )}
                        </div>
                        {pData && (
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                            #{rank} · Clasif: {pData.clasif?.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 14, color: "#4ade80" }}>✓</div>
                    </div>
                  );
                })}
                {inscriptas.length === 0 && (
                  <div style={{ textAlign: "center", color: "rgba(255,255,255,0.25)",
                    fontSize: 12, padding: "24px 0" }}>
                    Sé la primera en anotarte 🎾
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ PERFIL ══ */}
        {tab === "perfil" && (() => {
          const p    = selectedPlayer || myPlayer;
          if (!p) return (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)",
              padding: "60px 24px", fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
              Tu nombre no está en la tabla aún.
              <br />
              <button onClick={handleLogout} style={{
                marginTop: 16, background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.6)",
                fontSize: 11, fontWeight: 700, padding: "8px 18px",
                borderRadius: 100, cursor: "pointer", letterSpacing: 1,
              }}>Cambiar nombre</button>
            </div>
          );

          const rank     = jugadoras.indexOf(p) + 1;
          const pct      = p.favor + p.contra > 0
            ? Math.round((p.favor / (p.favor + p.contra)) * 100) : 0;
          const diff     = p.favor - p.contra;
          const isMe2    = p.nombre?.toLowerCase() === myName?.toLowerCase();

          return (
            <div style={{ padding: "16px 12px" }}>
              {selectedPlayer && !isMe2 && (
                <button onClick={() => setSelectedPlayer(null)} style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700,
                  padding: "6px 14px", borderRadius: 100, cursor: "pointer",
                  marginBottom: 14, letterSpacing: 1,
                }}>← Volver a tabla</button>
              )}

              {/* Card perfil */}
              <div style={{
                background: "linear-gradient(135deg,#1e0640,#3d1260)",
                border: "1px solid rgba(232,79,160,0.35)",
                borderRadius: 20, padding: "24px 20px", marginBottom: 12, textAlign: "center",
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: "50%",
                  background: `linear-gradient(135deg,${avatarColor(rank)},#2d1040)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, fontWeight: 900, color: "white",
                  margin: "0 auto 12px",
                  border: "3px solid rgba(232,79,160,0.5)",
                  boxShadow: "0 0 20px rgba(232,79,160,0.3)",
                }}>{initials(p.nombre)}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "white",
                  textTransform: "uppercase", letterSpacing: 1 }}>{p.nombre}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  <span style={{
                    background: "rgba(232,79,160,0.2)", border: "1px solid rgba(232,79,160,0.4)",
                    color: "#f9a8d4", fontSize: 9, fontWeight: 700, letterSpacing: 2,
                    padding: "4px 12px", borderRadius: 100,
                  }}>{rankMedal(rank - 1) || `#${rank}`} Posición</span>
                  <span style={{
                    background: p.clasif >= 0 ? "rgba(167,139,250,0.2)" : "rgba(248,113,113,0.2)",
                    border: `1px solid ${p.clasif >= 0 ? "rgba(167,139,250,0.4)" : "rgba(248,113,113,0.4)"}`,
                    color: p.clasif >= 0 ? "#c4b5fd" : "#fca5a5",
                    fontSize: 9, fontWeight: 700, letterSpacing: 2,
                    padding: "4px 12px", borderRadius: 100,
                  }}>{p.clasif?.toFixed(2)} pts</span>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {[
                  { label: "Games a favor",   value: p.favor,   color: "#86efac", icon: "🎯" },
                  { label: "Games en contra", value: p.contra,  color: "#fca5a5", icon: "🏓" },
                  { label: "Diferencial",     value: (diff > 0 ? "+" : "") + diff, color: diff >= 0 ? "#86efac" : "#fca5a5", icon: "⚡" },
                  { label: "% Games favor",   value: pct + "%", color: "#93c5fd", icon: "📊" },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} style={{
                    background: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12, padding: "12px 14px",
                  }}>
                    <div style={{ fontSize: 16, marginBottom: 4 }}>{icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)",
                      textTransform: "uppercase", letterSpacing: 1, marginTop: 3 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Barra de rendimiento */}
              <div style={{
                background: "rgba(255,255,255,0.045)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "14px 16px", marginBottom: 10,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between",
                  fontSize: 9, color: "rgba(255,255,255,0.38)",
                  textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                  <span>Rendimiento</span><span>{pct}% games ganados</span>
                </div>
                <div style={{ height: 8, borderRadius: 100,
                  background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 100, width: `${pct}%`,
                    background: "linear-gradient(90deg,#4ade80,#86efac)",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between",
                  fontSize: 9, color: "rgba(255,255,255,0.28)", marginTop: 6 }}>
                  <span style={{ color: "#86efac" }}>{p.favor} favor</span>
                  <span style={{ color: "#fca5a5" }}>{p.contra} contra</span>
                </div>
              </div>

              {/* Botón cambiar nombre (solo propio perfil) */}
              {isMe2 && (
                <button onClick={handleLogout} style={{
                  width: "100%", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700,
                  padding: "10px", borderRadius: 12, cursor: "pointer",
                  letterSpacing: 1, textTransform: "uppercase",
                }}>Cambiar nombre / Cerrar sesión</button>
              )}
            </div>
          );
        })()}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "rgba(15,0,35,0.97)",
        borderTop: "1px solid rgba(232,79,160,0.22)",
        backdropFilter: "blur(20px)",
        display: "flex", zIndex: 200,
        boxShadow: "0 -4px 24px rgba(0,0,0,0.6)",
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id !== "perfil") setSelectedPlayer(null); }}
            style={{
              flex: 1, border: "none", cursor: "pointer",
              background: "none", padding: "10px 4px 12px",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3, transition: "all 0.2s",
            }}
          >
            <span style={{
              fontSize: 18, lineHeight: 1,
              filter: tab === t.id ? "drop-shadow(0 0 6px #e84fa0)" : "none",
              transform: tab === t.id ? "scale(1.2)" : "scale(1)",
              transition: "all 0.2s",
            }}>{t.icon}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 1,
              textTransform: "uppercase", transition: "color 0.2s",
              color: tab === t.id ? "#f472b6" : "rgba(255,255,255,0.3)",
            }}>{t.label}</span>
            {tab === t.id && (
              <div style={{ width: 4, height: 4, borderRadius: "50%",
                background: "#e84fa0", boxShadow: "0 0 6px #e84fa0" }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
