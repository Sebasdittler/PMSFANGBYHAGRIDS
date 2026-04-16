// ============================================================
// SitioWeb.jsx — Panel admin: propiedades de la web pública
// ============================================================

import { useState, useEffect, useRef } from "react";

const COLL_WEB = "sitioWeb_propiedades";
const URL_WEB  = "https://web-page-pms.vercel.app";

// ── Cloudinary ───────────────────────────────────────────────
const CLD_CLOUD  = "dpedzxviy";
const CLD_PRESET = "fang-fotos";

const TIPOS = ["Cabaña", "Casa", "Loft", "Departamento", "Chalet", "Suite", "Otro"];
const MONEDAS = ["USD", "ARS"];
const AMENITIES_SUGERIDOS = [
  "Chimenea", "Vista lago", "Vista cordillera", "Asador",
  "Deck", "Jardín", "Jacuzzi", "Estacionamiento",
  "Wi-Fi", "Calefacción central", "Aire acondicionado",
  "Lavarropas", "Cocina equipada", "Lavavajillas",
];

const TEMP_VACIA = (nombre, color) => ({
  nombre, color,
  rangos: [{ desde: "", hasta: "" }],
  precioBase: "", huespedes: "", extraPorHuesped: "", minimoNoches: "",
});

// ── Helpers de fechas ────────────────────────────────────────
const MESES_NOM   = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MESES_SHORT = ["01","02","03","04","05","06","07","08","09","10","11","12"];
const DIAS_MES_MAX = [31,29,31,30,31,30,31,31,30,31,30,31];

function parseMmDd(s) {
  if (!s) return { m: "", d: "" };
  const parts = s.split("-");
  if (parts.length === 2) return { m: parts[0] || "", d: parts[1] || "" };
  return { m: "", d: "" };
}
function buildMmDd(m, d) {
  if (!m) return "";
  if (!d) return String(m).padStart(2,"0") + "-";
  return String(m).padStart(2,"0") + "-" + String(d).padStart(2,"0");
}

// ── Timeline anual ────────────────────────────────────────────
const DIAS_MES_NORM = [31,28,31,30,31,30,31,31,30,31,30,31];
const MES_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function mmddToIdx(mmdd) {
  if (!mmdd) return -1;
  const parts = mmdd.split("-");
  if (parts.length !== 2) return -1;
  const mm = parseInt(parts[0]), dd = parseInt(parts[1]);
  if (!mm || !dd || mm < 1 || mm > 12) return -1;
  let idx = 0;
  for (let i = 0; i < mm - 1; i++) idx += DIAS_MES_NORM[i];
  return idx + dd - 1;
}
function isInRangeIdx(dayIdx, desde, hasta) {
  const d = mmddToIdx(desde), h = mmddToIdx(hasta);
  if (d < 0 || h < 0) return false;
  if (d <= h) return dayIdx >= d && dayIdx <= h;
  return dayIdx >= d || dayIdx <= h;
}

function TimelineAnual({ tarifas }) {
  const TOTAL = 365;
  const coverage = new Array(TOTAL).fill(null);
  const overlaps = new Array(TOTAL).fill(false);
  for (let i = 0; i < TOTAL; i++) {
    let count = 0, first = null;
    for (const t of tarifas) {
      for (const r of (t.rangos || [])) {
        if (isInRangeIdx(i, r.desde, r.hasta)) { if (!first) first = t; count++; }
      }
    }
    coverage[i] = first; if (count > 1) overlaps[i] = true;
  }
  const segments = []; let i = 0;
  while (i < TOTAL) {
    const t = coverage[i], ol = overlaps[i]; let j = i + 1;
    while (j < TOTAL && coverage[j] === t && overlaps[j] === ol) j++;
    segments.push({ temp: t, overlap: ol, count: j - i }); i = j;
  }
  const sinCubrir = coverage.filter(c => !c).length;
  const solapados = overlaps.filter(Boolean).length;
  const hayDatos  = tarifas.some(t => t.rangos?.some(r => r.desde && r.hasta));
  if (!hayDatos) return null;
  return (
    <div style={{ marginTop:"1.2rem", marginBottom:"0.4rem" }}>
      <div style={{ fontSize:"0.68rem", fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Vista anual</div>
      <div style={{ display:"flex", marginBottom:2 }}>
        {DIAS_MES_NORM.map((d,i) => (
          <div key={i} style={{ flex:d, textAlign:"center", fontSize:"0.58rem", color:C.muted }}>{MES_LABELS[i]}</div>
        ))}
      </div>
      <div style={{ display:"flex", height:22, borderRadius:6, overflow:"hidden", border:`1px solid ${C.border}` }}>
        {segments.map((seg, i) => (
          <div key={i} title={seg.overlap ? "⚠ Solapamiento" : (seg.temp ? seg.temp.nombre : "Sin cobertura")}
            style={{ flex: seg.count, background: seg.overlap ? "#e05252" : (seg.temp ? seg.temp.color : "rgba(255,255,255,0.07)"), opacity: seg.overlap ? 1 : (seg.temp ? 0.82 : 1) }}
          />
        ))}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:7, alignItems:"center" }}>
        {tarifas.map((t,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:t.color, opacity:0.82 }}/>
            <span style={{ fontSize:"0.65rem", color:C.muted }}>{t.nombre}</span>
          </div>
        ))}
        {sinCubrir > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:"rgba(255,255,255,0.1)", border:`1px solid ${C.border}` }}/>
            <span style={{ fontSize:"0.65rem", color:C.muted }}>Sin cobertura</span>
          </div>
        )}
      </div>
      {solapados > 0 && (
        <div style={{ marginTop:8, padding:"0.45rem 0.8rem", background:"rgba(224,82,82,0.13)", border:"1px solid rgba(224,82,82,0.4)", borderRadius:6, fontSize:"0.74rem", color:"#e05252" }}>
          ⚠ {solapados} día{solapados>1?"s":""} se solapan entre temporadas — revisá los rangos.
        </div>
      )}
      {sinCubrir > 0 && sinCubrir < TOTAL && (
        <div style={{ marginTop:6, padding:"0.45rem 0.8rem", background:`rgba(224,159,62,0.12)`, border:`1px solid rgba(224,159,62,0.35)`, borderRadius:6, fontSize:"0.74rem", color:C.amber }}>
          ⚠ {sinCubrir} día{sinCubrir>1?"s":""} sin temporada asignada.
        </div>
      )}
    </div>
  );
}

const WEB_VACIO = {
  nombreWeb: "", descripcion: "", tipo: "Cabaña",
  capacidad: "", camas: "", banos: "",
  precio: "", moneda: "USD", sitioUrl: "",
  amenities: [], fotos: [], fotoUrl: "",
  mostrarEnWeb: false, orden: 99,
  tarifas: [
    TEMP_VACIA("Temporada alta",  "#e09f3e"),
    TEMP_VACIA("Temporada media", "#52b788"),
    TEMP_VACIA("Temporada baja",  "#5b8fd4"),
  ],
};

// ── Tokens de diseño ─────────────────────────────────────────
const C = {
  bg:        "#111827",
  surface:   "#1a2332",
  surface2:  "#1e2d3d",
  border:    "rgba(255,255,255,0.1)",
  border2:   "rgba(255,255,255,0.06)",
  text:      "#f0f4f8",
  muted:     "#a0aab4",
  green:     "#52b788",
  greenDim:  "rgba(82,183,136,0.18)",
  greenBrd:  "rgba(82,183,136,0.4)",
  amber:     "#e09f3e",
  amberDim:  "rgba(224,159,62,0.15)",
  red:       "#e05252",
  redDim:    "rgba(224,82,82,0.15)",
};

const S = {
  label: { display:"block", fontSize:"0.7rem", fontWeight:700, color:C.muted, marginBottom:5, letterSpacing:"0.08em", textTransform:"uppercase" },
  inp:   { width:"100%", padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:"0.92rem", fontFamily:"inherit", outline:"none", background:C.surface2, color:C.text, boxSizing:"border-box" },
  btnPrimary: { padding:"9px 22px", background:"#2d6a4f", color:"#fff", border:`1px solid ${C.green}`, borderRadius:8, cursor:"pointer", fontSize:"0.9rem", fontWeight:700 },
  btnGhost:   { padding:"9px 18px", background:"rgba(255,255,255,0.06)", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:"0.88rem" },
  btnSm: (bg, brd) => ({ padding:"6px 14px", background:bg, color:"#fff", border:`1px solid ${brd||"transparent"}`, borderRadius:6, cursor:"pointer", fontSize:"0.8rem", fontWeight:600 }),
};

function CompletitudBar({ web }) {
  const checks = [!!web?.descripcion, (web?.fotos?.length > 0)||!!web?.fotoUrl, (web?.tarifas?.some(t=>t.precioBase))||!!web?.precio, (web?.amenities?.length>0), !!web?.tipo];
  const ok = checks.filter(Boolean).length;
  const pct = Math.round((ok / checks.length) * 100);
  const color = pct===100?C.green:pct>=60?C.amber:C.red;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
      <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.08)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:2, transition:"width 0.4s" }}/>
      </div>
      <span style={{ fontSize:"0.68rem", color, fontWeight:700, minWidth:28 }}>{pct}%</span>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div style={{ marginBottom:"1.6rem" }}>
      <div style={{ fontSize:"0.68rem", fontWeight:700, color:C.green, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:"1rem", paddingBottom:"0.5rem", borderBottom:`1px solid ${C.border2}` }}>
        {titulo}
      </div>
      {children}
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────
const TABS = [
  { id:"propiedades", label:"Propiedades", icon:"🏠" },
  { id:"portada",     label:"Portada",     icon:"🖼️" },
  { id:"partners",    label:"Partners",    icon:"🤝" },
  { id:"actividades", label:"Actividades", icon:"🏔️" },
  { id:"nosotros",    label:"Nosotros",    icon:"👥" },
  { id:"faq",         label:"FAQ",         icon:"❓" },
  { id:"resenas",     label:"Reseñas",     icon:"⭐" },
];

function TabBar({ tab, setTab }) {
  return (
    <div style={{ display:"flex", gap:0, flexWrap:"wrap", marginBottom:"1.5rem", borderBottom:`1px solid ${C.border}` }}>
      {TABS.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          padding:"9px 16px", border:"none", background:"none", cursor:"pointer",
          fontSize:"0.82rem", fontWeight: tab===t.id ? 700 : 400,
          color: tab===t.id ? C.green : C.muted,
          borderBottom: tab===t.id ? `2px solid ${C.green}` : "2px solid transparent",
          marginBottom:"-1px", display:"flex", alignItems:"center", gap:6,
          transition:"color 0.15s", whiteSpace:"nowrap",
        }}>
          <span>{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

function TabProximamente({ icon, titulo, descripcion }) {
  return (
    <div style={{ textAlign:"center", padding:"4rem 2rem", border:`2px dashed ${C.border}`, borderRadius:12, color:C.muted }}>
      <div style={{ fontSize:"2.5rem", marginBottom:"1rem" }}>{icon}</div>
      <div style={{ fontWeight:700, fontSize:"1rem", color:C.text, marginBottom:"0.5rem" }}>{titulo}</div>
      <p style={{ fontSize:"0.85rem", lineHeight:1.7, maxWidth:400, margin:"0 auto" }}>{descripcion}</p>
    </div>
  );
}

// ── Tab Actividades ───────────────────────────────────────
const ACT_VACIO = { titulo:"", icono:"", descripcion:"", fotos:[] };

function TabActividades() {
  const [lista,       setLista]       = useState([]);
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [editIdx,     setEditIdx]     = useState(null);
  const [form,        setForm]        = useState(ACT_VACIO);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!window._db) return;
    const unsub = window._db.collection("sitioWeb_config").doc("destinos")
      .onSnapshot(snap => {
        setLista(snap.exists ? (snap.data().lista || []) : []);
      }, () => {});
    return () => unsub();
  }, []);

  async function guardarLista(nuevaLista) {
    if (!window._db) return;
    setSaving(true);
    try { await window._db.collection("sitioWeb_config").doc("destinos").set({ lista: nuevaLista }); }
    catch(e) { alert("Error: "+e.message); }
    finally { setSaving(false); }
  }

  async function subirFotos(files) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(async file => {
        const blob = await comprimirImg(file);
        const fd = new FormData();
        fd.append("file", blob, file.name.replace(/\.[^.]+$/,".jpg"));
        fd.append("upload_preset", CLD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, { method:"POST", body:fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message||"Error");
        return data.secure_url;
      }));
      setForm(f => ({ ...f, fotos: [...f.fotos, ...urls] }));
    } catch(e) { alert("Error al subir: "+e.message); }
    finally { setUploading(false); if(fileRef.current) fileRef.current.value=""; }
  }

  async function comprimirImg(file, maxW=1600, quality=0.82) {
    return new Promise(resolve => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        let w=img.width, h=img.height;
        if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
        const c=document.createElement("canvas"); c.width=w; c.height=h;
        c.getContext("2d").drawImage(img,0,0,w,h);
        URL.revokeObjectURL(url);
        c.toBlob(b=>resolve(b||file),"image/jpeg",quality);
      };
      img.onerror=()=>{URL.revokeObjectURL(url);resolve(file);};
      img.src=url;
    });
  }

  function abrirNuevo() { setForm(ACT_VACIO); setEditIdx(null); setShowForm(true); }
  function abrirEditar(idx) { setForm({ ...lista[idx], fotos:[...lista[idx].fotos||[]] }); setEditIdx(idx); setShowForm(true); }
  function cerrar() { setShowForm(false); setForm(ACT_VACIO); setEditIdx(null); }

  async function guardar() {
    if (!form.titulo.trim()) { alert("El título es obligatorio"); return; }
    const item = { titulo:form.titulo.trim(), icono:form.icono.trim(), descripcion:form.descripcion.trim(), fotos:form.fotos };
    const nueva = editIdx === null ? [...lista, item] : lista.map((a,i)=>i===editIdx?item:a);
    await guardarLista(nueva);
    cerrar();
  }
  async function eliminar(idx) {
    if (!window.confirm("¿Eliminar esta actividad?")) return;
    await guardarLista(lista.filter((_,i)=>i!==idx));
  }
  async function mover(idx, dir) {
    const arr=[...lista], swap=idx+dir;
    if(swap<0||swap>=arr.length) return;
    [arr[idx],arr[swap]]=[arr[swap],arr[idx]];
    await guardarLista(arr);
  }

  return (
    <div>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.2rem", flexWrap:"wrap", gap:12 }}>
        <p style={{ fontSize:"0.83rem", color:C.muted, lineHeight:1.6, maxWidth:520 }}>
          Actividades y lugares para mostrar en la página de inicio. Cada card tiene fotos en slideshow, ícono, título y descripción corta.
        </p>
        <button onClick={abrirNuevo} style={S.btnPrimary}>+ Agregar actividad</button>
      </div>

      {lista.length===0&&!showForm&&(
        <div style={{ textAlign:"center", padding:"3rem", border:`2px dashed ${C.border}`, borderRadius:12, color:C.muted }}>
          <div style={{ fontSize:"2rem", marginBottom:"0.8rem" }}>🏔️</div>
          <p>Todavía no hay actividades. Hacé clic en <strong style={{color:C.green}}>+ Agregar actividad</strong>.</p>
        </div>
      )}

      {lista.map((act,idx)=>(
        <div key={idx} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:"0.75rem", padding:"1rem 1.2rem", display:"flex", alignItems:"center", gap:"1rem" }}>
          {/* Preview foto */}
          <div style={{ width:70, height:52, flexShrink:0, borderRadius:8, overflow:"hidden", background:"rgba(255,255,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem" }}>
            {act.fotos?.[0]
              ? <img src={act.fotos[0]} alt={act.titulo} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : <span>{act.icono||"📍"}</span>
            }
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:"0.92rem", color:C.text }}>{act.icono} {act.titulo}</div>
            {act.descripcion&&<div style={{ fontSize:"0.78rem", color:C.muted, marginTop:2, lineHeight:1.4, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" }}>{act.descripcion}</div>}
            <div style={{ fontSize:"0.7rem", color:C.muted, marginTop:3 }}>{act.fotos?.length||0} foto{act.fotos?.length!==1?"s":""}</div>
          </div>
          <div style={{ display:"flex", gap:6, flexShrink:0 }}>
            <button onClick={()=>mover(idx,-1)} disabled={idx===0} style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"4px 9px", cursor:idx===0?"default":"pointer", opacity:idx===0?0.3:1, fontSize:"0.85rem" }}>↑</button>
            <button onClick={()=>mover(idx,1)} disabled={idx===lista.length-1} style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"4px 9px", cursor:idx===lista.length-1?"default":"pointer", opacity:idx===lista.length-1?0.3:1, fontSize:"0.85rem" }}>↓</button>
            <button onClick={()=>abrirEditar(idx)} style={S.btnSm("#2d6a4f",C.green)}>Editar</button>
            <button onClick={()=>eliminar(idx)} style={{ ...S.btnSm("transparent",C.red), color:C.red }}>✕</button>
          </div>
        </div>
      ))}

      {showForm&&(
        <div style={{ background:C.surface, border:`1px solid ${C.greenBrd}`, borderRadius:12, padding:"1.4rem", marginTop:"1rem" }}>
          <div style={{ fontWeight:700, fontSize:"0.92rem", color:C.green, marginBottom:"1.2rem" }}>
            {editIdx===null?"Nueva actividad":"Editar actividad"}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:"1rem", marginBottom:"1rem" }}>
            <div>
              <label style={S.label}>Título *</label>
              <input value={form.titulo} onChange={e=>setForm(f=>({...f,titulo:e.target.value}))} placeholder="Ej: Bosque de Arrayanes" style={S.inp}/>
            </div>
            <div>
              <label style={S.label}>Ícono (emoji)</label>
              <input value={form.icono} onChange={e=>setForm(f=>({...f,icono:e.target.value}))} placeholder="🌲" style={{...S.inp, width:72, textAlign:"center", fontSize:"1.3rem"}}/>
            </div>
          </div>

          <div style={{ marginBottom:"1rem" }}>
            <label style={S.label}>Descripción corta</label>
            <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} rows={2} placeholder="Una frase que describa el lugar o la actividad…" style={{...S.inp, resize:"vertical"}}/>
          </div>

          {/* Fotos */}
          <label style={S.label}>Fotos ({form.fotos.length})</label>
          {form.fotos.length>0&&(
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"0.8rem" }}>
              {form.fotos.map((url,fi)=>(
                <div key={fi} style={{ position:"relative", width:90, height:65 }}>
                  <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:6, display:"block", border: fi===0?`2px solid ${C.green}`:`1px solid ${C.border}` }}/>
                  {fi===0&&<div style={{ position:"absolute", top:2, left:2, background:"rgba(82,183,136,0.9)", color:"#fff", fontSize:"0.5rem", padding:"1px 4px", borderRadius:3, fontWeight:700 }}>1ERA</div>}
                  <button onClick={()=>setForm(f=>({...f,fotos:f.fotos.filter((_,j)=>j!==fi)}))} style={{ position:"absolute", top:-5, right:-5, width:16, height:16, borderRadius:"50%", background:C.red, border:"none", color:"#fff", fontSize:"0.65rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${C.border}`, borderRadius:8, padding:"0.8rem", textAlign:"center", marginBottom:"1.2rem" }}>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={e=>subirFotos(e.target.files)} style={{ display:"none" }} id="act-foto-upload"/>
            <label htmlFor="act-foto-upload" style={{ cursor:"pointer", display:"inline-flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <span style={{ fontSize:"1.2rem" }}>📷</span>
              <span style={{ fontSize:"0.8rem", color:C.green, fontWeight:600 }}>{uploading?"Subiendo…":"Subir fotos"}</span>
              <span style={{ fontSize:"0.68rem", color:C.muted }}>JPG o PNG · podés seleccionar varias · se optimizan automáticamente</span>
            </label>
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
            <button onClick={cerrar} style={S.btnGhost}>Cancelar</button>
            <button onClick={guardar} disabled={saving||uploading} style={S.btnPrimary}>{saving?"Guardando…":"Guardar"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab Nosotros ──────────────────────────────────────────
function TabNosotros() {
  const [data,    setData]    = useState({ parrafo1:"", parrafo2:"", foto:"" });
  const [saving,  setSaving]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const fotoRef = useRef(null);

  useEffect(() => {
    if (!window._db) return;
    const unsub = window._db.collection("sitioWeb_config").doc("nosotros")
      .onSnapshot(snap => {
        if (snap.exists) setData({ parrafo1:"", parrafo2:"", foto:"", ...snap.data() });
      }, () => {});
    return () => unsub();
  }, []);

  async function subirFotoNosotros(file) {
    setUploading(true);
    try {
      const blob = await comprimirImg(file);
      const fd = new FormData();
      fd.append("file", blob, file.name.replace(/\.[^.]+$/,".jpg"));
      fd.append("upload_preset", CLD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, { method:"POST", body:fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message||"Error");
      setData(d => ({ ...d, foto: json.secure_url }));
    } catch(e) { alert("Error al subir: "+e.message); }
    finally { setUploading(false); if(fotoRef.current) fotoRef.current.value=""; }
  }

  async function comprimirImg(file, maxW=1920, quality=0.85) {
    return new Promise(resolve => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        let w=img.width, h=img.height;
        if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
        const c=document.createElement("canvas"); c.width=w; c.height=h;
        c.getContext("2d").drawImage(img,0,0,w,h);
        URL.revokeObjectURL(url);
        c.toBlob(b=>resolve(b||file),"image/jpeg",quality);
      };
      img.onerror=()=>{URL.revokeObjectURL(url);resolve(file);};
      img.src=url;
    });
  }

  async function guardar() {
    if (!window._db) return;
    setSaving(true);
    try {
      await window._db.collection("sitioWeb_config").doc("nosotros").set(data, { merge:true });
      setSaved(true); setTimeout(()=>setSaved(false), 2500);
    } catch(e) { alert("Error: "+e.message); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <p style={{ fontSize:"0.83rem", color:C.muted, marginBottom:"1.5rem", lineHeight:1.6 }}>
        Los textos y la foto se actualizan en la web en tiempo real, sin deploy. Los valores y el diseño de la sección quedan fijos.
      </p>

      {/* Foto */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"1.2rem 1.4rem", marginBottom:"1rem" }}>
        <div style={{ fontWeight:700, fontSize:"0.9rem", color:C.text, marginBottom:4 }}>📸 Foto del equipo</div>
        <div style={{ fontSize:"0.75rem", color:C.muted, marginBottom:"1rem" }}>Relación de aspecto 4:5 recomendada (portrait). Se muestra a la izquierda del texto.</div>
        <div style={{ display:"flex", alignItems:"center", gap:"1.2rem", flexWrap:"wrap" }}>
          {data.foto && (
            <div style={{ position:"relative", flexShrink:0 }}>
              <img src={data.foto} alt="Equipo" style={{ width:100, height:125, objectFit:"cover", borderRadius:10, display:"block", border:`1px solid ${C.border}` }}/>
              <button onClick={()=>setData(d=>({...d,foto:""}))} style={{ position:"absolute", top:-6, right:-6, width:20, height:20, borderRadius:"50%", background:C.red, border:"none", color:"#fff", fontSize:"0.75rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          )}
          <div style={{ flex:1 }}>
            <div style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${C.border}`, borderRadius:8, padding:"0.9rem", textAlign:"center" }}>
              <input ref={fotoRef} type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&subirFotoNosotros(e.target.files[0])} style={{ display:"none" }} id="nosotros-foto-upload"/>
              <label htmlFor="nosotros-foto-upload" style={{ cursor:"pointer", display:"inline-flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:"1.3rem" }}>📷</span>
                <span style={{ fontSize:"0.82rem", color:C.green, fontWeight:600 }}>{uploading?"Subiendo…":(data.foto?"Cambiar foto":"Subir foto del equipo")}</span>
                <span style={{ fontSize:"0.7rem", color:C.muted }}>JPG o PNG</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Textos */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"1.2rem 1.4rem", marginBottom:"1rem" }}>
        <div style={{ fontWeight:700, fontSize:"0.9rem", color:C.text, marginBottom:"1rem" }}>✏️ Textos</div>
        <div style={{ marginBottom:"1rem" }}>
          <label style={S.label}>Párrafo 1</label>
          <textarea value={data.parrafo1} onChange={e=>setData(d=>({...d,parrafo1:e.target.value}))} rows={4} style={{...S.inp, resize:"vertical"}}
            placeholder="Somos Hagrids, una empresa de gestión de alquileres turísticos…"/>
        </div>
        <div>
          <label style={S.label}>Párrafo 2</label>
          <textarea value={data.parrafo2} onChange={e=>setData(d=>({...d,parrafo2:e.target.value}))} rows={3} style={{...S.inp, resize:"vertical"}}
            placeholder="Administramos cada propiedad como si fuera nuestra…"/>
        </div>
      </div>

      <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:12 }}>
        {saved && <span style={{ fontSize:"0.82rem", color:C.green }}>✓ Guardado</span>}
        <button onClick={guardar} disabled={saving||uploading} style={S.btnPrimary}>
          {saving?"Guardando…":"Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
export default function SitioWeb() {
  const [tab, setTab] = useState("propiedades");

  // Propiedades
  const [fangProps, setFangProps] = useState([]);
  const [webData,   setWebData]   = useState({});
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [form,      setForm]      = useState(WEB_VACIO);
  const [saving,    setSaving]    = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [amenInput, setAmenInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Portada
  const [fotosHero,     setFotosHero]     = useState([]);
  const [savingHero,    setSavingHero]    = useState(false);
  const [uploadHero,    setUploadHero]    = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);
  const fileHeroRef = useRef(null);
  const [videoHero,   setVideoHero]   = useState("");
  const [savingVideo, setSavingVideo] = useState(false);

  // Partners
  const [partners,        setPartners]        = useState([]);
  const [savingPartners,  setSavingPartners]  = useState(false);
  const [uploadingLogo,   setUploadingLogo]   = useState(false);
  const [partnerForm,     setPartnerForm]     = useState({ nombre:"", descripcion:"", logo:"" });
  const [editingPartner,  setEditingPartner]  = useState(null);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const logoRef = useRef(null);

  // ── Firestore ────────────────────────────────────────────
  useEffect(() => {
    if (!window._db) return;
    const u1 = window._db.collection("props")
      .onSnapshot(snap => setFangProps(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    const u2 = window._db.collection(COLL_WEB)
      .onSnapshot(snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = { docId:d.id, ...d.data() }; });
        setWebData(map); setLoading(false);
      }, () => setLoading(false));
    const u3 = window._db.collection("sitioWeb_config").doc("general")
      .onSnapshot(snap => {
        if (snap.exists) {
          setFotosHero(snap.data().fotosHero || []);
          setVideoHero(snap.data().videoHero || "");
        }
      }, () => {});
    const u4 = window._db.collection("sitioWeb_config").doc("partners")
      .onSnapshot(snap => {
        setPartners(snap.exists ? (snap.data().lista || []) : []);
      }, () => {});
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  // ── Cloudinary upload ────────────────────────────────────
  async function comprimirImagen(file, maxW=1920, quality=0.85) {
    return new Promise((resolve) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => resolve(blob || file), "image/jpeg", quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }
  async function subirImagen(file, comprimir = true) {
    const blob = comprimir ? await comprimirImagen(file) : file;
    const fd = new FormData();
    fd.append("file", blob, comprimir ? file.name.replace(/\.[^.]+$/, ".jpg") : file.name);
    fd.append("upload_preset", CLD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, { method:"POST", body:fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Error al subir");
    return data.secure_url;
  }

  // ── Portada ──────────────────────────────────────────────
  async function agregarFotosHero(files) {
    if (!files?.length) return;
    setUploadingHero(true); setUploadHero(`Subiendo ${files.length} foto${files.length>1?"s":""}…`);
    try {
      const urls = await Promise.all(Array.from(files).map(f => subirImagen(f)));
      setFotosHero(prev => [...prev, ...urls]);
      setUploadHero(`✓ ${urls.length} foto${urls.length>1?"s":""} agregada${urls.length>1?"s":""}`);
    } catch(e) { setUploadHero("Error: "+e.message); }
    finally { setUploadingHero(false); if(fileHeroRef.current) fileHeroRef.current.value=""; }
  }
  async function guardarFotosHero() {
    if (!window._db) return; setSavingHero(true);
    try { await window._db.collection("sitioWeb_config").doc("general").set({ fotosHero }, { merge:true }); }
    catch(e) { alert("Error: "+e.message); } finally { setSavingHero(false); }
  }
  async function guardarVideoHero() {
    if (!window._db) return; setSavingVideo(true);
    try { await window._db.collection("sitioWeb_config").doc("general").set({ videoHero: videoHero.trim() }, { merge:true }); }
    catch(e) { alert("Error: "+e.message); } finally { setSavingVideo(false); }
  }

  // ── Partners ─────────────────────────────────────────────
  async function subirLogo(file) {
    setUploadingLogo(true);
    try {
      // Sin comprimir para preservar transparencias PNG
      const url = await subirImagen(file, false);
      setPartnerForm(f => ({ ...f, logo: url }));
    } catch(e) { alert("Error al subir logo: "+e.message); }
    finally { setUploadingLogo(false); if(logoRef.current) logoRef.current.value=""; }
  }
  function abrirNuevoPartner() {
    setPartnerForm({ nombre:"", descripcion:"", logo:"" });
    setEditingPartner(null); setShowPartnerForm(true);
  }
  function abrirEditarPartner(idx) {
    setPartnerForm({ ...partners[idx] });
    setEditingPartner(idx); setShowPartnerForm(true);
  }
  function cerrarPartnerForm() {
    setShowPartnerForm(false);
    setPartnerForm({ nombre:"", descripcion:"", logo:"" });
    setEditingPartner(null);
  }
  async function guardarPartner() {
    if (!partnerForm.nombre.trim()) { alert("El nombre es obligatorio"); return; }
    const nuevo = { nombre:partnerForm.nombre.trim(), descripcion:partnerForm.descripcion.trim(), logo:partnerForm.logo };
    const lista = editingPartner === null
      ? [...partners, nuevo]
      : partners.map((p,i) => i===editingPartner ? nuevo : p);
    setSavingPartners(true);
    try {
      await window._db.collection("sitioWeb_config").doc("partners").set({ lista });
      cerrarPartnerForm();
    } catch(e) { alert("Error: "+e.message); }
    finally { setSavingPartners(false); }
  }
  async function eliminarPartner(idx) {
    if (!window.confirm("¿Eliminar este partner?")) return;
    const lista = partners.filter((_,i) => i!==idx);
    try { await window._db.collection("sitioWeb_config").doc("partners").set({ lista }); }
    catch(e) { alert("Error: "+e.message); }
  }
  async function moverPartner(idx, dir) {
    const lista = [...partners], swap = idx+dir;
    if (swap<0||swap>=lista.length) return;
    [lista[idx],lista[swap]]=[lista[swap],lista[idx]];
    try { await window._db.collection("sitioWeb_config").doc("partners").set({ lista }); }
    catch(e) { alert("Error: "+e.message); }
  }

  // ── Propiedades ──────────────────────────────────────────
  function abrirEditar(fangProp) {
    const existing = webData[fangProp.id] || {};
    const dorms = Array.isArray(fangProp.dormitorios) ? fangProp.dormitorios : [];
    const camasCalc = dorms.reduce((s,d)=>s+(d.matrimoniales||0)+(d.simples||0),0);
    const capacCalc = dorms.reduce((s,d)=>s+(d.matrimoniales||0)*2+(d.simples||0),0);
    const nombreWeb = existing.nombre && existing.nombre!==fangProp.name ? existing.nombre : fangProp.name;
    const tarifas = existing.tarifas?.length===3 ? existing.tarifas : [TEMP_VACIA("Temporada alta","#e09f3e"),TEMP_VACIA("Temporada media","#52b788"),TEMP_VACIA("Temporada baja","#5b8fd4")];
    setForm({ ...WEB_VACIO, camas:camasCalc||"", capacidad:capacCalc||"", ...existing, fotos:existing.fotos||(existing.fotoUrl?[existing.fotoUrl]:[]), nombreWeb, tarifas });
    setUploadMsg(""); setModal(fangProp);
  }
  function cerrar() { setModal(null); setSaving(false); setUploadMsg(""); }
  async function toggleWeb(fangProp) {
    if (!window._db) return;
    const existing = webData[fangProp.id];
    const nuevoValor = !(existing?.mostrarEnWeb||false);
    if (existing) await window._db.collection(COLL_WEB).doc(fangProp.id).update({ mostrarEnWeb:nuevoValor });
    else await window._db.collection(COLL_WEB).doc(fangProp.id).set({ nombre:fangProp.name, nombreFang:fangProp.name, mostrarEnWeb:nuevoValor, orden:99, createdAt:window.firebase.firestore.FieldValue.serverTimestamp() });
  }
  async function agregarFotos(files) {
    if (!files?.length) return;
    setUploading(true); setUploadMsg(`Subiendo ${files.length} foto${files.length>1?"s":""}…`);
    try {
      const urls = await Promise.all(Array.from(files).map(f=>subirImagen(f)));
      setForm(f=>({...f,fotos:[...(f.fotos||[]),...urls]}));
      setUploadMsg(`✓ ${urls.length} foto${urls.length>1?"s":""} agregada${urls.length>1?"s":""}`);
    } catch(e) { setUploadMsg("Error: "+e.message); }
    finally { setUploading(false); if(fileRef.current) fileRef.current.value=""; }
  }
  function eliminarFoto(idx) { setForm(f=>({...f,fotos:f.fotos.filter((_,i)=>i!==idx)})); }
  function setPortada(idx) {
    setForm(f=>{const fotos=[...f.fotos];const[p]=fotos.splice(idx,1);return{...f,fotos:[p,...fotos]};});
  }
  async function guardar() {
    if (!window._db||!modal) return; setSaving(true);
    try {
      const data = { nombre:form.nombreWeb.trim()||modal.name, nombreFang:modal.name, descripcion:form.descripcion.trim(), tipo:form.tipo, capacidad:Number(form.capacidad)||0, camas:Number(form.camas)||0, banos:Number(form.banos)||0, precio:Number(form.precio)||0, moneda:form.moneda, amenities:form.amenities, tarifas:form.tarifas||[], fotos:form.fotos||[], fotoUrl:form.fotos?.[0]||form.fotoUrl||"", sitioUrl:form.sitioUrl?.trim()||"", mostrarEnWeb:Boolean(form.mostrarEnWeb), orden:Number(form.orden)||99, updatedAt:window.firebase.firestore.FieldValue.serverTimestamp() };
      const docRef = window._db.collection(COLL_WEB).doc(modal.id);
      if (webData[modal.id]) { await docRef.update(data); }
      else { data.createdAt=window.firebase.firestore.FieldValue.serverTimestamp(); await docRef.set(data); }
      cerrar();
    } catch(e) { alert("Error: "+e.message); } finally { setSaving(false); }
  }
  function toggleAmenity(a) { setForm(f=>({...f,amenities:f.amenities.includes(a)?f.amenities.filter(x=>x!==a):[...f.amenities,a]})); }
  function addCustomAmenity() {
    const v=amenInput.trim();
    if(v&&!form.amenities.includes(v)) setForm(f=>({...f,amenities:[...f.amenities,v]}));
    setAmenInput("");
  }

  const totalVisibles = Object.values(webData).filter(w=>w.mostrarEnWeb).length;

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding:"1.5rem", maxWidth:900, color:C.text }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.2rem", flexWrap:"wrap", gap:"0.8rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:"0.75rem", background:C.greenDim, color:C.green, border:`1px solid ${C.greenBrd}`, borderRadius:20, padding:"3px 12px", fontWeight:700 }}>
            {totalVisibles} visible{totalVisibles!==1?"s":""}
          </span>
          <span style={{ fontSize:"0.78rem", color:C.muted }}>de {fangProps.length} propiedades en FANG</span>
        </div>
        <a href={URL_WEB} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", background:C.greenDim, color:C.green, border:`1px solid ${C.greenBrd}`, borderRadius:8, fontSize:"0.82rem", fontWeight:600, textDecoration:"none" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Ver web pública
        </a>
      </div>

      <TabBar tab={tab} setTab={setTab} />

      {/* ══ PROPIEDADES ══════════════════════════════════════ */}
      {tab === "propiedades" && (
        <div>
          <p style={{ fontSize:"0.83rem", color:C.muted, marginBottom:"1.2rem", lineHeight:1.6 }}>
            Activá <strong style={{color:C.green}}>Visible</strong> para publicar en la web. Usá <strong style={{color:C.green}}>Editar</strong> para cargar fotos, descripción y precio.
          </p>
          {loading && <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}><div style={{ width:28, height:28, border:`2px solid ${C.border}`, borderTopColor:C.green, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 1rem" }}/>Cargando…</div>}
          {!loading && fangProps.length===0 && <div style={{ textAlign:"center", padding:"3rem", color:C.muted, border:`2px dashed ${C.border}`, borderRadius:12 }}><div style={{ fontSize:"2rem", marginBottom:"0.8rem" }}>🏠</div><p>No hay propiedades en FANG todavía.</p></div>}
          {fangProps.map(p => {
            const web=webData[p.id], visible=web?.mostrarEnWeb||false;
            const fotos=web?.fotos?.length?web.fotos:(web?.fotoUrl?[web.fotoUrl]:[]);
            return (
              <div key={p.id} style={{ background:C.surface, border:`1px solid ${visible?C.greenBrd:C.border}`, borderRadius:12, marginBottom:"0.8rem", overflow:"hidden", transition:"border-color 0.2s" }}>
                <div style={{ display:"flex", alignItems:"stretch" }}>
                  <div style={{ width:100, flexShrink:0, position:"relative" }}>
                    {fotos[0] ? <img src={fotos[0]} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/> : <div style={{ width:"100%", height:"100%", minHeight:80, background:"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem" }}>🏠</div>}
                    {fotos.length>1 && <div style={{ position:"absolute", bottom:5, right:5, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:"0.65rem", padding:"2px 6px", borderRadius:8, fontWeight:700 }}>{fotos.length} fotos</div>}
                  </div>
                  <div style={{ flex:1, padding:"0.9rem 1.1rem", minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"0.8rem", flexWrap:"wrap" }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <div style={{ width:10, height:10, borderRadius:"50%", background:p.color||C.green, flexShrink:0 }}/>
                          <span style={{ fontWeight:700, fontSize:"0.97rem", color:C.text }}>{web?.nombre&&web.nombre!==p.name?web.nombre:p.name}</span>
                          {web?.nombre&&web.nombre!==p.name&&<span style={{ fontSize:"0.7rem", color:C.muted }}>FANG: {p.name}</span>}
                        </div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
                          {web?.tipo&&<Tag>{web.tipo}</Tag>}
                          {web?.capacidad?<Tag>👥 {web.capacidad} huéspedes</Tag>:null}
                          {web?.banos?<Tag>🚿 {web.banos} baño{web.banos>1?"s":""}</Tag>:null}
                          {web?.precio?<Tag>💰 {web.moneda} {web.precio}/noche</Tag>:null}
                          {web?.amenities?.length?<Tag>✓ {web.amenities.length} comodidades</Tag>:null}
                        </div>
                        {web?<CompletitudBar web={web}/>:<div style={{ fontSize:"0.73rem", color:C.amber, marginTop:6 }}>⚠ Sin detalles web — hacé clic en Editar</div>}
                      </div>
                      <div style={{ display:"flex", gap:7, alignItems:"center", flexShrink:0 }}>
                        <button onClick={()=>toggleWeb(p)} style={{ padding:"5px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:"0.78rem", fontWeight:700, background:visible?C.greenDim:"rgba(255,255,255,0.07)", color:visible?C.green:C.muted }}>{visible?"✓ Visible":"Oculta"}</button>
                        <button onClick={()=>abrirEditar(p)} style={S.btnSm("#2d6a4f",C.green)}>Editar</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ PORTADA ══════════════════════════════════════════ */}
      {tab === "portada" && (
        <div>
          <p style={{ fontSize:"0.83rem", color:C.muted, marginBottom:"1.5rem", lineHeight:1.6 }}>
            Configurá lo que ven los visitantes al entrar al sitio. El <strong style={{color:C.text}}>video</strong> tiene prioridad sobre las fotos si está cargado.
          </p>

          {/* Video */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"1.2rem 1.4rem", marginBottom:"1rem" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem", flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:"0.9rem", color:C.text }}>🎬 Video del hero</div>
                <div style={{ fontSize:"0.75rem", color:C.muted, marginTop:2 }}>MP4 desde Cloudinary · 10-15 seg, menos de 8MB recomendado.</div>
              </div>
              <button onClick={guardarVideoHero} disabled={savingVideo} style={S.btnPrimary}>{savingVideo?"Guardando…":"Guardar video"}</button>
            </div>
            <input type="url" value={videoHero} onChange={e=>setVideoHero(e.target.value)} placeholder="https://res.cloudinary.com/dpedzxviy/video/upload/q_auto/nombre.mp4" style={S.inp}/>
            {videoHero.trim()
              ? <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                  <span style={{ fontSize:"0.72rem", background:C.greenDim, color:C.green, border:`1px solid ${C.greenBrd}`, borderRadius:6, padding:"3px 10px" }}>✓ Video activo</span>
                  <button onClick={()=>setVideoHero("")} style={{ background:"none", border:"none", color:C.red, fontSize:"0.75rem", cursor:"pointer", textDecoration:"underline" }}>Quitar → volver a fotos</button>
                </div>
              : <div style={{ marginTop:6, fontSize:"0.72rem", color:C.muted, fontStyle:"italic" }}>Sin video — se muestra el slideshow de fotos.</div>
            }
          </div>

          {/* Fotos */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"1.2rem 1.4rem" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem", flexWrap:"wrap", gap:8 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:"0.9rem", color:C.text }}>🖼️ Slideshow de fotos</div>
                <div style={{ fontSize:"0.75rem", color:C.muted, marginTop:2 }}>Mínimo 1, recomendado 4-5. La primera se usa como poster del video.</div>
              </div>
              <button onClick={guardarFotosHero} disabled={savingHero} style={S.btnPrimary}>{savingHero?"Guardando…":"Guardar fotos"}</button>
            </div>
            {fotosHero.length>0 && (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"1rem" }}>
                {fotosHero.map((url,i)=>(
                  <div key={i} style={{ position:"relative", width:110, height:75 }}>
                    <img src={url} alt={`Hero ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:8, display:"block", border:`1px solid ${C.border}` }}/>
                    {i===0&&<div style={{ position:"absolute", top:3, left:3, background:"rgba(82,183,136,0.9)", color:"#fff", fontSize:"0.55rem", padding:"1px 5px", borderRadius:4, fontWeight:700 }}>1ERA</div>}
                    <button onClick={()=>setFotosHero(f=>f.filter((_,j)=>j!==i))} style={{ position:"absolute", top:-5, right:-5, width:18, height:18, borderRadius:"50%", background:"#e05252", border:"none", color:"#fff", fontSize:"0.7rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${C.border}`, borderRadius:8, padding:"0.9rem", textAlign:"center" }}>
              <input ref={fileHeroRef} type="file" accept="image/*" multiple onChange={e=>agregarFotosHero(e.target.files)} style={{ display:"none" }} id="hero-upload"/>
              <label htmlFor="hero-upload" style={{ cursor:"pointer", display:"inline-flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                <span style={{ fontSize:"1.3rem" }}>🖼️</span>
                <span style={{ fontSize:"0.82rem", color:C.green, fontWeight:600 }}>{uploadingHero?uploadHero:"Subir fotos de portada"}</span>
                <span style={{ fontSize:"0.7rem", color:C.muted }}>JPG o PNG · podés seleccionar varias</span>
              </label>
              {uploadHero&&!uploadingHero&&<div style={{ marginTop:6, fontSize:"0.78rem", color:C.green }}>{uploadHero}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ══ PARTNERS ═════════════════════════════════════════ */}
      {tab === "partners" && (
        <div>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.2rem", flexWrap:"wrap", gap:12 }}>
            <p style={{ fontSize:"0.83rem", color:C.muted, lineHeight:1.6, maxWidth:520 }}>
              Prestadores locales que ofrecen beneficios a los huéspedes. Se muestran en la web como logos — el detalle se comparte al confirmar la reserva. Podés reordenarlos con las flechas.
            </p>
            <button onClick={abrirNuevoPartner} style={S.btnPrimary}>+ Agregar partner</button>
          </div>

          {partners.length===0&&!showPartnerForm&&(
            <div style={{ textAlign:"center", padding:"3rem", border:`2px dashed ${C.border}`, borderRadius:12, color:C.muted }}>
              <div style={{ fontSize:"2rem", marginBottom:"0.8rem" }}>🤝</div>
              <p>Todavía no hay partners. Hacé clic en <strong style={{color:C.green}}>+ Agregar partner</strong> para empezar.</p>
            </div>
          )}

          {partners.map((p,idx)=>(
            <div key={idx} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:"0.75rem", padding:"1rem 1.2rem", display:"flex", alignItems:"center", gap:"1rem" }}>
              <div style={{ width:56, height:56, flexShrink:0, background:"rgba(255,255,255,0.9)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", border:`1px solid ${C.border}` }}>
                {p.logo ? <img src={p.logo} alt={p.nombre} style={{ width:"100%", height:"100%", objectFit:"contain", padding:4 }}/> : <span style={{ fontSize:"1.4rem" }}>🤝</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:"0.92rem", color:C.text }}>{p.nombre}</div>
                {p.descripcion&&<div style={{ fontSize:"0.78rem", color:C.muted, marginTop:2, lineHeight:1.5 }}>{p.descripcion}</div>}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                <button onClick={()=>moverPartner(idx,-1)} disabled={idx===0} style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"4px 9px", cursor:idx===0?"default":"pointer", opacity:idx===0?0.3:1, fontSize:"0.85rem" }}>↑</button>
                <button onClick={()=>moverPartner(idx,1)} disabled={idx===partners.length-1} style={{ background:"none", border:`1px solid ${C.border}`, color:C.muted, borderRadius:6, padding:"4px 9px", cursor:idx===partners.length-1?"default":"pointer", opacity:idx===partners.length-1?0.3:1, fontSize:"0.85rem" }}>↓</button>
                <button onClick={()=>abrirEditarPartner(idx)} style={S.btnSm("#2d6a4f",C.green)}>Editar</button>
                <button onClick={()=>eliminarPartner(idx)} style={{ ...S.btnSm("transparent",C.red), color:C.red }}>✕</button>
              </div>
            </div>
          ))}

          {/* Formulario */}
          {showPartnerForm&&(
            <div style={{ background:C.surface, border:`1px solid ${C.greenBrd}`, borderRadius:12, padding:"1.4rem", marginTop:"1rem" }}>
              <div style={{ fontWeight:700, fontSize:"0.92rem", color:C.green, marginBottom:"1.2rem" }}>
                {editingPartner===null?"Nuevo partner":"Editar partner"}
              </div>
              <div style={{ marginBottom:"1rem" }}>
                <label style={S.label}>Nombre *</label>
                <input value={partnerForm.nombre} onChange={e=>setPartnerForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Patagonia Excursiones" style={S.inp}/>
              </div>
              <div style={{ marginBottom:"1rem" }}>
                <label style={S.label}>Descripción <span style={{color:C.muted,fontWeight:400,textTransform:"none"}}>(opcional — solo referencia interna)</span></label>
                <input value={partnerForm.descripcion} onChange={e=>setPartnerForm(f=>({...f,descripcion:e.target.value}))} placeholder="Ej: Excursiones al Parque Nacional, 15% de descuento" style={S.inp}/>
              </div>
              <label style={S.label}>Logo</label>
              <div style={{ display:"flex", alignItems:"center", gap:"1rem", flexWrap:"wrap", marginBottom:"1.2rem" }}>
                {partnerForm.logo&&(
                  <div style={{ width:72, height:72, background:"rgba(255,255,255,0.92)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", padding:4, border:`1px solid ${C.border}`, flexShrink:0 }}>
                    <img src={partnerForm.logo} alt="Logo" style={{ width:"100%", height:"100%", objectFit:"contain" }}/>
                  </div>
                )}
                <div style={{ flex:1 }}>
                  <div style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${C.border}`, borderRadius:8, padding:"0.7rem", textAlign:"center" }}>
                    <input ref={logoRef} type="file" accept="image/*" onChange={e=>e.target.files?.[0]&&subirLogo(e.target.files[0])} style={{ display:"none" }} id="logo-upload"/>
                    <label htmlFor="logo-upload" style={{ cursor:"pointer", display:"inline-flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                      <span style={{ fontSize:"1.1rem" }}>🖼️</span>
                      <span style={{ fontSize:"0.8rem", color:C.green, fontWeight:600 }}>{uploadingLogo?"Subiendo…":(partnerForm.logo?"Cambiar logo":"Subir logo")}</span>
                      <span style={{ fontSize:"0.68rem", color:C.muted }}>PNG con fondo transparente recomendado</span>
                    </label>
                  </div>
                  {partnerForm.logo&&<button onClick={()=>setPartnerForm(f=>({...f,logo:""}))} style={{ marginTop:5, background:"none", border:"none", color:C.red, fontSize:"0.72rem", cursor:"pointer", textDecoration:"underline" }}>Quitar logo</button>}
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
                <button onClick={cerrarPartnerForm} style={S.btnGhost}>Cancelar</button>
                <button onClick={guardarPartner} disabled={savingPartners||uploadingLogo} style={S.btnPrimary}>{savingPartners?"Guardando…":"Guardar partner"}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ NOSOTROS ═════════════════════════════════════════ */}
      {tab==="actividades"&&<TabActividades />}
      {tab==="nosotros"&&<TabNosotros />}
      {tab==="faq"&&<TabProximamente icon="❓" titulo="Preguntas frecuentes — próximamente" descripcion="Vas a poder agregar, editar y reordenar las preguntas frecuentes del sitio. Los cambios se reflejan en tiempo real."/>}
      {tab==="resenas"&&<TabProximamente icon="⭐" titulo="Reseñas — próximamente" descripcion="Vas a poder cargar reseñas seleccionadas con nombre, fecha y texto para mostrarlas en el sitio sin depender de widgets externos."/>}

      {/* ══ MODAL: Editar propiedad ═══════════════════════════ */}
      {modal&&(
        <div onClick={e=>e.target===e.currentTarget&&cerrar()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, width:"100%", maxWidth:680, maxHeight:"92vh", overflowY:"auto", display:"flex", flexDirection:"column" }}>
            <div style={{ padding:"1.5rem 1.8rem 1rem", borderBottom:`1px solid ${C.border2}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:12, height:12, borderRadius:"50%", background:modal.color||C.green }}/>
                <div><div style={{ fontWeight:700, fontSize:"1.05rem", color:C.text }}>{modal.name}</div><div style={{ fontSize:"0.75rem", color:C.muted, marginTop:2 }}>Detalles para la web pública</div></div>
              </div>
              <button onClick={cerrar} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.3rem", lineHeight:1 }}>✕</button>
            </div>
            <div style={{ padding:"1.5rem 1.8rem", flex:1 }}>

              <Seccion titulo="Identificación">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                  <div style={{ gridColumn:"1 / -1" }}><label style={S.label}>Nombre para la web</label><input value={form.nombreWeb} onChange={e=>setForm(f=>({...f,nombreWeb:e.target.value}))} placeholder={`Si lo dejás vacío se usa: ${modal.name}`} style={S.inp}/></div>
                  <div><label style={S.label}>Tipo de propiedad</label><select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={S.inp}>{TIPOS.map(t=><option key={t} style={{background:C.surface2,color:C.text}}>{t}</option>)}</select></div>
                  <div><label style={S.label}>Orden en la web (1 = primero)</label><input type="number" min={1} value={form.orden} onChange={e=>setForm(f=>({...f,orden:e.target.value}))} style={S.inp}/></div>
                </div>
              </Seccion>

              <Seccion titulo="Descripción">
                <label style={S.label}>Texto para los huéspedes</label>
                <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} rows={4} placeholder="Describí la propiedad: ubicación, estilo, qué la hace especial…" style={{...S.inp,resize:"vertical"}}/>
              </Seccion>

              <Seccion titulo="Capacidad y ambientes">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1rem" }}>
                  <div><label style={S.label}>Huéspedes</label><input type="number" min={1} value={form.capacidad} onChange={e=>setForm(f=>({...f,capacidad:e.target.value}))} style={S.inp}/></div>
                  <div><label style={S.label}>Camas</label><input type="number" min={1} value={form.camas} onChange={e=>setForm(f=>({...f,camas:e.target.value}))} style={S.inp}/></div>
                  <div><label style={S.label}>Baños</label><input type="number" min={1} value={form.banos} onChange={e=>setForm(f=>({...f,banos:e.target.value}))} style={S.inp}/></div>
                </div>
              </Seccion>

              <Seccion titulo="Moneda">
                <div style={{ maxWidth:180 }}><label style={S.label}>Moneda de las tarifas</label><select value={form.moneda} onChange={e=>setForm(f=>({...f,moneda:e.target.value}))} style={S.inp}>{MONEDAS.map(m=><option key={m} style={{background:C.surface2,color:C.text}}>{m}</option>)}</select></div>
              </Seccion>

              <Seccion titulo="Más información (opcional)">
                <p style={{ fontSize:"0.75rem", color:C.muted, marginBottom:"0.8rem", lineHeight:1.6 }}>Link a Google Sites u otro sitio. Aparece como botón <strong style={{color:C.text}}>Más información</strong> en la card.</p>
                <label style={S.label}>URL del sitio</label>
                <input type="url" placeholder="https://sites.google.com/view/tu-propiedad" value={form.sitioUrl||""} onChange={e=>setForm(f=>({...f,sitioUrl:e.target.value}))} style={S.inp}/>
                {form.sitioUrl?.trim()&&<a href={form.sitioUrl} target="_blank" rel="noreferrer" style={{ display:"inline-block", marginTop:8, fontSize:"0.75rem", color:C.green, textDecoration:"none" }}>↗ Abrir para verificar</a>}
              </Seccion>

              <Seccion titulo="Tarifas por temporada">
                <p style={{ fontSize:"0.75rem", color:C.muted, marginBottom:"1rem", lineHeight:1.6 }}>Configurá precio, huéspedes incluidos, cargo extra y mínimo de noches.</p>
                {form.tarifas.map((temp,ti)=>(
                  <div key={ti} style={{ border:`1px solid ${C.border}`, borderRadius:10, marginBottom:"1rem", overflow:"hidden" }}>
                    <div style={{ background:`${temp.color}22`, borderBottom:`1px solid ${C.border2}`, padding:"0.7rem 1rem", display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:temp.color, flexShrink:0 }}/>
                      <span style={{ fontWeight:700, fontSize:"0.88rem", color:temp.color }}>{temp.nombre}</span>
                    </div>
                    <div style={{ padding:"1rem" }}>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.8rem", marginBottom:"0.9rem" }}>
                        <div><label style={S.label}>Precio base / noche</label><input type="number" min={0} placeholder="700" value={temp.precioBase} onChange={e=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,precioBase:e.target.value}:t)}))} style={S.inp}/></div>
                        <div><label style={S.label}>Huéspedes incluidos</label><input type="number" min={1} placeholder="8" value={temp.huespedes} onChange={e=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,huespedes:e.target.value}:t)}))} style={S.inp}/></div>
                        <div><label style={S.label}>Extra / huésped adicional</label><input type="number" min={0} placeholder="50" value={temp.extraPorHuesped} onChange={e=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,extraPorHuesped:e.target.value}:t)}))} style={S.inp}/></div>
                      </div>
                      <div style={{ marginBottom:"0.9rem", maxWidth:180 }}><label style={S.label}>Mínimo de noches</label><input type="number" min={1} placeholder="3" value={temp.minimoNoches} onChange={e=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,minimoNoches:e.target.value}:t)}))} style={S.inp}/></div>
                      <div style={{ fontSize:"0.68rem", fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Fechas</div>
                      {temp.rangos.map((rango,ri)=>{
                        const desdeP=parseMmDd(rango.desde),hastaP=parseMmDd(rango.hasta);
                        const maxDias=(m)=>m?DIAS_MES_MAX[parseInt(m)-1]:31;
                        const selSt={...S.inp,flex:1,minWidth:0,padding:"8px 6px",fontSize:"0.83rem"};
                        const updRango=(field,val)=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i!==ti?t:{...t,rangos:t.rangos.map((r,j)=>j!==ri?r:{...r,[field]:val})})}));
                        return (
                          <div key={ri} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border2}`, borderRadius:8, padding:"0.7rem 0.8rem", marginBottom:8 }}>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 28px 1fr auto", gap:6, alignItems:"end" }}>
                              <div>
                                <div style={{ fontSize:"0.62rem", color:C.muted, fontWeight:700, marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase" }}>Desde</div>
                                <div style={{ display:"flex", gap:4 }}>
                                  <select value={desdeP.m} onChange={e=>{const m=e.target.value;updRango("desde",buildMmDd(m,desdeP.d));}} style={selSt}><option value="">Mes</option>{MESES_NOM.map((n,idx)=><option key={idx} value={MESES_SHORT[idx]} style={{background:C.surface2}}>{n}</option>)}</select>
                                  <select value={desdeP.d} onChange={e=>updRango("desde",buildMmDd(desdeP.m,e.target.value))} disabled={!desdeP.m} style={{...selSt,opacity:desdeP.m?1:0.4}}><option value="">Día</option>{Array.from({length:maxDias(desdeP.m)},(_,k)=>String(k+1).padStart(2,"0")).map(d=><option key={d} value={d} style={{background:C.surface2}}>{d}</option>)}</select>
                                </div>
                              </div>
                              <div style={{ color:C.muted, textAlign:"center", paddingBottom:8 }}>→</div>
                              <div>
                                <div style={{ fontSize:"0.62rem", color:C.muted, fontWeight:700, marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase" }}>Hasta</div>
                                <div style={{ display:"flex", gap:4 }}>
                                  <select value={hastaP.m} onChange={e=>{const m=e.target.value;updRango("hasta",buildMmDd(m,hastaP.d));}} style={selSt}><option value="">Mes</option>{MESES_NOM.map((n,idx)=><option key={idx} value={MESES_SHORT[idx]} style={{background:C.surface2}}>{n}</option>)}</select>
                                  <select value={hastaP.d} onChange={e=>updRango("hasta",buildMmDd(hastaP.m,e.target.value))} disabled={!hastaP.m} style={{...selSt,opacity:hastaP.m?1:0.4}}><option value="">Día</option>{Array.from({length:maxDias(hastaP.m)},(_,k)=>String(k+1).padStart(2,"0")).map(d=><option key={d} value={d} style={{background:C.surface2}}>{d}</option>)}</select>
                                </div>
                              </div>
                              <div style={{ paddingBottom:4 }}>{temp.rangos.length>1?<button onClick={()=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,rangos:t.rangos.filter((_,j)=>j!==ri)}:t)}))} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:"1rem"}}>✕</button>:<span style={{width:20,display:"inline-block"}}/>}</div>
                            </div>
                            {rango.desde&&rango.hasta&&(
                              <div style={{ marginTop:6, fontSize:"0.7rem", color:C.muted, fontStyle:"italic" }}>
                                {(()=>{const dp=parseMmDd(rango.desde),hp=parseMmDd(rango.hasta);const mn=n=>MESES_NOM[parseInt(n)-1]||n;return`${dp.d} de ${mn(dp.m)} → ${hp.d} de ${mn(hp.m)}`;})()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button onClick={()=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,rangos:[...t.rangos,{desde:"",hasta:""}]}:t)}))} style={{...S.btnSm("rgba(255,255,255,0.06)",C.border),marginTop:4}}>+ Agregar rango de fechas</button>
                    </div>
                  </div>
                ))}
                <TimelineAnual tarifas={form.tarifas}/>
                <p style={{ fontSize:"0.72rem", color:C.muted, marginTop:4, lineHeight:1.6 }}>Los precios son orientativos. Podemos ajustar al confirmar por WhatsApp.</p>
              </Seccion>

              <Seccion titulo={`Fotos (${form.fotos?.length||0})`}>
                {form.fotos?.length>0&&(
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"1rem" }}>
                    {form.fotos.map((url,i)=>(
                      <div key={i} style={{ position:"relative", width:110, height:80 }}>
                        <img src={url} alt={`Foto ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:8, display:"block", border:i===0?`2px solid ${C.green}`:`1px solid ${C.border}` }}/>
                        {i===0?<div style={{ position:"absolute", top:3, left:3, background:"rgba(82,183,136,0.9)", color:"#fff", fontSize:"0.55rem", padding:"1px 5px", borderRadius:4, fontWeight:700 }}>PORTADA</div>:<button onClick={()=>setPortada(i)} style={{ position:"absolute", top:3, left:3, background:"rgba(0,0,0,0.55)", border:"none", color:"#fff", fontSize:"0.55rem", padding:"2px 5px", borderRadius:4, cursor:"pointer", fontWeight:600 }}>⭐ portada</button>}
                        <button onClick={()=>eliminarFoto(i)} style={{ position:"absolute", top:-5, right:-5, width:18, height:18, borderRadius:"50%", background:"#e05252", border:"none", color:"#fff", fontSize:"0.7rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${C.border}`, borderRadius:8, padding:"1rem", textAlign:"center" }}>
                  <input ref={fileRef} type="file" accept="image/*" multiple onChange={e=>agregarFotos(e.target.files)} style={{ display:"none" }} id="foto-upload"/>
                  <label htmlFor="foto-upload" style={{ cursor:"pointer", display:"inline-flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <div style={{ fontSize:"1.6rem" }}>📷</div>
                    <span style={{ fontSize:"0.83rem", color:C.green, fontWeight:600 }}>{uploading?uploadMsg:"Seleccionar fotos"}</span>
                    <span style={{ fontSize:"0.72rem", color:C.muted }}>JPG o PNG · podés seleccionar varias</span>
                  </label>
                  {uploadMsg&&!uploading&&<div style={{ marginTop:8, fontSize:"0.8rem", color:C.green }}>{uploadMsg}</div>}
                </div>
              </Seccion>

              <Seccion titulo="Comodidades">
                <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:"0.9rem" }}>
                  {AMENITIES_SUGERIDOS.map(a=>(
                    <button key={a} type="button" onClick={()=>toggleAmenity(a)} style={{ padding:"5px 12px", borderRadius:16, fontSize:"0.8rem", cursor:"pointer", background:form.amenities.includes(a)?C.greenDim:"rgba(255,255,255,0.05)", color:form.amenities.includes(a)?C.green:C.muted, border:`1.5px solid ${form.amenities.includes(a)?C.green:C.border}`, fontWeight:form.amenities.includes(a)?600:400, transition:"all 0.15s" }}>{a}</button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={amenInput} onChange={e=>setAmenInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addCustomAmenity())} placeholder="Otra comodidad personalizada…" style={{...S.inp,flex:1}}/>
                  <button type="button" onClick={addCustomAmenity} style={S.btnSm("#2d6a4f",C.green)}>+ Agregar</button>
                </div>
                {form.amenities.filter(a=>!AMENITIES_SUGERIDOS.includes(a)).length>0&&(
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                    {form.amenities.filter(a=>!AMENITIES_SUGERIDOS.includes(a)).map(a=>(
                      <span key={a} style={{ background:C.greenDim, color:C.green, border:`1px solid ${C.green}`, borderRadius:16, fontSize:"0.78rem", padding:"3px 10px", display:"flex", alignItems:"center", gap:5 }}>{a}<button onClick={()=>toggleAmenity(a)} style={{ background:"none", border:"none", color:C.green, cursor:"pointer", fontSize:"0.8rem", lineHeight:1, padding:0 }}>✕</button></span>
                    ))}
                  </div>
                )}
              </Seccion>

              <Seccion titulo="Visibilidad en la web">
                <label style={{ display:"flex", alignItems:"center", gap:14, cursor:"pointer", background:form.mostrarEnWeb?C.greenDim:"rgba(255,255,255,0.03)", border:`1px solid ${form.mostrarEnWeb?C.greenBrd:C.border}`, borderRadius:10, padding:"1rem 1.2rem", transition:"all 0.2s" }}>
                  <input type="checkbox" checked={form.mostrarEnWeb} onChange={e=>setForm(f=>({...f,mostrarEnWeb:e.target.checked}))} style={{ width:18, height:18, cursor:"pointer", accentColor:C.green }}/>
                  <div>
                    <span style={{ fontSize:"0.92rem", color:form.mostrarEnWeb?C.green:C.muted, fontWeight:600 }}>{form.mostrarEnWeb?"✓ Visible en la web pública":"Oculta — no aparece en la web"}</span>
                    <p style={{ fontSize:"0.75rem", color:C.muted, marginTop:3 }}>Las propiedades en modalidad solo administración deben quedar ocultas.</p>
                  </div>
                </label>
              </Seccion>

            </div>
            <div style={{ padding:"1rem 1.8rem", borderTop:`1px solid ${C.border2}`, display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button onClick={cerrar} disabled={saving} style={S.btnGhost}>Cancelar</button>
              <button onClick={guardar} disabled={saving||uploading} style={S.btnPrimary}>{saving?"Guardando…":"Guardar cambios"}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Tag({ children }) {
  return <span style={{ background:"rgba(255,255,255,0.07)", color:"#c9d1d9", fontSize:"0.72rem", padding:"2px 9px", borderRadius:10 }}>{children}</span>;
}
