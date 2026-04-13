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
  if (!d) return String(m).padStart(2,"0") + "-"; // parcial: mes seleccionado, día pendiente
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
  return dayIdx >= d || dayIdx <= h; // rango que cruza año
}

function TimelineAnual({ tarifas }) {
  const TOTAL = 365;
  const coverage = new Array(TOTAL).fill(null);
  const overlaps = new Array(TOTAL).fill(false);

  for (let i = 0; i < TOTAL; i++) {
    let count = 0, first = null;
    for (const t of tarifas) {
      for (const r of (t.rangos || [])) {
        if (isInRangeIdx(i, r.desde, r.hasta)) {
          if (!first) first = t;
          count++;
        }
      }
    }
    coverage[i] = first;
    if (count > 1) overlaps[i] = true;
  }

  // Agrupar segmentos consecutivos iguales
  const segments = [];
  let i = 0;
  while (i < TOTAL) {
    const t = coverage[i], ol = overlaps[i];
    let j = i + 1;
    while (j < TOTAL && coverage[j] === t && overlaps[j] === ol) j++;
    segments.push({ temp: t, overlap: ol, count: j - i });
    i = j;
  }

  const sinCubrir = coverage.filter(c => !c).length;
  const solapados = overlaps.filter(Boolean).length;
  const hayDatos  = tarifas.some(t => t.rangos?.some(r => r.desde && r.hasta));

  if (!hayDatos) return null;

  return (
    <div style={{ marginTop:"1.2rem", marginBottom:"0.4rem" }}>
      <div style={{ fontSize:"0.68rem", fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>
        Vista anual
      </div>
      {/* Etiquetas de meses */}
      <div style={{ display:"flex", marginBottom:2 }}>
        {DIAS_MES_NORM.map((d,i) => (
          <div key={i} style={{ flex:d, textAlign:"center", fontSize:"0.58rem", color:C.muted }}>
            {MES_LABELS[i]}
          </div>
        ))}
      </div>
      {/* Barra */}
      <div style={{ display:"flex", height:22, borderRadius:6, overflow:"hidden", border:`1px solid ${C.border}` }}>
        {segments.map((seg, i) => (
          <div key={i}
            title={seg.overlap ? "⚠ Solapamiento" : (seg.temp ? seg.temp.nombre : "Sin cobertura")}
            style={{
              flex: seg.count,
              background: seg.overlap ? "#e05252" : (seg.temp ? seg.temp.color : "rgba(255,255,255,0.07)"),
              opacity: seg.overlap ? 1 : (seg.temp ? 0.82 : 1),
            }}
          />
        ))}
      </div>
      {/* Leyenda */}
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
      {/* Alertas */}
      {solapados > 0 && (
        <div style={{ marginTop:8, padding:"0.45rem 0.8rem", background:"rgba(224,82,82,0.13)", border:"1px solid rgba(224,82,82,0.4)", borderRadius:6, fontSize:"0.74rem", color:"#e05252" }}>
          ⚠ {solapados} día{solapados>1?"s":""} se solapan entre temporadas — revisá los rangos.
        </div>
      )}
      {sinCubrir > 0 && sinCubrir < TOTAL && (
        <div style={{ marginTop:6, padding:"0.45rem 0.8rem", background:`rgba(224,159,62,0.12)`, border:`1px solid rgba(224,159,62,0.35)`, borderRadius:6, fontSize:"0.74rem", color:C.amber }}>
          ⚠ {sinCubrir} día{sinCubrir>1?"s":""} sin temporada asignada — el cotizador no podrá calcular precio para esas fechas.
        </div>
      )}
    </div>
  );
}

const WEB_VACIO = {
  nombreWeb: "", descripcion: "", tipo: "Cabaña",
  capacidad: "", camas: "", banos: "",
  precio: "", moneda: "USD",
  amenities: [], fotos: [], fotoUrl: "",
  mostrarEnWeb: false, orden: 99,
  tarifas: [
    TEMP_VACIA("Temporada alta",  "#e09f3e"),
    TEMP_VACIA("Temporada media", "#52b788"),
    TEMP_VACIA("Temporada baja",  "#5b8fd4"),
  ],
};

// ── Tokens de diseño (coherentes con FANG) ──────────────────
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

// ── Barra de completitud ─────────────────────────────────────
function CompletitudBar({ web }) {
  const checks = [
    !!web?.descripcion,
    (web?.fotos?.length > 0) || !!web?.fotoUrl,
    (web?.tarifas?.some(t => t.precioBase)) || !!web?.precio,
    (web?.amenities?.length > 0),
    !!web?.tipo,
  ];
  const ok = checks.filter(Boolean).length;
  const pct = Math.round((ok / checks.length) * 100);
  const color = pct === 100 ? C.green : pct >= 60 ? C.amber : C.red;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:6 }}>
      <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.08)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background:color, borderRadius:2, transition:"width 0.4s" }}/>
      </div>
      <span style={{ fontSize:"0.68rem", color, fontWeight:700, minWidth:28 }}>{pct}%</span>
    </div>
  );
}

// ── Sección de formulario ────────────────────────────────────
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

export default function SitioWeb() {
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
  // Hero photos
  const [fotosHero,    setFotosHero]    = useState([]);
  const [savingHero,   setSavingHero]   = useState(false);
  const [uploadHero,   setUploadHero]   = useState("");
  const [uploadingHero,setUploadingHero]= useState(false);
  const fileHeroRef = useRef(null);

  // ── Suscripciones Firestore ──────────────────────────────
  useEffect(() => {
    if (!window._db) return;
    const unsubFang = window._db.collection("props")
      .onSnapshot(snap => setFangProps(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
    const unsubWeb = window._db.collection(COLL_WEB)
      .onSnapshot(snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = { docId:d.id, ...d.data() }; });
        setWebData(map);
        setLoading(false);
      }, () => setLoading(false));
    // Hero photos
    const unsubHero = window._db.collection("sitioWeb_config").doc("general")
      .onSnapshot(snap => {
        if (snap.exists) setFotosHero(snap.data().fotosHero || []);
      }, () => {});
    return () => { unsubFang(); unsubWeb(); unsubHero(); };
  }, []);

  // ── Abrir modal ──────────────────────────────────────────
  function abrirEditar(fangProp) {
    const existing = webData[fangProp.id] || {};
    const dorms    = Array.isArray(fangProp.dormitorios) ? fangProp.dormitorios : [];
    const camasCalc = dorms.reduce((s,d) => s + (d.matrimoniales||0) + (d.simples||0), 0);
    const capacCalc = dorms.reduce((s,d) => s + (d.matrimoniales||0)*2 + (d.simples||0), 0);
    const nombreWeb = existing.nombre && existing.nombre !== fangProp.name ? existing.nombre : fangProp.name;
    const tarifasBase = [
      TEMP_VACIA("Temporada alta",  "#e09f3e"),
      TEMP_VACIA("Temporada media", "#52b788"),
      TEMP_VACIA("Temporada baja",  "#5b8fd4"),
    ];
    const tarifas = existing.tarifas?.length === 3
      ? existing.tarifas
      : tarifasBase;
    setForm({
      ...WEB_VACIO,
      camas:     camasCalc || "",
      capacidad: capacCalc || "",
      ...existing,
      fotos:     existing.fotos || (existing.fotoUrl ? [existing.fotoUrl] : []),
      nombreWeb,
      tarifas,
    });
    setUploadMsg(""); setModal(fangProp);
  }
  function cerrar() { setModal(null); setSaving(false); setUploadMsg(""); }

  // ── Hero photos ─────────────────────────────────────────
  async function subirFotoHero(file) {
    const blob = await comprimirImagen(file);
    const fd = new FormData();
    fd.append("file", blob, file.name.replace(/\.[^.]+$/, '.jpg'));
    fd.append("upload_preset", CLD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, { method:"POST", body:fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Error al subir");
    return data.secure_url;
  }
  async function agregarFotosHero(files) {
    if (!files?.length) return;
    setUploadingHero(true); setUploadHero(`Subiendo ${files.length} foto${files.length>1?"s":""}…`);
    try {
      const urls = await Promise.all(Array.from(files).map(subirFotoHero));
      setFotosHero(f => [...f, ...urls]);
      setUploadHero(`✓ ${urls.length} foto${urls.length>1?"s":""}  agregada${urls.length>1?"s":""}`);
    } catch(e) { setUploadHero("Error: "+e.message); }
    finally { setUploadingHero(false); if(fileHeroRef.current) fileHeroRef.current.value=""; }
  }
  function eliminarFotoHero(idx) { setFotosHero(f => f.filter((_,i)=>i!==idx)); }
  async function guardarFotosHero() {
    if (!window._db) return;
    setSavingHero(true);
    try {
      await window._db.collection("sitioWeb_config").doc("general").set({ fotosHero }, { merge:true });
    } catch(e) { alert("Error al guardar: "+e.message); }
    finally { setSavingHero(false); }
  }

  // ── Toggle visible/oculta ────────────────────────────────
  async function toggleWeb(fangProp) {
    if (!window._db) return;
    const existing  = webData[fangProp.id];
    const nuevoValor = !(existing?.mostrarEnWeb || false);
    if (existing) {
      await window._db.collection(COLL_WEB).doc(fangProp.id).update({ mostrarEnWeb:nuevoValor });
    } else {
      await window._db.collection(COLL_WEB).doc(fangProp.id).set({
        nombre: fangProp.name, nombreFang: fangProp.name,
        mostrarEnWeb: nuevoValor, orden: 99,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // ── Comprimir imagen antes de subir ─────────────────────
  async function comprimirImagen(file, maxW=1920, quality=0.85) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => resolve(blob || file), 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  // ── Subir una foto a Cloudinary ──────────────────────────
  async function subirFoto(file) {
    const blob = await comprimirImagen(file);
    const fd = new FormData();
    fd.append("file", blob, file.name.replace(/\.[^.]+$/, '.jpg'));
    fd.append("upload_preset", CLD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`, {
      method: "POST", body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || "Error al subir a Cloudinary");
    return data.secure_url;
  }

  // ── Agregar fotos desde el input ─────────────────────────
  async function agregarFotos(files) {
    if (!files?.length) return;
    setUploading(true);
    setUploadMsg(`Subiendo ${files.length} foto${files.length>1?"s":""}…`);
    try {
      const urls = await Promise.all(Array.from(files).map(subirFoto));
      setForm(f => ({ ...f, fotos: [...(f.fotos||[]), ...urls] }));
      setUploadMsg(`✓ ${urls.length} foto${urls.length>1?"s":""}  agregada${urls.length>1?"s":""}`);
    } catch(e) {
      setUploadMsg("Error al subir: " + e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function eliminarFoto(idx) {
    setForm(f => ({ ...f, fotos: f.fotos.filter((_,i) => i!==idx) }));
  }
  function setPortada(idx) {
    setForm(f => {
      const fotos = [...f.fotos];
      const [portada] = fotos.splice(idx, 1);
      return { ...f, fotos: [portada, ...fotos] };
    });
  }

  // ── Guardar ──────────────────────────────────────────────
  async function guardar() {
    if (!window._db || !modal) return;
    setSaving(true);
    try {
      const data = {
        nombre:      form.nombreWeb.trim() || modal.name,
        nombreFang:  modal.name,
        descripcion: form.descripcion.trim(),
        tipo:        form.tipo,
        capacidad:   Number(form.capacidad) || 0,
        camas:       Number(form.camas)     || 0,
        banos:       Number(form.banos)     || 0,
        precio:      Number(form.precio)    || 0,
        moneda:      form.moneda,
        amenities:   form.amenities,
        tarifas:     form.tarifas || [],
        fotos:       form.fotos || [],
        fotoUrl:     form.fotos?.[0] || form.fotoUrl || "",
        mostrarEnWeb: Boolean(form.mostrarEnWeb),
        orden:       Number(form.orden) || 99,
        updatedAt:   window.firebase.firestore.FieldValue.serverTimestamp(),
      };
      const docRef = window._db.collection(COLL_WEB).doc(modal.id);
      const existing = webData[modal.id];
      if (existing) {
        await docRef.update(data);
      } else {
        data.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        await docRef.set(data);
      }
      cerrar();
    } catch(e) {
      console.error(e); alert("Error al guardar: " + e.message);
    } finally { setSaving(false); }
  }

  function toggleAmenity(a) {
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x=>x!==a) : [...f.amenities, a] }));
  }
  function addCustomAmenity() {
    const v = amenInput.trim();
    if (v && !form.amenities.includes(v)) setForm(f => ({ ...f, amenities:[...f.amenities, v] }));
    setAmenInput("");
  }

  // ── Stats globales ───────────────────────────────────────
  const totalVisibles = Object.values(webData).filter(w => w.mostrarEnWeb).length;

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div style={{ padding:"1.5rem", maxWidth:900, color:C.text }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.5rem", flexWrap:"wrap", gap:"0.8rem" }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:"0.75rem", background:C.greenDim, color:C.green, border:`1px solid ${C.greenBrd}`, borderRadius:20, padding:"3px 12px", fontWeight:700 }}>
              {totalVisibles} visible{totalVisibles!==1?"s":""}
            </span>
            <span style={{ fontSize:"0.78rem", color:C.muted }}>
              de {fangProps.length} propiedades en FANG
            </span>
          </div>
          <p style={{ fontSize:"0.83rem", color:C.muted, marginTop:6, lineHeight:1.6 }}>
            Activá <strong style={{color:C.green}}>Visible</strong> para publicar en la web. Usá <strong style={{color:C.green}}>Editar</strong> para cargar fotos, descripción y precio.
          </p>
        </div>
        <a href={URL_WEB} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 16px", background:C.greenDim, color:C.green, border:`1px solid ${C.greenBrd}`, borderRadius:8, fontSize:"0.82rem", fontWeight:600, textDecoration:"none" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Ver web pública
        </a>
      </div>

      {/* ── Fotos del hero (portada) ── */}
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:"1.2rem 1.4rem", marginBottom:"1.5rem" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1rem", flexWrap:"wrap", gap:8 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:"0.9rem", color:C.text }}>Fotos de portada del sitio</div>
            <div style={{ fontSize:"0.75rem", color:C.muted, marginTop:2 }}>Estas fotos rotan en el slideshow del inicio. Mínimo 1, recomendado 4-5.</div>
          </div>
          <button onClick={guardarFotosHero} disabled={savingHero} style={S.btnPrimary}>
            {savingHero ? "Guardando…" : "Guardar fotos"}
          </button>
        </div>
        {fotosHero.length > 0 && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"0.9rem" }}>
            {fotosHero.map((url,i) => (
              <div key={i} style={{ position:"relative", width:100, height:70 }}>
                <img src={url} alt={`Hero ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:8, display:"block", border:`1px solid ${C.border}` }}/>
                {i===0 && <div style={{ position:"absolute", top:3, left:3, background:"rgba(82,183,136,0.9)", color:"#fff", fontSize:"0.55rem", padding:"1px 5px", borderRadius:4, fontWeight:700 }}>1ERA</div>}
                <button onClick={()=>eliminarFotoHero(i)} style={{ position:"absolute", top:-5, right:-5, width:18, height:18, borderRadius:"50%", background:"#e05252", border:"none", color:"#fff", fontSize:"0.7rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${C.border}`, borderRadius:8, padding:"0.8rem", textAlign:"center" }}>
          <input ref={fileHeroRef} type="file" accept="image/*" multiple onChange={e=>agregarFotosHero(e.target.files)} style={{ display:"none" }} id="hero-upload"/>
          <label htmlFor="hero-upload" style={{ cursor:"pointer", display:"inline-flex", flexDirection:"column", alignItems:"center", gap:5 }}>
            <span style={{ fontSize:"1.3rem" }}>🖼️</span>
            <span style={{ fontSize:"0.82rem", color:C.green, fontWeight:600 }}>{uploadingHero ? uploadHero : "Subir fotos de portada"}</span>
            <span style={{ fontSize:"0.7rem", color:C.muted }}>JPG o PNG · podés seleccionar varias</span>
          </label>
          {uploadHero && !uploadingHero && <div style={{ marginTop:6, fontSize:"0.78rem", color:C.green }}>{uploadHero}</div>}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted }}>
          <div style={{ width:28, height:28, border:`2px solid ${C.border}`, borderTopColor:C.green, borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 1rem" }}/>
          Cargando propiedades…
        </div>
      )}

      {!loading && fangProps.length === 0 && (
        <div style={{ textAlign:"center", padding:"3rem", color:C.muted, border:`2px dashed ${C.border}`, borderRadius:12 }}>
          <div style={{ fontSize:"2rem", marginBottom:"0.8rem" }}>🏠</div>
          <p>No hay propiedades en FANG todavía.</p>
          <p style={{ fontSize:"0.82rem", marginTop:4 }}>Cargalas primero en <strong>Propiedades/Hab.</strong></p>
        </div>
      )}

      {/* Lista */}
      {fangProps.map(p => {
        const web = webData[p.id];
        const visible = web?.mostrarEnWeb || false;
        const fotos = web?.fotos?.length ? web.fotos : (web?.fotoUrl ? [web.fotoUrl] : []);
        const fotoPortada = fotos[0] || null;
        const tieneDetalles = !!(web?.descripcion || fotoPortada || web?.precio);

        return (
          <div key={p.id} style={{
            background: C.surface,
            border: `1px solid ${visible ? C.greenBrd : C.border}`,
            borderRadius:12, marginBottom:"0.8rem",
            overflow:"hidden",
            transition:"border-color 0.2s",
          }}>
            <div style={{ display:"flex", alignItems:"stretch", gap:0 }}>

              {/* Foto portada */}
              <div style={{ width:100, flexShrink:0, position:"relative" }}>
                {fotoPortada
                  ? <img src={fotoPortada} alt={p.name} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
                  : <div style={{ width:"100%", height:"100%", minHeight:80, background:"rgba(255,255,255,0.04)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem" }}>🏠</div>
                }
                {fotos.length > 1 && (
                  <div style={{ position:"absolute", bottom:5, right:5, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:"0.65rem", padding:"2px 6px", borderRadius:8, fontWeight:700 }}>
                    {fotos.length} fotos
                  </div>
                )}
              </div>

              {/* Info */}
              <div style={{ flex:1, padding:"0.9rem 1.1rem", minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:"0.8rem", flexWrap:"wrap" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:p.color||C.green, flexShrink:0 }}/>
                      <span style={{ fontWeight:700, fontSize:"0.97rem", color:C.text }}>
                        {web?.nombre && web.nombre !== p.name ? web.nombre : p.name}
                      </span>
                      {web?.nombre && web.nombre !== p.name && (
                        <span style={{ fontSize:"0.7rem", color:C.muted }}>FANG: {p.name}</span>
                      )}
                    </div>

                    {/* Tags */}
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
                      {web?.tipo     && <Tag>{web.tipo}</Tag>}
                      {web?.capacidad ? <Tag>👥 {web.capacidad} huéspedes</Tag> : null}
                      {web?.banos    ? <Tag>🚿 {web.banos} baño{web.banos>1?"s":""}</Tag> : null}
                      {web?.precio   ? <Tag>💰 {web.moneda} {web.precio}/noche</Tag> : null}
                      {web?.amenities?.length ? <Tag>✓ {web.amenities.length} comodidades</Tag> : null}
                    </div>

                    {/* Barra de completitud */}
                    {web
                      ? <CompletitudBar web={web}/>
                      : <div style={{ fontSize:"0.73rem", color:C.amber, marginTop:6 }}>⚠ Sin detalles web aún — hacé clic en Editar</div>
                    }
                  </div>

                  {/* Acciones */}
                  <div style={{ display:"flex", gap:7, alignItems:"center", flexShrink:0 }}>
                    <button onClick={() => toggleWeb(p)} style={{
                      padding:"5px 14px", borderRadius:20, border:"none", cursor:"pointer", fontSize:"0.78rem", fontWeight:700,
                      background: visible ? C.greenDim : "rgba(255,255,255,0.07)",
                      color:      visible ? C.green : C.muted,
                      transition:"all 0.2s",
                    }}>
                      {visible ? "✓ Visible" : "Oculta"}
                    </button>
                    <button onClick={() => abrirEditar(p)} style={S.btnSm("#2d6a4f", C.green)}>
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── MODAL ── */}
      {modal && (
        <div
          onClick={e => e.target===e.currentTarget && cerrar()}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}
        >
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, width:"100%", maxWidth:680, maxHeight:"92vh", overflowY:"auto", display:"flex", flexDirection:"column" }}>

            {/* Header modal */}
            <div style={{ padding:"1.5rem 1.8rem 1rem", borderBottom:`1px solid ${C.border2}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:12, height:12, borderRadius:"50%", background:modal.color||C.green }}/>
                <div>
                  <div style={{ fontWeight:700, fontSize:"1.05rem", color:C.text }}>{modal.name}</div>
                  <div style={{ fontSize:"0.75rem", color:C.muted, marginTop:2 }}>Detalles para la web pública</div>
                </div>
              </div>
              <button onClick={cerrar} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:"1.3rem", lineHeight:1 }}>✕</button>
            </div>

            {/* Body modal */}
            <div style={{ padding:"1.5rem 1.8rem", flex:1 }}>

              {/* ── Identificación ── */}
              <Seccion titulo="Identificación">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1rem" }}>
                  <div style={{ gridColumn:"1 / -1" }}>
                    <label style={S.label}>Nombre para la web</label>
                    <input value={form.nombreWeb} onChange={e=>setForm(f=>({...f,nombreWeb:e.target.value}))} placeholder={`Si lo dejás vacío se usa: ${modal.name}`} style={S.inp}/>
                  </div>
                  <div>
                    <label style={S.label}>Tipo de propiedad</label>
                    <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={S.inp}>
                      {TIPOS.map(t=><option key={t} style={{background:C.surface2,color:C.text}}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.label}>Orden en la web (1 = primero)</label>
                    <input type="number" min={1} value={form.orden} onChange={e=>setForm(f=>({...f,orden:e.target.value}))} style={S.inp}/>
                  </div>
                </div>
              </Seccion>

              {/* ── Descripción ── */}
              <Seccion titulo="Descripción">
                <label style={S.label}>Texto para los huéspedes</label>
                <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} rows={4} placeholder="Describí la propiedad: ubicación, estilo, qué la hace especial…" style={{...S.inp, resize:"vertical"}}/>
              </Seccion>

              {/* ── Capacidad ── */}
              <Seccion titulo="Capacidad y ambientes">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1rem" }}>
                  <div>
                    <label style={S.label}>Huéspedes</label>
                    <input type="number" min={1} value={form.capacidad} onChange={e=>setForm(f=>({...f,capacidad:e.target.value}))} style={S.inp}/>
                  </div>
                  <div>
                    <label style={S.label}>Camas</label>
                    <input type="number" min={1} value={form.camas} onChange={e=>setForm(f=>({...f,camas:e.target.value}))} style={S.inp}/>
                  </div>
                  <div>
                    <label style={S.label}>Baños</label>
                    <input type="number" min={1} value={form.banos} onChange={e=>setForm(f=>({...f,banos:e.target.value}))} style={S.inp}/>
                  </div>
                </div>
              </Seccion>

              {/* ── Moneda ── */}
              <Seccion titulo="Moneda">
                <div style={{ maxWidth:180 }}>
                  <label style={S.label}>Moneda de las tarifas</label>
                  <select value={form.moneda} onChange={e=>setForm(f=>({...f,moneda:e.target.value}))} style={S.inp}>
                    {MONEDAS.map(m=><option key={m} style={{background:C.surface2,color:C.text}}>{m}</option>)}
                  </select>
                </div>
              </Seccion>

              {/* ── Tarifas ── */}
              <Seccion titulo="Tarifas por temporada">
                <p style={{ fontSize:"0.75rem", color:C.muted, marginBottom:"1rem", lineHeight:1.6 }}>
                  Configurá precio, huéspedes incluidos, cargo extra y mínimo de noches. Para las fechas elegí mes y día con los selectores. Podés agregar varios rangos por temporada (útil si una temporada tiene dos períodos separados en el año).
                </p>
                {form.tarifas.map((temp, ti) => (
                  <div key={ti} style={{ border:`1px solid ${C.border}`, borderRadius:10, marginBottom:"1rem", overflow:"hidden" }}>
                    {/* Header temporada */}
                    <div style={{ background:`${temp.color}22`, borderBottom:`1px solid ${C.border2}`, padding:"0.7rem 1rem", display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:temp.color, flexShrink:0 }}/>
                      <span style={{ fontWeight:700, fontSize:"0.88rem", color:temp.color }}>{temp.nombre}</span>
                    </div>
                    <div style={{ padding:"1rem" }}>
                      {/* Precios */}
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"0.8rem", marginBottom:"0.9rem" }}>
                        <div>
                          <label style={S.label}>Precio base / noche</label>
                          <input type="number" min={0} placeholder="700" value={temp.precioBase}
                            onChange={e=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,precioBase:e.target.value}:t)}))}
                            style={S.inp}/>
                        </div>
                        <div>
                          <label style={S.label}>Huéspedes incluidos</label>
                          <input type="number" min={1} placeholder="8" value={temp.huespedes}
                            onChange={e=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,huespedes:e.target.value}:t)}))}
                            style={S.inp}/>
                        </div>
                        <div>
                          <label style={S.label}>Extra / huésped adicional</label>
                          <input type="number" min={0} placeholder="50" value={temp.extraPorHuesped}
                            onChange={e=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,extraPorHuesped:e.target.value}:t)}))}
                            style={S.inp}/>
                        </div>
                      </div>
                      {/* Mínimo */}
                      <div style={{ marginBottom:"0.9rem", maxWidth:180 }}>
                        <label style={S.label}>Mínimo de noches</label>
                        <input type="number" min={1} placeholder="3" value={temp.minimoNoches}
                          onChange={e=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,minimoNoches:e.target.value}:t)}))}
                          style={S.inp}/>
                      </div>
                      {/* Rangos de fechas */}
                      <div style={{ fontSize:"0.68rem", fontWeight:700, color:C.muted, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Fechas</div>
                      {temp.rangos.map((rango, ri) => {
                        const desdeP = parseMmDd(rango.desde);
                        const hastaP = parseMmDd(rango.hasta);
                        const maxDias = (m) => m ? DIAS_MES_MAX[parseInt(m)-1] : 31;
                        const selSt = { ...S.inp, flex:1, minWidth:0, padding:"8px 6px", fontSize:"0.83rem" };
                        const updRango = (field, val) => setForm(f=>({...f, tarifas:f.tarifas.map((t,i)=>i!==ti?t:{...t, rangos:t.rangos.map((r,j)=>j!==ri?r:{...r,[field]:val})})}));
                        return (
                          <div key={ri} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${C.border2}`, borderRadius:8, padding:"0.7rem 0.8rem", marginBottom:8 }}>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 28px 1fr auto", gap:6, alignItems:"end" }}>
                              {/* DESDE */}
                              <div>
                                <div style={{ fontSize:"0.62rem", color:C.muted, fontWeight:700, marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase" }}>Desde</div>
                                <div style={{ display:"flex", gap:4 }}>
                                  <select value={desdeP.m}
                                    onChange={e=>{ const m=e.target.value; updRango("desde", buildMmDd(m, desdeP.d)); }}
                                    style={selSt}>
                                    <option value="">Mes</option>
                                    {MESES_NOM.map((n,idx)=><option key={idx} value={MESES_SHORT[idx]} style={{background:C.surface2}}>{n}</option>)}
                                  </select>
                                  <select value={desdeP.d}
                                    onChange={e=>updRango("desde", buildMmDd(desdeP.m, e.target.value))}
                                    disabled={!desdeP.m}
                                    style={{...selSt, opacity:desdeP.m?1:0.4}}>
                                    <option value="">Día</option>
                                    {Array.from({length:maxDias(desdeP.m)},(_,k)=>String(k+1).padStart(2,"0")).map(d=><option key={d} value={d} style={{background:C.surface2}}>{d}</option>)}
                                  </select>
                                </div>
                              </div>
                              {/* FLECHA */}
                              <div style={{ color:C.muted, textAlign:"center", paddingBottom:8 }}>→</div>
                              {/* HASTA */}
                              <div>
                                <div style={{ fontSize:"0.62rem", color:C.muted, fontWeight:700, marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase" }}>Hasta</div>
                                <div style={{ display:"flex", gap:4 }}>
                                  <select value={hastaP.m}
                                    onChange={e=>{ const m=e.target.value; updRango("hasta", buildMmDd(m, hastaP.d)); }}
                                    style={selSt}>
                                    <option value="">Mes</option>
                                    {MESES_NOM.map((n,idx)=><option key={idx} value={MESES_SHORT[idx]} style={{background:C.surface2}}>{n}</option>)}
                                  </select>
                                  <select value={hastaP.d}
                                    onChange={e=>updRango("hasta", buildMmDd(hastaP.m, e.target.value))}
                                    disabled={!hastaP.m}
                                    style={{...selSt, opacity:hastaP.m?1:0.4}}>
                                    <option value="">Día</option>
                                    {Array.from({length:maxDias(hastaP.m)},(_,k)=>String(k+1).padStart(2,"0")).map(d=><option key={d} value={d} style={{background:C.surface2}}>{d}</option>)}
                                  </select>
                                </div>
                              </div>
                              {/* BORRAR */}
                              <div style={{ paddingBottom:4 }}>
                                {temp.rangos.length > 1
                                  ? <button onClick={()=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,rangos:t.rangos.filter((_,j)=>j!==ri)}:t)}))}
                                      style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:"1rem"}}>✕</button>
                                  : <span style={{width:20,display:"inline-block"}}/>
                                }
                              </div>
                            </div>
                            {/* Resumen texto del rango */}
                            {rango.desde && rango.hasta && (
                              <div style={{ marginTop:6, fontSize:"0.7rem", color:C.muted, fontStyle:"italic" }}>
                                {(() => {
                                  const dp=parseMmDd(rango.desde), hp=parseMmDd(rango.hasta);
                                  const mn=n=>MESES_NOM[parseInt(n)-1]||n;
                                  return `${dp.d} de ${mn(dp.m)} → ${hp.d} de ${mn(hp.m)}`;
                                })()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <button onClick={()=>setForm(f=>({...f,tarifas:f.tarifas.map((t,i)=>i===ti?{...t,rangos:[...t.rangos,{desde:"",hasta:""}]}:t)}))}
                        style={{...S.btnSm("rgba(255,255,255,0.06)",C.border), marginTop:4}}>
                        + Agregar rango de fechas
                      </button>
                    </div>
                  </div>
                ))}
                {/* Timeline visual */}
                <TimelineAnual tarifas={form.tarifas} />
                <p style={{ fontSize:"0.72rem", color:C.muted, marginTop:4, lineHeight:1.6 }}>
                  Los precios son orientativos. Al consultar por WhatsApp podemos ajustar según condiciones específicas.
                </p>
              </Seccion>

              {/* ── Fotos ── */}
              <Seccion titulo={`Fotos (${form.fotos?.length || 0})`}>
                {/* Preview fotos actuales */}
                {form.fotos?.length > 0 && (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:"1rem" }}>
                    {form.fotos.map((url, i) => (
                      <div key={i} style={{ position:"relative", width:110, height:80 }}>
                        <img src={url} alt={`Foto ${i+1}`} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:8, display:"block", border: i===0 ? `2px solid ${C.green}` : `1px solid ${C.border}` }}/>
                        {i===0
                          ? <div style={{ position:"absolute", top:3, left:3, background:"rgba(82,183,136,0.9)", color:"#fff", fontSize:"0.55rem", padding:"1px 5px", borderRadius:4, fontWeight:700 }}>PORTADA</div>
                          : <button onClick={() => setPortada(i)} title="Usar como portada" style={{ position:"absolute", top:3, left:3, background:"rgba(0,0,0,0.55)", border:"none", color:"#fff", fontSize:"0.55rem", padding:"2px 5px", borderRadius:4, cursor:"pointer", fontWeight:600 }}>⭐ portada</button>
                        }
                        <button onClick={() => eliminarFoto(i)} style={{ position:"absolute", top:-5, right:-5, width:18, height:18, borderRadius:"50%", background:"#e05252", border:"none", color:"#fff", fontSize:"0.7rem", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Upload */}
                <div style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${C.border}`, borderRadius:8, padding:"1rem", textAlign:"center" }}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => agregarFotos(e.target.files)}
                    style={{ display:"none" }}
                    id="foto-upload"
                  />
                  <label htmlFor="foto-upload" style={{ cursor:"pointer", display:"inline-flex", flexDirection:"column", alignItems:"center", gap:6 }}>
                    <div style={{ fontSize:"1.6rem" }}>📷</div>
                    <span style={{ fontSize:"0.83rem", color:C.green, fontWeight:600 }}>
                      {uploading ? uploadMsg : "Seleccionar fotos"}
                    </span>
                    <span style={{ fontSize:"0.72rem", color:C.muted }}>JPG o PNG · podés seleccionar varias a la vez</span>
                  </label>
                  {uploadMsg && !uploading && (
                    <div style={{ marginTop:8, fontSize:"0.8rem", color:C.green }}>{uploadMsg}</div>
                  )}
                </div>
                <p style={{ fontSize:"0.72rem", color:C.muted, marginTop:6 }}>Hacé clic en <strong style={{color:C.muted}}>⭐ portada</strong> en cualquier foto para usarla como imagen principal.</p>
              </Seccion>

              {/* ── Comodidades ── */}
              <Seccion titulo="Comodidades">
                <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:"0.9rem" }}>
                  {AMENITIES_SUGERIDOS.map(a => (
                    <button key={a} type="button" onClick={() => toggleAmenity(a)} style={{
                      padding:"5px 12px", borderRadius:16, fontSize:"0.8rem", cursor:"pointer",
                      background:  form.amenities.includes(a) ? C.greenDim : "rgba(255,255,255,0.05)",
                      color:       form.amenities.includes(a) ? C.green : C.muted,
                      border:      `1.5px solid ${form.amenities.includes(a) ? C.green : C.border}`,
                      fontWeight:  form.amenities.includes(a) ? 600 : 400,
                      transition:  "all 0.15s",
                    }}>{a}</button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <input
                    value={amenInput}
                    onChange={e => setAmenInput(e.target.value)}
                    onKeyDown={e => e.key==="Enter" && (e.preventDefault(), addCustomAmenity())}
                    placeholder="Otra comodidad personalizada…"
                    style={{...S.inp, flex:1}}
                  />
                  <button type="button" onClick={addCustomAmenity} style={S.btnSm("#2d6a4f", C.green)}>+ Agregar</button>
                </div>
                {form.amenities.filter(a => !AMENITIES_SUGERIDOS.includes(a)).length > 0 && (
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                    {form.amenities.filter(a => !AMENITIES_SUGERIDOS.includes(a)).map(a => (
                      <span key={a} style={{ background:C.greenDim, color:C.green, border:`1px solid ${C.green}`, borderRadius:16, fontSize:"0.78rem", padding:"3px 10px", display:"flex", alignItems:"center", gap:5 }}>
                        {a}
                        <button onClick={() => toggleAmenity(a)} style={{ background:"none", border:"none", color:C.green, cursor:"pointer", fontSize:"0.8rem", lineHeight:1, padding:0 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </Seccion>

              {/* ── Visibilidad ── */}
              <Seccion titulo="Visibilidad en la web">
                <label style={{ display:"flex", alignItems:"center", gap:14, cursor:"pointer", background: form.mostrarEnWeb ? C.greenDim : "rgba(255,255,255,0.03)", border:`1px solid ${form.mostrarEnWeb ? C.greenBrd : C.border}`, borderRadius:10, padding:"1rem 1.2rem", transition:"all 0.2s" }}>
                  <input
                    type="checkbox"
                    checked={form.mostrarEnWeb}
                    onChange={e => setForm(f => ({...f, mostrarEnWeb:e.target.checked}))}
                    style={{ width:18, height:18, cursor:"pointer", accentColor:C.green }}
                  />
                  <div>
                    <span style={{ fontSize:"0.92rem", color: form.mostrarEnWeb ? C.green : C.muted, fontWeight:600 }}>
                      {form.mostrarEnWeb ? "✓ Visible en la web pública" : "Oculta — no aparece en la web"}
                    </span>
                    <p style={{ fontSize:"0.75rem", color:C.muted, marginTop:3 }}>
                      Las propiedades en modalidad solo administración deben quedar ocultas.
                    </p>
                  </div>
                </label>
              </Seccion>

            </div>{/* /body */}

            {/* Footer modal */}
            <div style={{ padding:"1rem 1.8rem", borderTop:`1px solid ${C.border2}`, display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button onClick={cerrar} disabled={saving} style={S.btnGhost}>Cancelar</button>
              <button onClick={guardar} disabled={saving || uploading} style={S.btnPrimary}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>

          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Tag({ children }) {
  return (
    <span style={{ background:"rgba(255,255,255,0.07)", color:"#c9d1d9", fontSize:"0.72rem", padding:"2px 9px", borderRadius:10 }}>
      {children}
    </span>
  );
}
