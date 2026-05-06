import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchTabla, fetchFixture, fetchInscriptas, fetchEtapaInfo,
  fetchFechaData, fetchInscConfig, fetchPagos, fetchFoto, subirFoto,
  inscribirse, desinscribir, adminLogin, updatePago, setInscConfig,
  loginJugadora, cambiarPin,
} from "./api.js";

// ── Utilidades ───────────────────────────────────────────────
const initials   = (n) => (n||"").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
const scoreColor = (v) => v>=3?"#4ade80":v>=1?"#a78bfa":v>=0?"#94a3b8":"#f87171";
const diffColor  = (v) => v>0?"#4ade80":v===0?"#94a3b8":"#f87171";
const rankMedal  = (i) => i===0?"🥇":i===1?"🥈":i===2?"🥉":null;
const COLORS = ["#e84fa0","#b06fc4","#f97316","#fbbf24","#4ade80","#60a5fa","#f472b6","#a78bfa","#34d399","#fb923c","#e879f9","#38bdf8"];
const avatarColor = (id) => COLORS[(id||0)%COLORS.length];
const ESTADO_PAGO = {
  pendiente: { label:"⏳ Pendiente", color:"#fbbf24", bg:"rgba(251,191,36,0.15)", border:"rgba(251,191,36,0.4)" },
  pagado:    { label:"✅ Pagó",      color:"#4ade80", bg:"rgba(74,222,128,0.15)",  border:"rgba(74,222,128,0.4)" },
  rechazado: { label:"❌ Rechazado", color:"#f87171", bg:"rgba(248,113,113,0.15)", border:"rgba(248,113,113,0.4)" },
};

// ── Spinner ──────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:48,gap:12}}>
      <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid rgba(232,79,160,0.2)",borderTopColor:"#e84fa0",animation:"spin 0.8s linear infinite"}}/>
      <span style={{fontSize:11,color:"rgba(255,255,255,0.3)",letterSpacing:2}}>CARGANDO...</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Error ────────────────────────────────────────────────────
function ErrMsg({msg,onRetry}) {
  return (
    <div style={{margin:20,padding:18,borderRadius:14,background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",textAlign:"center"}}>
      <div style={{fontSize:24,marginBottom:8}}>⚠️</div>
      <div style={{color:"#fca5a5",fontSize:12,marginBottom:14,lineHeight:1.5}}>{msg}</div>
      {onRetry&&<button onClick={onRetry} style={{background:"rgba(232,79,160,0.2)",border:"1px solid rgba(232,79,160,0.4)",color:"#f9a8d4",fontSize:11,fontWeight:700,padding:"7px 18px",borderRadius:100,cursor:"pointer",letterSpacing:1,textTransform:"uppercase"}}>Reintentar</button>}
    </div>
  );
}

// ── Avatar con foto ──────────────────────────────────────────
function Avatar({name,rank,size=36,border=false,photoUrl=null,onClick=null}) {
  return (
    <div onClick={onClick} style={{width:size,height:size,borderRadius:"50%",flexShrink:0,
      background:photoUrl?"#000":`linear-gradient(135deg,${avatarColor(rank)},#2d1040)`,
      display:"flex",alignItems:"center",justifyContent:"center",
      fontSize:size*0.28,fontWeight:900,color:"white",overflow:"hidden",
      border:border?"2px solid rgba(232,79,160,0.6)":"none",
      boxShadow:border?"0 0 14px rgba(232,79,160,0.4)":"none",
      cursor:onClick?"pointer":"default"}}>
      {photoUrl
        ? <img src={photoUrl} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        : initials(name)}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
export default function App() {
  const [tab,          setTab]        = useState("tabla");
  const [selPlayer,    setSelPlayer]  = useState(null);
  const [compPlayer,   setCompPlayer] = useState(null);
  const [selFecha,     setSelFecha]   = useState(null);
  const [fechaCache,   setFechaCache] = useState({});
  const [fechaLoading, setFechaLoad]  = useState(false);
  const [fechaError,   setFechaErr]   = useState(null);

  const [jugadoras,    setJugadoras]  = useState([]);
  const [partidos,     setPartidos]   = useState([]);
  const [inscriptas,   setInscriptas] = useState([]);
  const [inscConfig,   setInscCfg]    = useState({abierta:false,mensaje:""});
  const [etapa,        setEtapa]      = useState({etapa:"Primera Etapa",fecha:3,temporada:"Otoño 2026",totalFechas:8});
  const [loading,      setLoading]    = useState({});
  const [errors,       setErrors]     = useState({});
  const [searchQ,      setSearchQ]    = useState("");
  const [inscLoading,  setInscLoad]   = useState(false);
  const [fotos,        setFotos]      = useState({});

  // Admin
  const [isAdmin,      setIsAdmin]    = useState(false);
  const [adminData,    setAdminData]  = useState([]);
  const [adminLoading, setAdminLoad]  = useState(false);
  const [adminError,   setAdminErr]   = useState(null);
  const [pinInput,     setPinInput]   = useState("");
  const [showPinModal, setShowPin]    = useState(false);
  const [inscManual,   setInscManual] = useState(null); // null=auto, true=abierta, false=cerrada

  // Auth
  const [myName,       setMyName]     = useState(()=>localStorage.getItem("lidabox_nombre")||"");
  const [showLogin,    setShowLogin]  = useState(!localStorage.getItem("lidabox_nombre"));
  const [loginInput,   setLoginInput] = useState("");
  const [pinLoginInput,setPinLogin]   = useState("");
  const [loginError,   setLoginError] = useState("");
  const [loginLoading, setLoginLoad]  = useState(false);
  const [showCambiarPin,setShowCambiarPin] = useState(false);
  const [pinActual,    setPinActual]  = useState("");
  const [pinNuevo,     setPinNuevo]   = useState("");
  const [pinNuevo2,    setPinNuevo2]  = useState("");
  const [cambiarPinMsg,setCambiarMsg] = useState({});

  const load = useCallback(async(key,fn,setter)=>{
    setLoading(p=>({...p,[key]:true}));
    setErrors(p=>({...p,[key]:null}));
    try{ const d=await fn(); setter(d); }
    catch(e){ setErrors(p=>({...p,[key]:e.message})); }
    finally{ setLoading(p=>({...p,[key]:false})); }
  },[]);

  const reloadTabla   = useCallback(()=>load("tabla",  fetchTabla,      d=>setJugadoras(d.jugadoras||[])),[load]);
  const reloadFixture = useCallback(()=>load("fixture",fetchFixture,    d=>setPartidos(d.partidos||[])),[load]);
  const reloadInsc    = useCallback(()=>load("insc",   fetchInscriptas, d=>setInscriptas(d.inscriptas||[])),[load]);
  const reloadEtapa   = useCallback(()=>load("etapa",  fetchEtapaInfo,  d=>setEtapa(d)),[load]);
  const reloadCfg     = useCallback(()=>load("cfg",    fetchInscConfig, d=>setInscCfg(d)),[load]);

  useEffect(()=>{ reloadTabla(); reloadFixture(); reloadInsc(); reloadEtapa(); reloadCfg(); },[]);

  // Cargar foto de un jugador
  const loadFoto = useCallback(async(nombre)=>{
    if(fotos[nombre]!==undefined) return;
    setFotos(p=>({...p,[nombre]:null})); // marca como "cargando"
    try{
      const d = await fetchFoto(nombre);
      setFotos(p=>({...p,[nombre]:d.ok?d.url:null}));
    }catch(e){ setFotos(p=>({...p,[nombre]:null})); }
  },[fotos]);

  useEffect(()=>{
    if(myName) loadFoto(myName);
  },[myName]);

  const myPlayer    = jugadoras.find(p=>p.nombre?.toLowerCase()===myName?.toLowerCase());
  const myRank      = myPlayer ? jugadoras.indexOf(myPlayer)+1 : null;
  const myFoto      = fotos[myName]||null;
  const isInscripta = inscriptas.some(n=>(n.nombre||n).toLowerCase()===myName.toLowerCase());
  const isAdminUser = myName.toLowerCase()==="lucho rolando";

  // Cargar datos de una fecha específica
  const loadFecha = useCallback(async(n)=>{
    if(fechaCache[n]) return;
    setFechaLoad(true); setFechaErr(null);
    try{ const d=await fetchFechaData(n); setFechaCache(prev=>({...prev,[n]:d})); }
    catch(e){ setFechaErr(e.message); }
    finally{ setFechaLoad(false); }
  },[fechaCache]);

  const handleSelFecha=(n)=>{ setSelFecha(n); if(n!==null) loadFecha(n); };

  const handleLogin=async()=>{
    const n=loginInput.trim();
    const p=pinLoginInput.trim();
    if(!n||!p){ setLoginError("Completá nombre y PIN"); return; }
    // Admin bypass
    if(n.toLowerCase()==="lucho rolando"){
      const r = await adminLogin(n, p);
      if(r.admin){
        localStorage.setItem("lidabox_nombre",n);
        setMyName(n); setShowLogin(false); setLoginError(""); loadFoto(n);
      } else { setLoginError("PIN incorrecto"); }
      return;
    }
    setLoginLoad(true); setLoginError("");
    try{
      const r = await loginJugadora(n, p);
      if(r.ok){
        localStorage.setItem("lidabox_nombre", r.nombre);
        setMyName(r.nombre); setShowLogin(false); loadFoto(r.nombre);
      } else { setLoginError(r.error||"Error al ingresar"); }
    }catch(e){ setLoginError("Error de conexión"); }
    finally{ setLoginLoad(false); }
  };
  const handleLogout=()=>{ localStorage.removeItem("lidabox_nombre"); setMyName(""); setShowLogin(true); setIsAdmin(false); setPinLogin(""); setLoginInput(""); setLoginError(""); };

  const handleCambiarPin=async()=>{
    if(!pinNuevo||!pinNuevo2||!pinActual){ setCambiarMsg({error:"Completá todos los campos"}); return; }
    if(pinNuevo!==pinNuevo2){ setCambiarMsg({error:"Los PINs nuevos no coinciden"}); return; }
    if(pinNuevo.length<4){ setCambiarMsg({error:"El PIN debe tener al menos 4 caracteres"}); return; }
    try{
      const r = await cambiarPin(myName, pinActual, pinNuevo);
      if(r.ok){ setCambiarMsg({ok:"✅ PIN actualizado correctamente"}); setPinActual(""); setPinNuevo(""); setPinNuevo2(""); setTimeout(()=>{ setShowCambiarPin(false); setCambiarMsg({}); },2000); }
      else { setCambiarMsg({error:r.error||"Error"}); }
    }catch(e){ setCambiarMsg({error:"Error de conexión"}); }
  };

  const handleToggleInsc=async()=>{
    if(!myName)return;
    if(!isInscripta && !inscConfig.abierta) {
      alert(inscConfig.mensaje||"La inscripción está cerrada en este momento.");
      return;
    }
    setInscLoad(true);
    try{
      if(isInscripta){ await desinscribir(myName); setInscriptas(p=>p.filter(n=>(n.nombre||n).toLowerCase()!==myName.toLowerCase())); }
      else{ const r=await inscribirse(myName); if(r.cerrada){alert(r.mensaje||"Inscripción cerrada");return;} setInscriptas(p=>[...p,{nombre:myName,estado:"pendiente"}]); }
    }catch(e){alert("Error: "+e.message);}
    finally{ setInscLoad(false); }
  };

  // Admin login
  const handleAdminLogin=async()=>{
    if(!pinInput) return;
    const r = await adminLogin(myName, pinInput);
    if(r.admin){ setIsAdmin(true); setShowPin(false); setPinInput(""); loadAdminData(); }
    else{ alert("PIN incorrecto"); setPinInput(""); }
  };

  const loadAdminData=async()=>{
    setAdminLoad(true); setAdminErr(null);
    try{ const d=await fetchPagos(); setAdminData(d.jugadoras||[]); }
    catch(e){ setAdminErr(e.message); }
    finally{ setAdminLoad(false); }
  };

  const handleUpdatePago=async(nombre,estado)=>{
    try{
      await updatePago(nombre,estado);
      setAdminData(prev=>prev.map(j=>j.nombre===nombre?{...j,estadoPago:estado}:j));
    }catch(e){alert("Error: "+e.message);}
  };

  const handleToggleInscManual=async(valor)=>{
    try{
      await setInscConfig(valor);
      setInscManual(valor);
      reloadCfg();
    }catch(e){alert("Error: "+e.message);}
  };

  // Subir foto
  const fotoInputRef = useRef();
  const handleFotoChange=async(e)=>{
    const file = e.target.files[0]; if(!file)return;
    const reader = new FileReader();
    reader.onload=async(ev)=>{
      const base64 = ev.target.result.split(",")[1];
      try{
        const r = await subirFoto(myName, base64, file.type);
        if(r.ok){ setFotos(p=>({...p,[myName]:r.url+"&t="+Date.now()})); }
      }catch(err){alert("Error subiendo foto: "+err.message);}
    };
    reader.readAsDataURL(file);
  };

  const navTo=(t)=>{ setTab(t); if(t!=="jugadoras") setSelPlayer(null); };

  const tabs=[
    {id:"tabla",    icon:"🏆",label:"Tabla"},
    {id:"fixture",  icon:"📅",label:"Fixture"},
    {id:"insc",     icon:"✅",label:"Anotar"},
    {id:"jugadoras",icon:"🔍",label:"Jugadoras"},
    {id:"perfil",   icon:"👤",label:"Mi Perfil"},
    ...(isAdminUser?[{id:"admin",icon:"⚙️",label:"Admin"}]:[]),
  ];

  const fechaActual  = etapa.fecha||3;
  const totalFechas  = etapa.totalFechas||8;

  // ── PROFILE CARD ─────────────────────────────────────────
  const ProfileCard=({p,showBack=false,onBack})=>{
    const rank=jugadoras.indexOf(p);
    const pct=p.favor+p.contra>0?Math.round(p.favor/(p.favor+p.contra)*100):0;
    const diff=p.favor-p.contra;
    const dates=p.dates||[];
    // Cargar foto si no está en cache aún
    if(fotos[p.nombre]===undefined) loadFoto(p.nombre);
    const fotoUrl=fotos[p.nombre]||null;
    const isMe=p.nombre?.toLowerCase()===myName?.toLowerCase();
    return (
      <div style={{padding:"14px 12px"}}>
        {showBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.55)",fontSize:11,fontWeight:700,padding:"6px 14px",borderRadius:100,cursor:"pointer",marginBottom:14,letterSpacing:1}}>← Volver</button>}

        {/* Card principal */}
        <div style={{background:"linear-gradient(135deg,#1e0640,#3d1260)",border:"1px solid rgba(232,79,160,0.35)",borderRadius:20,padding:"22px 18px",marginBottom:12,textAlign:"center"}}>
          <div style={{position:"relative",display:"inline-block",marginBottom:12}}>
            <Avatar name={p.nombre} rank={rank} size={80} border photoUrl={fotoUrl}
              onClick={isMe?()=>fotoInputRef.current?.click():null}/>
            {isMe&&(
              <div onClick={()=>fotoInputRef.current?.click()}
                style={{position:"absolute",bottom:0,right:0,width:24,height:24,borderRadius:"50%",
                  background:"linear-gradient(135deg,#e84fa0,#b06fc4)",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:"pointer",fontSize:12,border:"2px solid #0f0023"}}>
                📷
              </div>
            )}
            {isMe&&<input ref={fotoInputRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFotoChange}/>}
          </div>
          <div style={{fontSize:17,fontWeight:900,color:"white",textTransform:"uppercase",letterSpacing:1}}>{p.nombre}</div>
          {isMe&&<div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:2}}>Tocá la foto para cambiarla</div>}
          <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:10,flexWrap:"wrap"}}>
            <span style={{background:"rgba(232,79,160,0.18)",border:"1px solid rgba(232,79,160,0.4)",color:"#f9a8d4",fontSize:9,fontWeight:700,letterSpacing:2,padding:"3px 12px",borderRadius:100,textTransform:"uppercase"}}>{rankMedal(rank)||`#${rank+1}`} Posición</span>
            <span style={{background:p.clasif>=0?"rgba(167,139,250,0.18)":"rgba(248,113,113,0.18)",border:`1px solid ${p.clasif>=0?"rgba(167,139,250,0.4)":"rgba(248,113,113,0.4)"}`,color:p.clasif>=0?"#c4b5fd":"#fca5a5",fontSize:9,fontWeight:700,letterSpacing:2,padding:"3px 12px",borderRadius:100,textTransform:"uppercase"}}>{p.clasif?.toFixed(2)} pts</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          {[{l:"Games a favor",v:p.favor,c:"#86efac",i:"🎯"},{l:"Games en contra",v:p.contra,c:"#fca5a5",i:"🏓"},{l:"Diferencial",v:(diff>0?"+":"")+diff,c:diff>=0?"#86efac":"#fca5a5",i:"⚡"},{l:"% Games favor",v:pct+"%",c:"#93c5fd",i:"📊"}].map(({l,v,c,i})=>(
            <div key={l} style={{background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:16,marginBottom:4}}>{i}</div>
              <div style={{fontSize:22,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
              <div style={{fontSize:8.5,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:1,marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>

        {/* Barra rendimiento */}
        <div style={{background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>
            <span>Rendimiento acumulado</span><span>{pct}%</span>
          </div>
          <div style={{height:8,borderRadius:100,background:"rgba(255,255,255,0.08)",overflow:"hidden"}}>
            <div style={{height:"100%",borderRadius:100,width:`${pct}%`,background:"linear-gradient(90deg,#4ade80,#86efac)"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"rgba(255,255,255,0.28)",marginTop:6}}>
            <span style={{color:"#86efac"}}>{p.favor} favor</span>
            <span style={{color:"#fca5a5"}}>{p.contra} contra</span>
          </div>
        </div>

        {/* Historial */}
        {dates.length>0&&(
          <div style={{background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:10}}>Historial por fecha</div>
            {dates.map(d=>(
              <div key={d.f} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.55)"}}>📅 Fecha {d.f}</span>
                <div style={{display:"flex",gap:10,alignItems:"center"}}>
                  <span style={{fontSize:12,fontWeight:700,color:"#86efac"}}>{d.fav} FAV</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.2)"}}>|</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#fca5a5"}}>{d.con} CON</span>
                  <span style={{fontSize:11,fontWeight:900,color:d.fav>d.con?"#4ade80":"#fca5a5",background:"rgba(255,255,255,0.06)",borderRadius:6,padding:"2px 8px",minWidth:44,textAlign:"center"}}>{d.fav>d.con?"✓ W":"✗ L"}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comparar */}
        <div style={{background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"14px 16px",marginBottom:10}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:10}}>🔄 Comparar con otra jugadora</div>
          <select value={compPlayer?.nombre||""} onChange={e=>setCompPlayer(jugadoras.find(j=>j.nombre===e.target.value)||null)}
            style={{width:"100%",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:"9px 12px",color:"white",fontSize:12,marginBottom:12,fontFamily:"'Trebuchet MS',sans-serif"}}>
            <option value="">— Elegí una jugadora —</option>
            {jugadoras.filter(j=>j.nombre!==p.nombre).map(j=>(
              <option key={j.nombre} value={j.nombre} style={{background:"#1e0640"}}>{j.nombre}</option>
            ))}
          </select>
          {compPlayer&&(()=>{
            const A=p,B=compPlayer;
            const pA=A.favor+A.contra>0?Math.round(A.favor/(A.favor+A.contra)*100):0;
            const pB=B.favor+B.contra>0?Math.round(B.favor/(B.favor+B.contra)*100):0;
            const rankB=jugadoras.indexOf(B);
            const rows=[
              {label:"Games favor",a:A.favor,   b:B.favor,  numA:A.favor,  numB:B.favor,  hi:true},
              {label:"En contra",  a:A.contra,  b:B.contra, numA:A.contra, numB:B.contra, hi:false},
              {label:"Clasif.",    a:A.clasif?.toFixed(2),b:B.clasif?.toFixed(2),numA:A.clasif,numB:B.clasif,hi:true},
              {label:"Rendim. %",  a:pA+"%",    b:pB+"%",   numA:pA,numB:pB,hi:true},
            ];
            return (
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 40px 1fr",gap:8,marginBottom:14,alignItems:"center"}}>
                  <div style={{textAlign:"center"}}><Avatar name={A.nombre} rank={rank} size={44} border photoUrl={fotos[A.nombre]}/><div style={{fontSize:9,fontWeight:700,color:"#f9a8d4",textTransform:"uppercase",marginTop:6}}>{A.nombre.split(" ")[0]}</div></div>
                  <div style={{textAlign:"center",fontSize:12,fontWeight:900,color:"rgba(255,255,255,0.3)"}}>VS</div>
                  <div style={{textAlign:"center"}}><Avatar name={B.nombre} rank={rankB} size={44} border photoUrl={fotos[B.nombre]}/><div style={{fontSize:9,fontWeight:700,color:"#f9a8d4",textTransform:"uppercase",marginTop:6}}>{B.nombre.split(" ")[0]}</div></div>
                </div>
                {rows.map(({label,a,b,numA,numB,hi})=>{
                  const total=(numA||0)+(numB||0)||1;
                  const wA=Math.max(5,Math.round((numA||0)/total*100));
                  const aWins=hi?(numA||0)>=(numB||0):(numA||0)<=(numB||0);
                  return (
                    <div key={label} style={{marginBottom:10}}>
                      <div style={{fontSize:8.5,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:1,textAlign:"center",marginBottom:5}}>{label}</div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <div style={{fontSize:12,fontWeight:900,color:aWins?"#4ade80":"rgba(255,255,255,0.4)",minWidth:38,textAlign:"right"}}>{a}</div>
                        <div style={{flex:1,height:10,borderRadius:100,background:"rgba(255,255,255,0.07)",overflow:"hidden",display:"flex"}}>
                          <div style={{width:`${wA}%`,background:aWins?"linear-gradient(90deg,#4ade80,#86efac)":"rgba(255,255,255,0.18)",borderRadius:"100px 0 0 100px",transition:"width 0.6s"}}/>
                          <div style={{width:`${100-wA}%`,background:!aWins?"linear-gradient(90deg,#f472b6,#e84fa0)":"rgba(255,255,255,0.18)",borderRadius:"0 100px 100px 0",transition:"width 0.6s"}}/>
                        </div>
                        <div style={{fontSize:12,fontWeight:900,color:!aWins?"#f472b6":"rgba(255,255,255,0.4)",minWidth:38}}>{b}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {isMe&&(
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowCambiarPin(true)} style={{flex:1,background:"rgba(232,79,160,0.1)",border:"1px solid rgba(232,79,160,0.3)",color:"#f9a8d4",fontSize:11,fontWeight:700,padding:10,borderRadius:12,cursor:"pointer",letterSpacing:1,textTransform:"uppercase"}}>
              🔒 Cambiar PIN
            </button>
            <button onClick={handleLogout} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.09)",color:"rgba(255,255,255,0.35)",fontSize:11,fontWeight:700,padding:10,borderRadius:12,cursor:"pointer",letterSpacing:1,textTransform:"uppercase"}}>
              Salir
            </button>
          </div>
        )}
      </div>
    );
  };

  // ── LOGIN ────────────────────────────────────────────────
  if(showLogin) return (
    <div style={{minHeight:"100vh",background:"#0f0023",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Trebuchet MS',sans-serif"}}>
      <div style={{position:"fixed",top:-80,left:"50%",transform:"translateX(-50%)",width:400,height:300,background:"radial-gradient(ellipse,rgba(232,79,160,0.3) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{textAlign:"center",marginBottom:32,position:"relative"}}>
        <div style={{fontSize:52,marginBottom:10}}>🎾</div>
        <div style={{fontSize:11,letterSpacing:4,color:"#e84fa0",fontWeight:700,textTransform:"uppercase",marginBottom:6}}>Temporada Otoño 2026</div>
        <div style={{fontSize:36,fontWeight:900,color:"white",lineHeight:1,letterSpacing:2}}>LI.DA.BOX</div>
        <div style={{fontSize:13,letterSpacing:4,color:"#f472b6",fontWeight:700,marginTop:2}}>LIGA DE DAMAS</div>
      </div>
      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(232,79,160,0.3)",borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:360}}>
        <div style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.65)",marginBottom:18,textAlign:"center"}}>Ingresá tus datos para continuar</div>

        {/* Nombre */}
        <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:6}}>Tu nombre</div>
        <div style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",marginBottom:12}}>
          <span style={{opacity:0.5}}>👤</span>
          <input value={loginInput} onChange={e=>{setLoginInput(e.target.value);setLoginError("");}}
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            placeholder="Ej: Lore Garay"
            style={{background:"none",border:"none",outline:"none",color:"white",fontSize:14,flex:1,fontFamily:"'Trebuchet MS',sans-serif"}}/>
        </div>

        {/* PIN */}
        <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",marginBottom:6}}>Tu PIN</div>
        <div style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,display:"flex",alignItems:"center",gap:8,padding:"10px 14px",marginBottom:16}}>
          <span style={{opacity:0.5}}>🔒</span>
          <input value={pinLoginInput} onChange={e=>{setPinLogin(e.target.value);setLoginError("");}}
            onKeyDown={e=>e.key==="Enter"&&handleLogin()}
            type="password" placeholder="Tu PIN personal"
            style={{background:"none",border:"none",outline:"none",color:"white",fontSize:14,flex:1,letterSpacing:4,fontFamily:"'Trebuchet MS',sans-serif"}}/>
        </div>

        {/* Error */}
        {loginError&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:10,padding:"8px 14px",marginBottom:12,fontSize:12,color:"#fca5a5",textAlign:"center"}}>{loginError}</div>}

        <button onClick={handleLogin} disabled={loginLoading||!loginInput.trim()||!pinLoginInput.trim()} style={{
          width:"100%",
          background:loginInput.trim()&&pinLoginInput.trim()?"linear-gradient(135deg,#e84fa0,#b06fc4)":"rgba(255,255,255,0.07)",
          border:"none",borderRadius:12,padding:14,color:"white",fontSize:13,fontWeight:700,
          letterSpacing:1,textTransform:"uppercase",
          cursor:loginLoading||!loginInput.trim()||!pinLoginInput.trim()?"not-allowed":"pointer",
          opacity:loginLoading?0.7:1}}>
          {loginLoading?"Verificando...":"Entrar →"}
        </button>
        <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",textAlign:"center",marginTop:12,lineHeight:1.6}}>
          Tu PIN te lo asignó el administrador.<br/>Podés cambiarlo desde tu perfil.
        </div>
      </div>
    </div>
  );

  // ── MODAL CAMBIAR PIN ─────────────────────────────────────
  if(showCambiarPin) return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:24}}>
      <div style={{background:"linear-gradient(135deg,#1e0640,#3d1260)",border:"1px solid rgba(232,79,160,0.4)",borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:340}}>
        <div style={{fontSize:16,fontWeight:900,color:"white",marginBottom:4,textAlign:"center"}}>🔒 Cambiar PIN</div>
        <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:20,textAlign:"center"}}>Elegí un PIN nuevo de al menos 4 caracteres</div>

        {[["PIN actual","pinActual",pinActual,setPinActual],["PIN nuevo","pinNuevo",pinNuevo,setPinNuevo],["Repetir PIN nuevo","pinNuevo2",pinNuevo2,setPinNuevo2]].map(([label,key,val,setter])=>(
          <div key={key} style={{marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:5}}>{label}</div>
            <input value={val} onChange={e=>{setter(e.target.value);setCambiarMsg({});}}
              type="password" placeholder="••••"
              style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:10,padding:"10px 14px",color:"white",fontSize:14,letterSpacing:4,fontFamily:"'Trebuchet MS',sans-serif"}}/>
          </div>
        ))}

        {cambiarPinMsg.error&&<div style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",borderRadius:10,padding:"8px 14px",marginBottom:12,fontSize:12,color:"#fca5a5",textAlign:"center"}}>{cambiarPinMsg.error}</div>}
        {cambiarPinMsg.ok&&<div style={{background:"rgba(74,222,128,0.1)",border:"1px solid rgba(74,222,128,0.3)",borderRadius:10,padding:"8px 14px",marginBottom:12,fontSize:12,color:"#4ade80",textAlign:"center"}}>{cambiarPinMsg.ok}</div>}

        <div style={{display:"flex",gap:8,marginTop:4}}>
          <button onClick={()=>{setShowCambiarPin(false);setPinActual("");setPinNuevo("");setPinNuevo2("");setCambiarMsg({});}}
            style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:700,padding:12,borderRadius:12,cursor:"pointer"}}>Cancelar</button>
          <button onClick={handleCambiarPin}
            style={{flex:2,background:"linear-gradient(135deg,#e84fa0,#b06fc4)",border:"none",color:"white",fontSize:12,fontWeight:700,padding:12,borderRadius:12,cursor:"pointer"}}>Guardar PIN →</button>
        </div>
      </div>
    </div>
  );
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:24}}>
      <div style={{background:"linear-gradient(135deg,#1e0640,#3d1260)",border:"1px solid rgba(232,79,160,0.4)",borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:12}}>⚙️</div>
        <div style={{fontSize:15,fontWeight:900,color:"white",marginBottom:4}}>Panel Admin</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:20}}>Ingresá tu PIN para continuar</div>
        <input value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdminLogin()}
          type="password" placeholder="PIN" maxLength={4}
          style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,padding:"12px 16px",color:"white",fontSize:20,textAlign:"center",letterSpacing:8,marginBottom:14,fontFamily:"'Trebuchet MS',sans-serif"}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{setShowPin(false);setPinInput("");}} style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",fontSize:12,fontWeight:700,padding:12,borderRadius:12,cursor:"pointer"}}>Cancelar</button>
          <button onClick={handleAdminLogin} style={{flex:2,background:"linear-gradient(135deg,#e84fa0,#b06fc4)",border:"none",color:"white",fontSize:12,fontWeight:700,padding:12,borderRadius:12,cursor:"pointer"}}>Entrar →</button>
        </div>
      </div>
    </div>
  );

  // ── MAIN ─────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:"#0f0023",fontFamily:"'Trebuchet MS',sans-serif",display:"flex",flexDirection:"column",maxWidth:480,margin:"0 auto",position:"relative"}}>
      <div style={{position:"fixed",top:-80,left:"50%",transform:"translateX(-50%)",width:500,height:280,background:"radial-gradient(ellipse,rgba(232,79,160,0.2) 0%,transparent 70%)",pointerEvents:"none",zIndex:0}}/>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#1e0640,#3d1260)",borderBottom:"1px solid rgba(232,79,160,0.3)",padding:"14px 18px 10px",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 24px rgba(0,0,0,0.5)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:9,letterSpacing:3,color:"#e84fa0",fontWeight:700,textTransform:"uppercase"}}>🍂 {etapa.temporada||"Otoño 2026"}</div>
            <div style={{fontSize:20,fontWeight:900,color:"white",lineHeight:1.05,letterSpacing:2}}>LI.DA.BOX<span style={{color:"#f472b6",fontSize:11,letterSpacing:3,display:"block",fontWeight:700}}>LIGA DE DAMAS</span></div>
          </div>
          <div onClick={()=>navTo("perfil")} style={{cursor:"pointer"}}>
            <Avatar name={myName} rank={myRank||0} size={44} border photoUrl={myFoto}/>
          </div>
        </div>
        <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
          <span style={{background:"rgba(232,79,160,0.18)",border:"1px solid rgba(232,79,160,0.4)",color:"#f9a8d4",fontSize:9,fontWeight:700,letterSpacing:2,padding:"3px 10px",borderRadius:100,textTransform:"uppercase"}}>{etapa.etapa||"Primera Etapa"}</span>
          <span style={{background:inscConfig.abierta?"rgba(74,222,128,0.15)":"rgba(255,255,255,0.07)",border:`1px solid ${inscConfig.abierta?"rgba(74,222,128,0.4)":"rgba(255,255,255,0.12)"}`,color:inscConfig.abierta?"#4ade80":"rgba(255,255,255,0.4)",fontSize:9,fontWeight:700,letterSpacing:2,padding:"3px 10px",borderRadius:100,textTransform:"uppercase"}}>
            {inscConfig.abierta?"✅ Inscripción abierta":"🔒 Inscripción cerrada"}
          </span>
          {myRank&&<span style={{background:"rgba(167,139,250,0.15)",border:"1px solid rgba(167,139,250,0.3)",color:"#c4b5fd",fontSize:9,fontWeight:700,letterSpacing:2,padding:"3px 10px",borderRadius:100,textTransform:"uppercase"}}>#{myRank} en tabla</span>}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{flex:1,overflowY:"auto",padding:"0 0 84px",position:"relative",zIndex:1}}>

        {/* ══ TABLA ══ */}
        {tab==="tabla"&&(
          <div>
            {/* Tabs fechas */}
            <div style={{padding:"12px 14px 0",overflowX:"auto"}}>
              <div style={{display:"flex",gap:6,minWidth:"max-content",paddingBottom:2}}>
                <button onClick={()=>handleSelFecha(null)} style={{padding:"6px 14px",borderRadius:100,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",transition:"all 0.2s",background:selFecha===null?"linear-gradient(135deg,#e84fa0,#b06fc4)":"rgba(255,255,255,0.07)",color:selFecha===null?"white":"rgba(255,255,255,0.45)",boxShadow:selFecha===null?"0 2px 12px rgba(232,79,160,0.4)":"none"}}>
                  🏆 Total
                </button>
                {Array.from({length:fechaActual},(_,i)=>i+1).map(n=>(
                  <button key={n} onClick={()=>handleSelFecha(n)} style={{padding:"6px 14px",borderRadius:100,border:"none",cursor:"pointer",fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",transition:"all 0.2s",background:selFecha===n?"linear-gradient(135deg,#fbbf24,#f97316)":"rgba(255,255,255,0.07)",color:selFecha===n?"white":"rgba(255,255,255,0.45)",boxShadow:selFecha===n?"0 2px 12px rgba(251,191,36,0.4)":"none"}}>
                    F{n}
                  </button>
                ))}
              </div>
            </div>

            {/* Vista TOTAL */}
            {selFecha===null&&(
              <div>
                <div style={{padding:"10px 14px 4px"}}>
                  <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,display:"flex",alignItems:"center",gap:8,padding:"8px 14px"}}>
                    <span style={{opacity:0.4}}>🔍</span>
                    <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Buscar jugadora..." style={{background:"none",border:"none",outline:"none",color:"white",fontSize:13,flex:1,fontFamily:"'Trebuchet MS',sans-serif"}}/>
                    {searchQ&&<span onClick={()=>setSearchQ("")} style={{opacity:0.4,cursor:"pointer",fontSize:14}}>✕</span>}
                  </div>
                </div>
                {loading.tabla&&<Spinner/>}
                {errors.tabla&&<ErrMsg msg={errors.tabla} onRetry={reloadTabla}/>}
                {!loading.tabla&&!errors.tabla&&(
                  <>
                    <div style={{display:"grid",gridTemplateColumns:"30px 1fr 42px 42px 54px",gap:4,padding:"4px 14px",marginBottom:2}}>
                      {["#","JUGADORA","FAV","CON","CLAS"].map((h,i)=>(
                        <div key={i} style={{fontSize:7.5,fontWeight:700,letterSpacing:1.5,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",textAlign:i===1?"left":"center"}}>{h}</div>
                      ))}
                    </div>
                    {jugadoras.filter(p=>p.nombre?.toLowerCase().includes(searchQ.toLowerCase())).map((p)=>{
                      const rank=jugadoras.indexOf(p);
                      const isMe=p.nombre?.toLowerCase()===myName?.toLowerCase();
                      return (
                        <div key={p.nombre} onClick={()=>{ setSelPlayer(p); navTo("jugadoras"); }}
                          style={{display:"grid",gridTemplateColumns:"30px 1fr 42px 42px 54px",gap:4,alignItems:"center",padding:"8px 14px",margin:"0 8px 3px",borderRadius:10,cursor:"pointer",
                            background:isMe?"linear-gradient(90deg,rgba(232,79,160,0.25),rgba(176,111,196,0.14))":rank===0?"linear-gradient(90deg,rgba(251,191,36,0.14),rgba(232,79,160,0.07))":"rgba(255,255,255,0.04)",
                            border:`1px solid ${isMe?"rgba(232,79,160,0.55)":rank===0?"rgba(251,191,36,0.35)":"rgba(255,255,255,0.07)"}`,transition:"transform 0.15s"}}
                          onMouseEnter={e=>e.currentTarget.style.transform="translateX(3px)"}
                          onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
                          <div style={{textAlign:"center",fontSize:rank<3?15:11,fontWeight:900,color:rank===0?"#fbbf24":rank===1?"#e2e8f0":rank===2?"#fb923c":"rgba(255,255,255,0.28)"}}>{rankMedal(rank)||(rank+1)}</div>
                          <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                            <Avatar name={p.nombre} rank={rank} size={26} photoUrl={fotos[p.nombre]}/>
                            <div style={{fontSize:10.5,fontWeight:700,textTransform:"uppercase",color:isMe?"#fde68a":"rgba(255,255,255,0.88)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                              {p.nombre}{isMe&&<span style={{color:"#f472b6",fontSize:8}}> ← Tú</span>}
                            </div>
                          </div>
                          <div style={{textAlign:"center",fontSize:11,fontWeight:700,color:"#86efac"}}>{p.favor}</div>
                          <div style={{textAlign:"center",fontSize:11,fontWeight:700,color:"#fca5a5"}}>{p.contra}</div>
                          <div style={{textAlign:"center",fontSize:12,fontWeight:900,color:scoreColor(p.clasif),background:"rgba(255,255,255,0.05)",borderRadius:6,padding:"2px 0"}}>{p.clasif?.toFixed(2)}</div>
                        </div>
                      );
                    })}
                    <div style={{display:"flex",justifyContent:"center",gap:14,padding:"12px 14px",flexWrap:"wrap"}}>
                      {[["#86efac","G. Favor"],["#fca5a5","G. Contra"],["#a78bfa","Clasif."]].map(([c,l])=>(
                        <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:8.5,color:"rgba(255,255,255,0.3)",letterSpacing:1,textTransform:"uppercase"}}>
                          <div style={{width:7,height:7,borderRadius:2,background:c}}/>{l}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Vista FECHA ESPECÍFICA */}
            {selFecha!==null&&(
              <div style={{padding:"12px 12px 0"}}>
                {fechaLoading&&<Spinner/>}
                {fechaError&&<ErrMsg msg={fechaError}/>}
                {!fechaLoading&&!fechaError&&fechaCache[selFecha]&&(()=>{
                  const fd=fechaCache[selFecha];
                  const jug=fd.jugadoras||[];
                  const fix=fd.fixture||[];
                  return (
                    <div>
                      <div style={{textAlign:"center",marginBottom:12}}>
                        <span style={{background:"linear-gradient(135deg,rgba(251,191,36,0.2),rgba(249,115,22,0.15))",border:"1px solid rgba(251,191,36,0.4)",color:"#fde68a",fontSize:10,fontWeight:700,letterSpacing:2,padding:"4px 16px",borderRadius:100,textTransform:"uppercase"}}>
                          📅 Resultados Fecha {selFecha}
                        </span>
                      </div>
                      {jug.length>0&&(
                        <>
                          <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:8,paddingLeft:4}}>Posiciones de la fecha</div>
                          <div style={{display:"grid",gridTemplateColumns:"30px 1fr 42px 42px 50px",gap:4,padding:"4px 10px",marginBottom:2}}>
                            {["#","JUGADORA","FAV","CON","DIF"].map((h,i)=>(
                              <div key={i} style={{fontSize:7.5,fontWeight:700,letterSpacing:1.5,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",textAlign:i===1?"left":"center"}}>{h}</div>
                            ))}
                          </div>
                          {jug.map((p,idx)=>{
                            const gRank=jugadoras.findIndex(j=>j.nombre?.toLowerCase()===p.nombre?.toLowerCase());
                            const isMe=p.nombre?.toLowerCase()===myName?.toLowerCase();
                            return (
                              <div key={p.nombre} style={{display:"grid",gridTemplateColumns:"30px 1fr 42px 42px 50px",gap:4,alignItems:"center",padding:"7px 10px",margin:"0 0 3px",borderRadius:10,
                                background:isMe?"linear-gradient(90deg,rgba(232,79,160,0.22),rgba(176,111,196,0.12))":idx===0?"linear-gradient(90deg,rgba(251,191,36,0.14),rgba(249,115,22,0.07))":"rgba(255,255,255,0.04)",
                                border:`1px solid ${isMe?"rgba(232,79,160,0.5)":idx===0?"rgba(251,191,36,0.35)":"rgba(255,255,255,0.07)"}`}}>
                                <div style={{textAlign:"center",fontSize:idx<3?14:10,fontWeight:900,color:idx===0?"#fbbf24":idx===1?"#e2e8f0":idx===2?"#fb923c":"rgba(255,255,255,0.28)"}}>{rankMedal(idx)||(idx+1)}</div>
                                <div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                                  <Avatar name={p.nombre} rank={gRank>=0?gRank:idx} size={24} photoUrl={fotos[p.nombre]}/>
                                  <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",color:isMe?"#fde68a":"rgba(255,255,255,0.85)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                                    {p.nombre}{isMe&&<span style={{color:"#f472b6",fontSize:8}}> ← Tú</span>}
                                  </div>
                                </div>
                                <div style={{textAlign:"center",fontSize:12,fontWeight:700,color:"#86efac"}}>{p.favor}</div>
                                <div style={{textAlign:"center",fontSize:12,fontWeight:700,color:"#fca5a5"}}>{p.contra}</div>
                                <div style={{textAlign:"center",fontSize:12,fontWeight:900,color:diffColor(p.diff)}}>{p.diff>0?"+":""}{p.diff}</div>
                              </div>
                            );
                          })}
                        </>
                      )}
                      {fix.length>0&&(
                        <div style={{marginTop:18}}>
                          <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.3)",textTransform:"uppercase",marginBottom:8,paddingLeft:4}}>Partidos de la fecha</div>
                          {[...new Set(fix.map(f=>f.hora))].map(hora=>(
                            <div key={hora}>
                              <div style={{display:"flex",alignItems:"center",gap:8,margin:"10px 0 6px"}}>
                                <div style={{height:1,flex:1,background:"rgba(251,191,36,0.2)"}}/>
                                <span style={{background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.3)",color:"#fde68a",fontSize:9,fontWeight:700,letterSpacing:2,padding:"3px 12px",borderRadius:100}}>⏰ {hora}hs</span>
                                <div style={{height:1,flex:1,background:"rgba(251,191,36,0.2)"}}/>
                              </div>
                              {fix.filter(f=>f.hora===hora).map((pt,i)=>{
                                const inv=[pt.pareja1,pt.pareja2].some(par=>par?.toLowerCase().includes(myName?.toLowerCase()));
                                return (
                                  <div key={i} style={{background:inv?"linear-gradient(135deg,rgba(232,79,160,0.15),rgba(176,111,196,0.1))":"rgba(255,255,255,0.04)",border:`1px solid ${inv?"rgba(232,79,160,0.35)":"rgba(255,255,255,0.07)"}`,borderRadius:12,padding:"10px 12px",marginBottom:6}}>
                                    <div style={{fontSize:8.5,fontWeight:700,letterSpacing:2,color:"#f472b6",textTransform:"uppercase",marginBottom:6}}>🎾 {pt.cancha}{inv?" ← Tu partido":""}</div>
                                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                                      <div style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:7,padding:"7px 8px",fontSize:9.5,fontWeight:700,color:"white",textAlign:"center"}}>{pt.pareja1}</div>
                                      <div style={{fontSize:10,fontWeight:900,color:"#e84fa0",padding:"0 2px"}}>VS</div>
                                      <div style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:7,padding:"7px 8px",fontSize:9.5,fontWeight:700,color:"white",textAlign:"center"}}>{pt.pareja2}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      )}
                      {jug.length===0&&fix.length===0&&(
                        <div style={{textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:13,padding:"40px 20px"}}>
                          <div style={{fontSize:32,marginBottom:10}}>📭</div>
                          No hay datos cargados para Fecha {selFecha}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ══ FIXTURE ══ */}
        {tab==="fixture"&&(
          <div style={{padding:"14px 12px"}}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:3,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:14,textAlign:"center"}}>Fixture · Fecha {fechaActual}</div>
            {loading.fixture&&<Spinner/>}
            {errors.fixture&&<ErrMsg msg={errors.fixture} onRetry={reloadFixture}/>}
            {!loading.fixture&&!errors.fixture&&partidos.length===0&&(
              <div style={{textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:13,padding:"40px 20px"}}>
                <div style={{fontSize:32,marginBottom:10}}>📭</div>
                El fixture aún no fue cargado.
              </div>
            )}
            {[...new Set(partidos.map(p=>p.hora))].map(hora=>(
              <div key={hora}>
                <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0 8px"}}>
                  <div style={{height:1,flex:1,background:"rgba(232,79,160,0.2)"}}/>
                  <div style={{background:"rgba(232,79,160,0.15)",border:"1px solid rgba(232,79,160,0.35)",color:"#f9a8d4",fontSize:10,fontWeight:700,letterSpacing:2,padding:"4px 14px",borderRadius:100}}>⏰ {hora}hs</div>
                  <div style={{height:1,flex:1,background:"rgba(232,79,160,0.2)"}}/>
                </div>
                {partidos.filter(pt=>pt.hora===hora).map((pt,i)=>{
                  const inv=[pt.pareja1,pt.pareja2].some(par=>par?.toLowerCase().includes(myName?.toLowerCase()));
                  return (
                    <div key={i} style={{background:inv?"linear-gradient(135deg,rgba(232,79,160,0.18),rgba(176,111,196,0.1))":"rgba(255,255,255,0.04)",border:`1px solid ${inv?"rgba(232,79,160,0.4)":"rgba(255,255,255,0.07)"}`,borderRadius:14,padding:"12px 14px",marginBottom:8}}>
                      <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"#f472b6",textTransform:"uppercase",marginBottom:8}}>🎾 {pt.cancha}{inv?" ← Tu partido":""}</div>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"8px 10px",fontSize:10,fontWeight:700,color:"white",textAlign:"center"}}>{pt.pareja1}</div>
                        <div style={{fontSize:11,fontWeight:900,color:"#e84fa0",background:"rgba(232,79,160,0.12)",borderRadius:8,padding:"6px 10px",border:"1px solid rgba(232,79,160,0.25)"}}>VS</div>
                        <div style={{flex:1,background:"rgba(255,255,255,0.06)",borderRadius:8,padding:"8px 10px",fontSize:10,fontWeight:700,color:"white",textAlign:"center"}}>{pt.pareja2}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ══ INSCRIPCIÓN ══ */}
        {tab==="insc"&&(
          <div style={{padding:"14px 12px"}}>
            <div style={{background:"linear-gradient(135deg,rgba(232,79,160,0.18),rgba(176,111,196,0.1))",border:"1px solid rgba(232,79,160,0.35)",borderRadius:18,padding:"20px",marginBottom:14,textAlign:"center"}}>
              <div style={{fontSize:28,marginBottom:8}}>📅</div>
              <div style={{fontSize:15,fontWeight:900,color:"white",marginBottom:4}}>Fecha {fechaActual+1}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:10}}>Liga de Damas · LI.DA.BOX · Damas Domingos</div>
              <div style={{fontSize:10,color:inscConfig.abierta?"#4ade80":"#fca5a5",fontWeight:700,letterSpacing:1}}>
                {inscConfig.abierta?"✅ Inscripción ABIERTA":"🔒 "+( inscConfig.mensaje||"Inscripción cerrada")}
              </div>
              {!inscConfig.abierta&&<div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginTop:6}}>Jueves 14hs → Sábado 12hs</div>}
            </div>

            <div style={{background:isInscripta?"linear-gradient(90deg,rgba(74,222,128,0.12),rgba(74,222,128,0.06))":"rgba(255,255,255,0.04)",border:`1px solid ${isInscripta?"rgba(74,222,128,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:14,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:3}}>Tu estado</div>
                <div style={{fontSize:13,fontWeight:700,color:isInscripta?"#4ade80":"rgba(255,255,255,0.5)"}}>{isInscripta?"✅ Inscripta":"⭕ No inscripta"}</div>
              </div>
              <button onClick={handleToggleInsc} disabled={inscLoading||(!isInscripta&&!inscConfig.abierta)} style={{
                background:!isInscripta&&!inscConfig.abierta?"rgba(255,255,255,0.06)":isInscripta?"rgba(248,113,113,0.18)":"linear-gradient(135deg,#e84fa0,#b06fc4)",
                border:isInscripta?"1px solid rgba(248,113,113,0.4)":"none",
                color:!isInscripta&&!inscConfig.abierta?"rgba(255,255,255,0.3)":"white",
                fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",
                padding:"8px 18px",borderRadius:100,
                cursor:inscLoading||(!isInscripta&&!inscConfig.abierta)?"not-allowed":"pointer",
                opacity:inscLoading?0.7:1}}>
                {inscLoading?"...":(isInscripta?"Cancelar":inscConfig.abierta?"Anotarme":"Cerrada")}
              </button>
            </div>

            {loading.insc&&<Spinner/>}
            {errors.insc&&<ErrMsg msg={errors.insc} onRetry={reloadInsc}/>}
            {!loading.insc&&(
              <>
                <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.28)",textTransform:"uppercase",marginBottom:8}}>
                  Inscriptas ({inscriptas.length})
                </div>
                {inscriptas.map((item,i)=>{
                  const nombre=item.nombre||item;
                  const estado=item.estado||"pendiente";
                  const est=ESTADO_PAGO[estado]||ESTADO_PAGO.pendiente;
                  const pd=jugadoras.find(p=>p.nombre?.toLowerCase()===nombre.toLowerCase());
                  const rk=pd?jugadoras.indexOf(pd)+1:null;
                  return (
                    <div key={nombre} style={{display:"flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"9px 14px",marginBottom:4}}>
                      <Avatar name={nombre} rank={i} size={30} photoUrl={fotos[nombre]}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:11,fontWeight:700,color:"white",textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {nombre}{nombre.toLowerCase()===myName.toLowerCase()&&<span style={{color:"#f9a8d4",fontSize:9}}> ← Tú</span>}
                        </div>
                        {pd&&<div style={{fontSize:9,color:"rgba(255,255,255,0.28)"}}>#{rk} · {pd.clasif?.toFixed(2)} pts</div>}
                      </div>
                      <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:100,background:est.bg,border:`1px solid ${est.border}`,color:est.color,whiteSpace:"nowrap"}}>{est.label}</span>
                    </div>
                  );
                })}
                {inscriptas.length===0&&<div style={{textAlign:"center",color:"rgba(255,255,255,0.25)",fontSize:12,padding:"24px 0"}}>
                  {inscConfig.abierta?"Sé la primera en anotarte 🎾":"La inscripción abre el Jueves a las 14hs"}
                </div>}
              </>
            )}
          </div>
        )}

        {/* ══ JUGADORAS ══ */}
        {tab==="jugadoras"&&(
          selPlayer
            ? <ProfileCard p={selPlayer} showBack onBack={()=>setSelPlayer(null)}/>
            : <div style={{padding:"14px 12px"}}>
                <div style={{fontSize:11,fontWeight:700,letterSpacing:3,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:12,textAlign:"center"}}>Todas las jugadoras ({jugadoras.length})</div>
                <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:12,display:"flex",alignItems:"center",gap:8,padding:"8px 14px",marginBottom:12}}>
                  <span style={{opacity:0.4}}>🔍</span>
                  <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Buscar jugadora..." style={{background:"none",border:"none",outline:"none",color:"white",fontSize:13,flex:1,fontFamily:"'Trebuchet MS',sans-serif"}}/>
                  {searchQ&&<span onClick={()=>setSearchQ("")} style={{opacity:0.4,cursor:"pointer",fontSize:14}}>✕</span>}
                </div>
                {jugadoras.filter(p=>p.nombre?.toLowerCase().includes(searchQ.toLowerCase())).map((p)=>{
                  const rank=jugadoras.indexOf(p);
                  return (
                    <div key={p.nombre} onClick={()=>setSelPlayer(p)}
                      style={{display:"flex",alignItems:"center",gap:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"11px 14px",marginBottom:5,cursor:"pointer",transition:"transform 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.transform="translateX(3px)"}
                      onMouseLeave={e=>e.currentTarget.style.transform="translateX(0)"}>
                      <div style={{fontSize:rank<3?16:12,fontWeight:900,width:26,textAlign:"center",color:rank===0?"#fbbf24":rank===1?"#e2e8f0":rank===2?"#fb923c":"rgba(255,255,255,0.25)"}}>{rankMedal(rank)||(rank+1)}</div>
                      <Avatar name={p.nombre} rank={rank} size={36} photoUrl={fotos[p.nombre]}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",color:"rgba(255,255,255,0.88)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.nombre}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:2}}>
                          <span style={{color:"#86efac"}}>{p.favor} FAV</span>{" · "}
                          <span style={{color:"#fca5a5"}}>{p.contra} CON</span>{" · "}
                          <span style={{color:scoreColor(p.clasif)}}>{p.clasif?.toFixed(2)} pts</span>
                        </div>
                      </div>
                      <span style={{fontSize:11,color:"rgba(255,255,255,0.2)"}}>→</span>
                    </div>
                  );
                })}
              </div>
        )}

        {/* ══ MI PERFIL ══ */}
        {tab==="perfil"&&(
          myPlayer
            ? <ProfileCard p={myPlayer} showBack={false}/>
            : <div style={{textAlign:"center",color:"rgba(255,255,255,0.3)",padding:"60px 24px",fontSize:13}}>
                <div style={{fontSize:36,marginBottom:12}}>{isAdminUser?"⚙️":"👤"}</div>
                <div style={{color:"white",fontSize:15,fontWeight:700,marginBottom:8}}>{myName}</div>
                {isAdminUser
                  ? <div style={{fontSize:12,marginBottom:20}}>Iniciaste sesión como administrador</div>
                  : <div style={{fontSize:12,marginBottom:20}}>Tu nombre no está en la tabla</div>}
                <button onClick={handleLogout} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",color:"rgba(255,255,255,0.55)",fontSize:11,fontWeight:700,padding:"8px 18px",borderRadius:100,cursor:"pointer",letterSpacing:1}}>Cerrar sesión</button>
              </div>
        )}

        {/* ══ ADMIN PANEL ══ */}
        {tab==="admin"&&(
          !isAdmin
            ? <div style={{padding:"40px 24px",textAlign:"center"}}>
                <div style={{fontSize:40,marginBottom:16}}>⚙️</div>
                <div style={{fontSize:14,fontWeight:700,color:"white",marginBottom:8}}>Panel de Administración</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:24}}>Ingresá tu PIN para acceder</div>
                <button onClick={()=>setShowPin(true)} style={{background:"linear-gradient(135deg,#e84fa0,#b06fc4)",border:"none",color:"white",fontSize:13,fontWeight:700,padding:"12px 28px",borderRadius:100,cursor:"pointer",letterSpacing:1,textTransform:"uppercase"}}>
                  Ingresar PIN →
                </button>
              </div>
            : <div style={{padding:"14px 12px"}}>
                {/* Header admin */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <div style={{fontSize:14,fontWeight:900,color:"white"}}>⚙️ Panel Admin</div>
                  <button onClick={()=>setIsAdmin(false)} style={{background:"rgba(248,113,113,0.15)",border:"1px solid rgba(248,113,113,0.3)",color:"#fca5a5",fontSize:10,fontWeight:700,padding:"5px 12px",borderRadius:100,cursor:"pointer"}}>Salir</button>
                </div>

                {/* Control inscripción */}
                <div style={{background:"rgba(255,255,255,0.045)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:14,padding:"16px",marginBottom:14}}>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:12}}>🔒 Control de Inscripción</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",marginBottom:12}}>
                    Estado actual: <strong style={{color:inscConfig.abierta?"#4ade80":"#fca5a5"}}>{inscConfig.abierta?"✅ Abierta":"🔒 Cerrada"}</strong>
                    {!inscConfig.manual&&<span style={{color:"rgba(255,255,255,0.3)",fontSize:9}}> (automático)</span>}
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>handleToggleInscManual(true)}
                      style={{flex:1,background:"rgba(74,222,128,0.15)",border:"1px solid rgba(74,222,128,0.4)",color:"#4ade80",fontSize:11,fontWeight:700,padding:"9px",borderRadius:10,cursor:"pointer"}}>
                      ✅ Abrir ahora
                    </button>
                    <button onClick={()=>handleToggleInscManual(false)}
                      style={{flex:1,background:"rgba(248,113,113,0.12)",border:"1px solid rgba(248,113,113,0.3)",color:"#fca5a5",fontSize:11,fontWeight:700,padding:"9px",borderRadius:10,cursor:"pointer"}}>
                      🔒 Cerrar ahora
                    </button>
                    <button onClick={()=>handleToggleInscManual(null)}
                      style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",fontSize:10,fontWeight:700,padding:"9px",borderRadius:10,cursor:"pointer"}}>
                      🔄 Auto
                    </button>
                  </div>
                </div>

                {/* Lista pagos */}
                <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",marginBottom:10}}>
                  💰 Pagos Fecha {fechaActual+1} ({adminData.length} inscriptas)
                </div>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  {Object.entries(ESTADO_PAGO).map(([k,v])=>(
                    <div key={k} style={{flex:1,background:v.bg,border:`1px solid ${v.border}`,borderRadius:10,padding:"8px",textAlign:"center"}}>
                      <div style={{fontSize:16}}>{k==="pendiente"?"⏳":k==="pagado"?"✅":"❌"}</div>
                      <div style={{fontSize:18,fontWeight:900,color:v.color}}>{adminData.filter(j=>j.estadoPago===k).length}</div>
                      <div style={{fontSize:8,color:v.color,textTransform:"uppercase",letterSpacing:1}}>{k}</div>
                    </div>
                  ))}
                </div>

                {adminLoading&&<Spinner/>}
                {adminError&&<ErrMsg msg={adminError} onRetry={loadAdminData}/>}
                {!adminLoading&&adminData.map((j)=>{
                  const est=ESTADO_PAGO[j.estadoPago]||ESTADO_PAGO.pendiente;
                  const rank=jugadoras.findIndex(p=>p.nombre?.toLowerCase()===j.nombre?.toLowerCase());
                  return (
                    <div key={j.nombre} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px 14px",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                        <Avatar name={j.nombre} rank={rank>=0?rank:0} size={34} photoUrl={fotos[j.nombre]}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:11,fontWeight:700,color:"white",textTransform:"uppercase",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{j.nombre}</div>
                          <div style={{fontSize:9,color:"rgba(255,255,255,0.3)"}}>{rank>=0?`#${rank+1} en tabla`:"Sin datos"}</div>
                        </div>
                        <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:100,background:est.bg,border:`1px solid ${est.border}`,color:est.color,whiteSpace:"nowrap"}}>{est.label}</span>
                      </div>
                      {/* Botones de estado */}
                      <div style={{display:"flex",gap:6}}>
                        {["pendiente","pagado","rechazado"].map(estado=>(
                          <button key={estado} onClick={()=>handleUpdatePago(j.nombre,estado)}
                            disabled={j.estadoPago===estado}
                            style={{flex:1,background:j.estadoPago===estado?ESTADO_PAGO[estado].bg:"rgba(255,255,255,0.06)",
                              border:`1px solid ${j.estadoPago===estado?ESTADO_PAGO[estado].border:"rgba(255,255,255,0.1)"}`,
                              color:j.estadoPago===estado?ESTADO_PAGO[estado].color:"rgba(255,255,255,0.45)",
                              fontSize:9,fontWeight:700,padding:"7px 4px",borderRadius:8,
                              cursor:j.estadoPago===estado?"default":"pointer",
                              textTransform:"uppercase",letterSpacing:0.5}}>
                            {estado==="pendiente"?"⏳ Pend.":estado==="pagado"?"✅ Pagó":"❌ Rech."}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {!adminLoading&&adminData.length===0&&(
                  <div style={{textAlign:"center",color:"rgba(255,255,255,0.3)",fontSize:12,padding:"24px 0"}}>
                    No hay inscriptas aún para la próxima fecha
                  </div>
                )}
              </div>
        )}

      </div>

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(15,0,35,0.97)",borderTop:"1px solid rgba(232,79,160,0.22)",backdropFilter:"blur(20px)",display:"flex",zIndex:200,boxShadow:"0 -4px 24px rgba(0,0,0,0.6)"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>{ navTo(t.id); if(t.id==="admin"&&!isAdmin) setShowPin(true); }}
            style={{flex:1,border:"none",cursor:"pointer",background:"none",padding:"10px 2px 12px",display:"flex",flexDirection:"column",alignItems:"center",gap:3,transition:"all 0.2s"}}>
            <span style={{fontSize:17,lineHeight:1,filter:tab===t.id?"drop-shadow(0 0 6px #e84fa0)":"none",transform:tab===t.id?"scale(1.2)":"scale(1)",transition:"all 0.2s"}}>{t.icon}</span>
            <span style={{fontSize:8,fontWeight:700,letterSpacing:0.8,textTransform:"uppercase",transition:"color 0.2s",color:tab===t.id?"#f472b6":"rgba(255,255,255,0.28)"}}>{t.label}</span>
            {tab===t.id&&<div style={{width:4,height:4,borderRadius:"50%",background:"#e84fa0",boxShadow:"0 0 6px #e84fa0"}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
