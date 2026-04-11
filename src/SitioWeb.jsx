// ============================================================
// SitioWeb.jsx — Panel admin: propiedades de la web pública
// Solo visible para rol admin en FANG
// Usa window._db (Firebase v8 compat) y window._storage
// ============================================================

import { useState, useEffect, useRef } from "react";

const COLL = "sitioWeb_propiedades";
const TIPOS = ["Cabaña", "Casa", "Loft", "Departamento", "Chalet", "Suite", "Otro"];
const MONEDAS = ["USD", "ARS"];
const AMENITIES_SUGERIDOS = [
  "Chimenea", "Vista lago", "Vista cordillera", "Asador",
  "Deck", "Jardín", "Jacuzzi", "Estacionamiento",
  "Wi-Fi", "Calefacción central", "Aire acondicionado",
  "Lavarropas", "Cocina equipada", "Lavavajillas",
];

const VACIO = {
  nombre: "", descripcion: "", tipo: "Cabaña",
  capacidad: "", camas: "", banos: "",
  precio: "", moneda: "USD",
  amenities: [], fotoUrl: "",
  mostrarEnWeb: false, fangPropNombre: "", orden: 99,
};

export default function SitioWeb() {
  const [props, setProps]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState(VACIO);
  const [uploadMsg, setUploadMsg] = useState("");
  const [amenInput, setAmenInput] = useState("");
  const fileRef = useRef(null);

  // Suscripción en tiempo real
  useEffect(() => {
    if (!window._db) return;
    const unsub = window._db
      .collection(COLL)
      .orderBy("orden", "asc")
      .onSnapshot(
        snap => { setProps(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); },
        ()    => setLoading(false)
      );
    return unsub;
  }, []);

  function abrirNuevo() { setForm({ ...VACIO }); setUploadMsg(""); setModal("nuevo"); }
  function abrirEditar(p) { setForm({ ...VACIO, ...p }); setUploadMsg(""); setModal(p); }
  function cerrar() { setModal(null); setSaving(false); setUploadMsg(""); }

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

  async function guardar() {
    if (!form.nombre.trim()) { alert("El nombre es obligatorio."); return; }
    if (!window._db) { alert("Firebase no conectado."); return; }
    setSaving(true);
    try {
      let fotoUrl = form.fotoUrl || "";
      if (fileRef.current?.files?.[0]) fotoUrl = await subirFoto(fileRef.current.files[0]);

      const data = {
        nombre:         form.nombre.trim(),
        descripcion:    form.descripcion.trim(),
        tipo:           form.tipo,
        capacidad:      Number(form.capacidad) || 0,
        camas:          Number(form.camas) || 0,
        banos:          Number(form.banos) || 0,
        precio:         Number(form.precio) || 0,
        moneda:         form.moneda,
        amenities:      form.amenities,
        fotoUrl,
        mostrarEnWeb:   Boolean(form.mostrarEnWeb),
        fangPropNombre: form.fangPropNombre?.trim() || "",
        orden:          Number(form.orden) || 99,
        updatedAt:      window.firebase.firestore.FieldValue.serverTimestamp(),
      };

      if (modal === "nuevo") {
        data.createdAt = window.firebase.firestore.FieldValue.serverTimestamp();
        await window._db.collection(COLL).add(data);
      } else {
        await window._db.collection(COLL).doc(modal.id).update(data);
      }
      cerrar();
    } catch (e) {
      console.error(e);
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(p) {
    if (!confirm(`¿Eliminar "${p.nombre}" de la web? Esta acción no se puede deshacer.`)) return;
    await window._db.collection(COLL).doc(p.id).delete();
  }

  async function toggleWeb(p) {
    await window._db.collection(COLL).doc(p.id).update({ mostrarEnWeb: !p.mostrarEnWeb });
  }

  function toggleAmenity(a) {
    setForm(f => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter(x=>x!==a) : [...f.amenities, a] }));
  }
  function addCustomAmenity() {
    const v = amenInput.trim();
    if (v && !form.amenities.includes(v)) setForm(f => ({ ...f, amenities: [...f.amenities, v] }));
    setAmenInput("");
  }

  return (
    <div style={{ padding:"1.5rem", maxWidth:920, color:"var(--text-primary)" }}>

      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:"1.5rem", gap:"1rem", flexWrap:"wrap" }}>
        <p style={{ fontSize:"0.85rem", color:"var(--text-secondary)", lineHeight:1.6 }}>
          Solo las propiedades marcadas como <strong>Visible</strong> aparecen en la web pública.<br/>
          Las de modalidad "solo administración" dejálas ocultas.
        </p>
        <button onClick={abrirNuevo} style={btnPrimary}>+ Nueva propiedad</button>
      </div>

      {loading && <p style={{ color:"var(--text-secondary)" }}>Cargando…</p>}

      {!loading && props.length === 0 && (
        <div style={{ textAlign:"center", padding:"3rem", color:"var(--text-secondary)", border:"2px dashed rgba(255,255,255,0.1)", borderRadius:12 }}>
          <p style={{ marginBottom:"1rem" }}>Aún no hay propiedades cargadas para la web pública.</p>
          <button onClick={abrirNuevo} style={btnPrimary}>Agregar la primera</button>
        </div>
      )}

      {!loading && props.length > 0 && (
        <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"0.88rem" }}>
            <thead>
              <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)" }}>
                {["Ord","Foto","Nombre","Tipo","Cap.","Precio","Visible","Acciones"].map(h=>(
                  <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontWeight:600, color:"var(--text-secondary)", fontSize:"0.75rem", letterSpacing:"0.05em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.map(p=>(
                <tr key={p.id} style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  <td style={td}>{p.orden}</td>
                  <td style={td}>
                    {p.fotoUrl
                      ? <img src={p.fotoUrl} alt={p.nombre} style={{ width:56,height:42,objectFit:"cover",borderRadius:6 }}/>
                      : <div style={{ width:56,height:42,background:"rgba(255,255,255,0.06)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem" }}>🏠</div>
                    }
                  </td>
                  <td style={td}>
                    <span style={{ fontWeight:500 }}>{p.nombre}</span>
                    {p.fangPropNombre && p.fangPropNombre!==p.nombre &&
                      <span style={{ display:"block",fontSize:"0.72rem",color:"var(--text-secondary)",marginTop:2 }}>FANG: {p.fangPropNombre}</span>
                    }
                  </td>
                  <td style={{...td,color:"var(--text-secondary)"}}>{p.tipo}</td>
                  <td style={{...td,color:"var(--text-secondary)"}}>{p.capacidad||"—"}</td>
                  <td style={td}>{p.precio?`${p.moneda} ${p.precio}`:"—"}</td>
                  <td style={td}>
                    <button onClick={()=>toggleWeb(p)} style={{ padding:"4px 14px",borderRadius:20,border:"none",cursor:"pointer",fontSize:"0.78rem",fontWeight:600,background:p.mostrarEnWeb?"rgba(74,140,106,0.2)":"rgba(255,255,255,0.06)",color:p.mostrarEnWeb?"#6fcf97":"var(--text-secondary)" }}>
                      {p.mostrarEnWeb?"✓ Visible":"Oculta"}
                    </button>
                  </td>
                  <td style={td}>
                    <div style={{ display:"flex",gap:6 }}>
                      <button onClick={()=>abrirEditar(p)} style={btnSm("#4a8c6a")}>Editar</button>
                      <button onClick={()=>eliminar(p)}    style={btnSm("#c0392b")}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL */}
      {modal && (
        <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem" }}>
          <div style={{ background:"var(--card-bg,#1e2a35)",borderRadius:14,padding:"2rem",width:"100%",maxWidth:660,maxHeight:"90vh",overflowY:"auto",border:"1px solid rgba(255,255,255,0.1)" }}>
            <h3 style={{ marginBottom:"1.4rem",fontSize:"1.1rem",fontWeight:700 }}>
              {modal==="nuevo"?"🌐 Nueva propiedad para la web":`✏️ Editar: ${modal.nombre}`}
            </h3>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem" }}>

              <Field label="Nombre *" span={2}><input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Cabaña del Bosque" style={inp}/></Field>

              <Field label="Tipo">
                <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={inp}>
                  {TIPOS.map(t=><option key={t}>{t}</option>)}
                </select>
              </Field>

              <Field label="Nombre en FANG (para el calendario)">
                <input value={form.fangPropNombre} onChange={e=>setForm(f=>({...f,fangPropNombre:e.target.value}))} placeholder="Exactamente como aparece en FANG" style={inp}/>
              </Field>

              <Field label="Descripción para la web" span={2}>
                <textarea value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} rows={3} placeholder="Texto que verán los huéspedes…" style={{...inp,resize:"vertical"}}/>
              </Field>

              <Field label="Capacidad (huéspedes)"><input type="number" min={1} value={form.capacidad} onChange={e=>setForm(f=>({...f,capacidad:e.target.value}))} style={inp}/></Field>
              <Field label="Camas"><input type="number" min={1} value={form.camas} onChange={e=>setForm(f=>({...f,camas:e.target.value}))} style={inp}/></Field>
              <Field label="Baños"><input type="number" min={1} value={form.banos} onChange={e=>setForm(f=>({...f,banos:e.target.value}))} style={inp}/></Field>
              <Field label="Orden en la web (1 = primero)"><input type="number" min={1} value={form.orden} onChange={e=>setForm(f=>({...f,orden:e.target.value}))} style={inp}/></Field>

              <Field label="Precio por noche"><input type="number" min={0} value={form.precio} onChange={e=>setForm(f=>({...f,precio:e.target.value}))} placeholder="120" style={inp}/></Field>
              <Field label="Moneda">
                <select value={form.moneda} onChange={e=>setForm(f=>({...f,moneda:e.target.value}))} style={inp}>
                  {MONEDAS.map(m=><option key={m}>{m}</option>)}
                </select>
              </Field>

              <Field label="Foto principal" span={2}>
                <div style={{ display:"flex",alignItems:"center",gap:"1rem",flexWrap:"wrap" }}>
                  {form.fotoUrl && <img src={form.fotoUrl} alt="" style={{ width:80,height:60,objectFit:"cover",borderRadius:6,border:"1px solid rgba(255,255,255,0.1)" }}/>}
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ fontSize:"0.85rem",color:"var(--text-primary)" }}/>
                    <p style={{ fontSize:"0.72rem",color:"var(--text-secondary)",marginTop:4 }}>JPG o PNG. Reemplaza la foto anterior.</p>
                    {uploadMsg && <p style={{ fontSize:"0.8rem",color:"#6fcf97",marginTop:4 }}>{uploadMsg}</p>}
                  </div>
                </div>
              </Field>

              <Field label="Comodidades" span={2}>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:10 }}>
                  {AMENITIES_SUGERIDOS.map(a=>(
                    <button key={a} type="button" onClick={()=>toggleAmenity(a)} style={{ padding:"4px 11px",borderRadius:16,border:"1.5px solid",fontSize:"0.78rem",cursor:"pointer",background:form.amenities.includes(a)?"rgba(74,140,106,0.3)":"rgba(255,255,255,0.05)",color:form.amenities.includes(a)?"#6fcf97":"var(--text-secondary)",borderColor:form.amenities.includes(a)?"#4a8c6a":"rgba(255,255,255,0.12)" }}>{a}</button>
                  ))}
                </div>
                <div style={{ display:"flex",gap:6 }}>
                  <input value={amenInput} onChange={e=>setAmenInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&(e.preventDefault(),addCustomAmenity())} placeholder="Otra comodidad personalizada…" style={{...inp,flex:1}}/>
                  <button type="button" onClick={addCustomAmenity} style={btnSm("#4a8c6a")}>+ Agregar</button>
                </div>
              </Field>

              <Field label="Visibilidad en la web pública" span={2}>
                <label style={{ display:"flex",alignItems:"center",gap:10,cursor:"pointer" }}>
                  <input type="checkbox" checked={form.mostrarEnWeb} onChange={e=>setForm(f=>({...f,mostrarEnWeb:e.target.checked}))} style={{ width:18,height:18,cursor:"pointer",accentColor:"#4a8c6a" }}/>
                  <span style={{ fontSize:"0.9rem",color:form.mostrarEnWeb?"#6fcf97":"var(--text-secondary)" }}>
                    {form.mostrarEnWeb?"✓ Visible en la web pública":"Oculta — no aparece en la web"}
                  </span>
                </label>
                <p style={{ fontSize:"0.75rem",color:"var(--text-secondary)",marginTop:5,marginLeft:28,lineHeight:1.5 }}>
                  Las propiedades en modalidad "solo administración" deben quedar desmarcadas.
                </p>
              </Field>

            </div>

            <div style={{ display:"flex",justifyContent:"flex-end",gap:10,marginTop:"1.5rem",paddingTop:"1rem",borderTop:"1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={cerrar} disabled={saving} style={btnSm("rgba(255,255,255,0.1)")}>Cancelar</button>
              <button onClick={guardar} disabled={saving} style={btnPrimary}>
                {saving?"Guardando…":modal==="nuevo"?"Crear propiedad":"Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, span }) {
  return (
    <div style={{ gridColumn:span===2?"1 / -1":undefined }}>
      <label style={{ display:"block",fontSize:"0.72rem",fontWeight:600,color:"var(--text-secondary)",marginBottom:5,letterSpacing:"0.06em",textTransform:"uppercase" }}>{label}</label>
      {children}
    </div>
  );
}
const td         = { padding:"10px 12px" };
const inp        = { width:"100%",padding:"8px 10px",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,fontSize:"0.9rem",fontFamily:"inherit",outline:"none",background:"rgba(255,255,255,0.05)",color:"var(--text-primary)" };
const btnPrimary = { padding:"9px 20px",background:"#1b3a2d",color:"#fff",border:"1px solid #4a8c6a",borderRadius:8,cursor:"pointer",fontSize:"0.88rem",fontWeight:600 };
function btnSm(bg) { return { padding:"6px 14px",background:bg,color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:"0.8rem",fontWeight:500 }; }
