/* eslint-disable max-len */
"use strict";

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp }     = require("firebase-admin/app");
const { getFirestore }      = require("firebase-admin/firestore");
const { getMessaging }      = require("firebase-admin/messaging");

initializeApp();

// ── URL pública de la app en Vercel ────────────────────────────────────────
// Reemplazá este valor con la URL real de tu deploy en Vercel.
const APP_URL = "https://fangfinal.vercel.app";

/**
 * Se dispara cada vez que se crea un documento nuevo en la colección "reservas".
 * Lee los datos, resuelve el nombre de la propiedad y manda push FCM a todos
 * los tokens registrados en "fcm_tokens".
 */
exports.notificarNuevaReserva = onDocumentCreated(
  { document: "reservas/{reservaId}", region: "us-central1" },
  async (event) => {
    const snap = event.data;
    if (!snap) return null;
    const reserva = snap.data();

    // Ignorar: docs marcados como "importados" (solo son un marcador) y
    // bloqueos genéricos de iCal sin huésped real.
    if (reserva.importedAs) return null;
    if (reserva.external && /bloqueado/i.test(reserva.guest || "")) return null;

    const db = getFirestore();

    // Resolver nombre de propiedad desde Firestore
    let propNombre = "";
    try {
      const propSnap = await db.collection("props").doc(String(reserva.pid || "")).get();
      if (propSnap.exists) propNombre = propSnap.data().name || "";
    } catch (_) { /* no-op: usamos propNombre vacío */ }

    // Obtener todos los tokens FCM registrados
    const tokensSnap = await db.collection("fcm_tokens").get();
    if (tokensSnap.empty) {
      console.log("[FCM] Sin tokens registrados, nada para enviar.");
      return null;
    }

    const tokenDocs = tokensSnap.docs
      .map((d) => ({ ref: d.ref, token: d.data().token }))
      .filter((d) => d.token);
    if (!tokenDocs.length) return null;

    const tokens = tokenDocs.map((d) => d.token);

    // Construir el mensaje
    const guest  = reserva.guest || "Huésped";
    const plat   = reserva.plat  || "";
    const fmtFecha = (s) => (s ? s.split("-").reverse().join("/") : "—");
    const ci = fmtFecha(reserva.ci);
    const co = fmtFecha(reserva.co);

    const title = `🏠 Nueva reserva${plat ? " · " + plat : ""}`;
    const body  = `${guest}${propNombre ? " · " + propNombre : ""} · ${ci} → ${co}`;

    const message = {
      data: { title, body, url: APP_URL },
      webpush: { fcmOptions: { link: APP_URL } },
      tokens,
    };

    // Enviar y limpiar tokens inválidos
    const response = await getMessaging().sendEachForMulticast(message);
    console.log(`[FCM] ${response.successCount}/${tokens.length} ok — reserva ${snap.id}`);

    const invalidTokens = new Set();
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code || "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token") ||
          code.includes("invalid-argument")
        ) {
          invalidTokens.add(tokens[idx]);
        }
      }
    });

    if (invalidTokens.size > 0) {
      const batch = db.batch();
      tokenDocs.forEach(({ ref, token }) => {
        if (invalidTokens.has(token)) batch.delete(ref);
      });
      await batch.commit();
      console.log(`[FCM] Eliminados ${invalidTokens.size} token(s) inválidos`);
    }

    return null;
  },
);
