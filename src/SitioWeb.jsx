// ============================================================
// SitioWeb.jsx — Panel admin: propiedades de la web pública
// Lee las propiedades ya cargadas en FANG (colección "props")
// y permite agregarles detalles para la web pública.
// ============================================================

import { useState, useEffect, useRef } from "react";

const COLL_WEB = "sitioWeb_propiedades";

const TIPOS = ["Cabaña", "Casa", "Loft", "Departamento", "Chalet", "Suite", "Otro"];
const MONEDAS = ["USD", "ARS"];
const AMENITIES_SUGERIDOS = [
  "Chimenea", "Vista lago", "Vista cordillera", "Asador",
  "Deck", "Jardín", "Jacuzzi", "Estacionamiento",
  "Wi-Fi", "Calefacción central", "Aire acondicionado",
  "Lavarropas", "Cocina equipada", "Lavavajillas",
];

const WEB_VACIO = {
  nombreWeb: "",
  descripcion: "", tipo: "Cabaña",
  capacidad: "", camas: "", banos: "",
  precio: "", moneda: "USD",
  amenities: [], fotoUrl: "",
  mostrarEnWeb: false, orden: 99,
};

// ── Estilos base ────────────────────────────────────────────
const S = {
  label: { display:"block", fontSize:"0.72rem", fontWeight:700, color:"#a0aab4", marginBottom:5, letterSpacing:"0.07em", textTransform:"uppercase" },
  inp:   { width:"100%", padding:"9px 11px", border:"1px solid rgba(255,255,255,0.18)", borderRadius:8, fontSize:"0.92rem", fontFamily:"inherit", outline:"none", background:"#1e2d3d", color:"#f0f4f8", boxSizing:"border-box" },
  btnPrimary: { padding:"9px 22px", background:"#2d6a4f", color:"#fff", border:"1px solid #52b788", borderRadius:8, cursor:"pointer", fontSize:"0.9rem", fontWeight:700 },
  btnGhost:   { padding:"9px 18px", background:"rgba(255,255,255,0.07)", color:"#c9d1d9", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, cursor:"pointer", fontSize:"0.88rem" },
  btnSm: (bg) => ({ padding:"6px 14px", background:bg, color:"#fff", border:"none", borderRadius:6, cursor:"pointer", fontSize:"0.8rem", fontWeight:600 }),
  card:  { background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"1.2rem 1.4rem", marginBottom:"0.9rem" },
};

export default function SitioWeb() {
  const [fangProps, setFangProps] = useState([]);   // props de FANG
  const [webData,   setWebData]   = useState({});   // id → datos web (de sitioWeb_propiedades)
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | fangProp object
  const [form,      setForm]      = useState(WEB_VACIO);
  const [saving,    setSaving]    = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [amenInput, setAmenInput] = useState("");
  const fileRef = useRef(null);

  // ── Cargar props de FANG ────────────────────────────────
  useEffect(() => {
    if (!window._db) return;

    // Suscripción a props de FANG
    const unsubFang = window._db.collection("props")
      .onSnapshot(snap => {
        setFangProps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

    // Suscripción a datos web
    const unsubWeb = window._db.collection(COLL_WEB)
      .onSnapshot(snap => {
        const map = {};
        snap.docs.forEach(d => { map[d.id] = { docId: d.id, ...d.data() }; });
        setWebData(map);
        setLoading(false);
      }, () => setLoading(false));

    return () => { unsubFang(); unsubWeb(); };
  }, []);

  // ── Abrir modal edición de detalles web ─────────────────
  function abrirEditar(fangProp) {
    const existing = webData[fangProp.id] || {};
    // Calcular camas y capacidad desde dormitorios de FANG
    const dorms     = Array.isArray(fangProp.dormitorios) ? fangProp.dormitorios : [];
    const camasCalc = dorms.reduce((s,d) => s + (d.matrimoniales||0) + (d.simples||0), 0);
    const capacCalc = dorms.reduce((s,d) => s + (d.matrimoniales||0)*2 + (d.simples||0), 0);
    const nombreWeb = existing.nombre && existing.nombre !== fangProp.name ? existing.nombre : fangProp.name;
    setForm({
      ...WEB_VACIO,
      camas:     camasCalc || "",
      capacidad: capacCalc || "",
      ...existing,
      nombreWeb,
    });
    setUploadMsg("");
    setModal(fangProp);
  }
  function cerrar() { setModal(null); setSaving(false); setUploadMsg(""); }

  // ── Toggle rápido visible/oculta ────────────────────────
  async function toggleWeb(fangProp) {
    if (!window._db) return;
    const existing = webData[fangProp.id];
    const nuevoValor = !(existing?.mostrarEnWeb || false);
    if (existing) {
      await window._db.collection(COLL_WEB).doc(fangProp.id).update({ mostrarEnWeb: nuevoValor });
    } else {
      // Crear doc mínimo si no existe
      await window._db.collection(COLL_WEB).doc(fangProp.id).set({
        nombre: fangProp.name,
        mostrarEnWeb: nuevoValor,
        orden: 99,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // ── Subir foto ──────────────────────────────────────────
  async function subirFoto(file) {
    if (!window._storage) throw new Error("Storage no inicializado.");
    const path = `sitioWeb/${Date.now()}_${file.name}`;
    const ref = window._storage.ref(path);
    setUploadMsg("Subiendo foto…");
    const snap = await ref.put(file);
    const url = await snap.ref.getDownloadURL();
    setUploadMsg("✓ Foto subida");
    return url;
  }

  // ── Guardar detalles web ────────────────────────────────
  async function guardar() {
    if (!window._db || !modal) return;
    setSaving(true);
    try {
      let fotoUrl = form.fotoUrl || "";
      if (fileRef.current?.files?.[0]) fotoUrl = await subirFoto(fileRef.current.files[0]);

      const data = {
        nombre:       form.nombreWeb.trim() || modal.name,
        nombreFang:   modal.name,
        descripcion:  form.descripcion.trim(),
        tipo:         form.tipo,
        capacidad:    Number(form.capacidad) || 0,
        camas:        Number(form.camas)     || 0,
        banos:        Number(form.banos)     || 0,
        precio:       Number(form.precio)    || 0,
        moneda:       form.moneda,
        amenities:    form.amenities,
        fotoUrl,
        mostrarEnWeb: Boolean(form.mostrarEnWeb),
        orden:        Number(form.orden) || 99,
        updatedAt:    window.firebase.firestore.FieldValue.serverTimestamp(),
      };

      // Usar el mismo ID que la prop de FANG para fácil cruce
      const docRef = window._db.collection(COLL_WEB).doc(modal.id);
      const existing = webData[modal.id];
      if (existing) {
        await docRef.update(data);
      } else {
        data.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        await docRef.set(data);
      }
      cerrar();
    } catch (e) {
      console.error(e);
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleAmenity(a) {
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x=>x!==a) : [...f.amenities, a] }));
  }
  function addCustomAmenity() {
    const v = amenInput.trim();
    if (v && !form.amenities.includes(v)) setForm(f => ({ ...f, amenities: [...f.amenities, v] }));
    setAmenInput("");
  }

  // ── RENDER ──────────────────────────────────────────────
  return (
    <div style={{ padding:"1.5rem", maxWidth:860, color:"#f0f4f8" }}>

      {/* Descripción */}
      <p style={{ fontSize:"0.88rem", color:"#a0aab4", marginBottom:"1.8rem", lineHeight:1.7 }}>
        Estas son las propiedades cargadas en FANG. Hacé clic en <strong style={{color:"#52b788"}}>Editar detalles web</strong> para agregar descripción, foto, precio y comodidades.
        Activá el toggle <strong style={{color:"#52b788"}}>Visible</strong> para que aparezca en la web pública.
      </p>

      {loading && <p style={{ color:"#a0aab4" }}>Cargando propiedades…</p>}

      {!loading && fangProps.length === 0 && (
        <div style={{ textAlign:"center", padding:"3rem", color:"#a0aab4", border:"2px dashed rgba(255,255,255,0.1)", borderRadius:12 }}>
          <p>No hay propiedades cargadas en FANG todavía.</p>
          <p style={{ fontSize:"0.82rem", marginTop:"0.5rem" }}>Cargalas primero en la sección <strong>Propiedades/Hab.</strong></p>
        </div>
      )}

      {/* Lista de props de FANG */}
      {fangProps.map(p => {
        const web = webData[p.id];
        const visible = web?.mostrarEnWeb || false;
        const tieneDetalles = !!(web?.descripcion || web?.fotoUrl || web?.precio);

        return (
          <div key={p.id} style={S.card}>
            <div style={{ display:"flex", alignItems:"center", gap:"1rem", flexWrap:"wrap" }}>

              {/* Color dot + nombre */}
              <div style={{ width:14, height:14, borderRadius:"50%", background:p.color||"#4a8c6a", flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:"1rem", color:"#f0f4f8" }}>
                  {web?.nombre && web.nombre !== p.name ? web.nombre : p.name}
                </div>
                <div style={{ fontSize:"0.78rem", color:"#a0aab4", marginTop:2 }}>
                  {web?.nombre && web.nombre !== p.name ? `FANG: ${p.name}` : (p.direccion || "")}
                </div>
                {web && (
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
                    {web.tipo     && <Tag>{web.tipo}</Tag>}
                    {web.capacidad ? <Tag>{web.capacidad} huéspedes</Tag> : null}
                    {web.precio   ? <Tag>{web.moneda} {web.precio}/noche</Tag> : null}
                    {!tieneDetalles && <span style={{ fontSize:"0.75rem", color:"#e09f3e" }}>⚠ Sin detalles web aún</span>}
                  </div>
                )}
                {!web && <span style={{ fontSize:"0.75rem", color:"#e09f3e", marginTop:4, display:"block" }}>⚠ Sin detalles web aún</span>}
              </div>

              {/* Foto miniatura */}
              {web?.fotoUrl
                ? <img src={web.fotoUrl} alt={p.name} style={{ width:64, height:48, objectFit:"cover", borderRadius:8, flexShrink:0 }}/>
                : <div style={{ width:64, height:48, background:"rgba(255,255,255,0.06)", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.4rem", flexShrink:0 }}>🏠</div>
              }

              {/* Acciones */}
              <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                <button
                  onClick={() => toggleWeb(p)}
                  style={{
                    padding:"6px 16px", borderRadius:20, border:"none", cursor:"pointer",
                    fontSize:"0.8rem", fontWeight:700,
                    background: visible ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.07)",
                    color:      visible ? "#52b788" : "#a0aab4",
                    transition: "all 0.2s",
                  }}
                >
                  {visible ? "✓ Visible" : "Oculta"}
                </button>
                <button onClick={() => abrirEditar(p)} style={S.btnSm("#2d6a4f")}>
                  Editar detalles web
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* ── MODAL ── */}
      {modal && (
        <div onClick={e=>e.target===e.currentTarget&&cerrar()} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.72)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:"1rem" }}>
          <div style={{ background:"#1a2332", border:"1px solid rgba(255,255,255,0.14)", borderRadius:16, padding:"2rem", width:"100%", maxWidth:660, maxHeight:"90vh", overflowY:"auto" }}>

            <div style={{ marginBottom:"1.5rem" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:14, height:14, borderRadius:"50%", background:modal.color||"#4a8c6a" }}/>
                <h3 style={{ fontSize:"1.15rem", fontWeight:700, color:"#f0f4f8", margin:0 }}>
                  {modal.name}
                </h3>
              </div>
              <p style={{ fontSize:"0.82rem", color:"#a0aab4", marginTop:6, marginLeft:24 }}>
                Completá los detalles que se van a mostrar en la web pública.
              </p>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.1rem" }}>

              <div style={{ gridColumn:"1 / -1" }}>
                <label style={S.label}>Nombre para la web</label>
                <input value={form.nombreWeb} onChange={e=>setForm(f=>({...f,nombreWeb:e.target.value}))} placeholder={`Ej: Cabaña del Bosque (en FANG: ${modal.name})`} style={S.inp}/>
                <p style={{ fontSize:"0.72rem", color:"#a0aab4", marginTop:4 }}>El nombre que verán los huéspedes. Si lo dejás vacío se usa el nombre de FANG.</p>
              </div>

              <div style={{ gridColumn:"1 / -1" }}>
                <label style={S.label}>Tipo de propiedad</label>
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={S.inp}>
                  {TIPOS.map(t=><option key={t} style={{background:"#1e2d3d",color:"#f0f4f8"}}>{t}</option>)}
                </select>
              </div>

              <div style={{ gridColumn:"1 / -1" }}>
                <label style={S.label}>Descripción para la web</label>
                <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} rows={4} placeholder="Texto que verán los huéspedes al ver esta propiedad…" style={{...S.inp,resize:"vertical"}}/>
              </div>

              <div>
                <label style={S.label}>Capacidad (huéspedes)</label>
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
              <div>
                <label style={S.label}>Orden en la web (1 = primero)</label>
                <input type="number" min={1} value={form.orden} onChange={e=>setForm(f=>({...f,orden:e.target.value}))} style={S.inp}/>
              </div>

              <div>
                <label style={S.label}>Precio por noche</label>
                <input type="number" min={0} value={form.precio} onChange={e=>setForm(f=>({...f,precio:e.target.value}))} placeholder="120" style={S.inp}/>
              </div>
              <div>
                <label style={S.label}>Moneda</label>
                <select value={form.moneda} onChange={e=>setForm(f=>({...f,moneda:e.target.value}))} style={S.inp}>
                  {MONEDAS.map(m=><option key={m} style={{background:"#1e2d3d",color:"#f0f4f8"}}>{m}</option>)}
                </select>
              </div>

              {/* Foto */}
              <div style={{ gridColumn:"1 / -1" }}>
                <label style={S.label}>Foto principal</label>
                <div style={{ display:"flex", alignItems:"center", gap:"1rem", flexWrap:"wrap", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"0.8rem 1rem" }}>
                  {form.fotoUrl && <img src={form.fotoUrl} alt="" style={{ width:90, height:66, objectFit:"cover", borderRadius:6 }}/>}
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ fontSize:"0.85rem", color:"#c9d1d9" }}/>
                    <p style={{ fontSize:"0.72rem", color:"#a0aab4", marginTop:4 }}>JPG o PNG. Reemplaza la foto anterior.</p>
                    {uploadMsg && <p style={{ fontSize:"0.82rem", color:"#52b788", marginTop:4 }}>{uploadMsg}</p>}
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div style={{ gridColumn:"1 / -1" }}>
                <label style={S.label}>Comodidades</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:7, marginBottom:10 }}>
                  {AMENITIES_SUGERIDOS.map(a => (
                    <button key={a} type="button" onClick={()=>toggleAmenity(a)} style={{
                      padding:"5px 12px", borderRadius:16, border:"1.5px solid", fontSize:"0.8rem", cursor:"pointer",
                      background:  form.amenities.includes(a) ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.05)",
                      color:       form.amenities.includes(a) ? "#52b788" : "#a0aab4",
                      borderColor: form.amenities.includes(a) ? "#52b788" : "rgba(255,255,255,0.15)",
                      fontWeight:  form.amenities.includes(a) ? 600 : 400,
                    }}>{a}</button>
                  ))}
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <input
                    value={amenInput}
                    onChange={e=>setAmenInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addCustomAmenity())}
                    placeholder="Otra comodidad…"
                    style={{...S.inp, flex:1}}
                  />
                  <button type="button" onClick={addCustomAmenity} style={S.btnSm("#2d6a4f")}>+ Agregar</button>
                </div>
              </div>

              {/* Visible */}
              <div style={{ gridColumn:"1 / -1" }}>
                <label style={S.label}>Visibilidad en la web pública</label>
                <label style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"0.8rem 1rem" }}>
                  <input
                    type="checkbox"
                    checked={form.mostrarEnWeb}
                    onChange={e=>setForm(f=>({...f,mostrarEnWeb:e.target.checked}))}
                    style={{ width:18, height:18, cursor:"pointer", accentColor:"#52b788" }}
                  />
                  <div>
                    <span style={{ fontSize:"0.92rem", color: form.mostrarEnWeb ? "#52b788" : "#a0aab4", fontWeight:600 }}>
                      {form.mostrarEnWeb ? "✓ Visible en la web pública" : "Oculta — no aparece en la web"}
                    </span>
                    <p style={{ fontSize:"0.75rem", color:"#a0aab4", marginTop:3 }}>
                      Las propiedades en modalidad "solo administración" deben quedar desmarcadas.
                    </p>
                  </div>
                </label>
              </div>

            </div>{/* /grid */}

            <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:"1.8rem", paddingTop:"1rem", borderTop:"1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={cerrar} disabled={saving} style={S.btnGhost}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={S.btnPrimary}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ children }) {
  return (
    <span style={{ background:"rgba(255,255,255,0.08)", color:"#c9d1d9", fontSize:"0.75rem", padding:"2px 9px", borderRadius:10 }}>
      {children}
    </span>
  );
}
