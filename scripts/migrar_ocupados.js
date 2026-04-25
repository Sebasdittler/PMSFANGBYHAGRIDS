/**
 * migrar_ocupados.js
 *
 * Copia los rangos de fechas de todas las reservas activas (no canceladas)
 * desde la colección `reservas` hacia `sitioWeb_ocupados`.
 *
 * Solo escribe { pid, ci, co } — ningún dato sensible del huésped.
 *
 * INSTRUCCIONES:
 *   1. Instalá las dependencias una sola vez:
 *        npm install firebase-admin
 *
 *   2. Descargá la Service Account Key desde Firebase Console:
 *        Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada
 *        Guardala como serviceAccountKey.json en la misma carpeta que este script.
 *
 *   3. Ejecutá en seco primero (dry run) para ver qué se escribiría:
 *        DRY_RUN=true node migrar_ocupados.js
 *
 *   4. Si el resultado es el esperado, ejecutá la migración real:
 *        node migrar_ocupados.js
 */

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

const DRY_RUN = process.env.DRY_RUN === "true";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrar() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no se escribirá nada en Firestore." : "🚀 Iniciando migración real...");
  console.log("");

  const snap = await db.collection("reservas").get();
  console.log(`📦 Total de documentos en 'reservas': ${snap.size}`);

  let escritas = 0;
  let omitidas = 0;
  let errores  = 0;

  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH = 500; // límite de Firestore por batch

  const flushBatch = async () => {
    if (batchCount === 0) return;
    if (!DRY_RUN) await batch.commit();
    batchCount = 0;
  };

  for (const docSnap of snap.docs) {
    const r = docSnap.data();
    const id = docSnap.id;

    // Omitir canceladas
    if ((r.estado || "").toLowerCase().startsWith("cancel")) {
      console.log(`  ⏭️  Omitida (cancelada): ${id} · ${r.guest || "—"}`);
      omitidas++;
      continue;
    }

    // Determinar ci y co (incluye aliases legacy por si existen en reservas viejas)
    const ci = r.ci || r.fechaEntrada || r.entrada || null;
    const co = r.co || r.fechaSalida  || r.salida  || null;

    if (!ci || !co) {
      console.log(`  ⚠️  Omitida (sin fechas): ${id} · ${r.guest || "—"}`);
      omitidas++;
      continue;
    }

    if (!r.pid) {
      console.log(`  ⚠️  Omitida (sin pid): ${id} · ${r.guest || "—"}`);
      omitidas++;
      continue;
    }

    console.log(`  ✅ ${DRY_RUN ? "[DRY]" : ""} Escribiendo: ${id} → pid=${r.pid}  ${ci} → ${co}`);

    const ref = db.collection("sitioWeb_ocupados").doc(id);
    batch.set(ref, { pid: r.pid, ci, co });
    batchCount++;
    escritas++;

    // Firestore admite máximo 500 operaciones por batch
    if (batchCount >= MAX_BATCH) {
      await flushBatch();
    }
  }

  await flushBatch();

  console.log("");
  console.log("────────────────────────────────");
  console.log(`✅ Escritas:  ${escritas}`);
  console.log(`⏭️  Omitidas: ${omitidas}`);
  console.log(`❌ Errores:   ${errores}`);
  if (DRY_RUN) {
    console.log("");
    console.log("👆 Esto fue un DRY RUN. Para aplicar, ejecutá: node migrar_ocupados.js");
  } else {
    console.log("");
    console.log("🎉 Migración completada. Verificá en Firebase Console → sitioWeb_ocupados.");
  }
}

migrar().catch(e => {
  console.error("Error fatal:", e);
  process.exit(1);
});
