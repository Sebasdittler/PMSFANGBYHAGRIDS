/* eslint-disable max-len */
"use strict";

const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onSchedule }      = require("firebase-functions/v2/scheduler");
const { initializeApp }   = require("firebase-admin/app");
const { getFirestore }    = require("firebase-admin/firestore");
const { getMessaging }    = require("firebase-admin/messaging");

initializeApp();

const APP_URL = "https://fangfinal.vercel.app";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtFecha(str) {
  if (!str) return "—";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
}

function icsDateToISO(str) {
  if (!str) return "";
  const s = str.replace(/[^0-9]/g, "").slice(0, 8);
  if (s.length < 8) return "";
  return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
}

function parseICS(text, pid, urlIdx = 0) {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const events   = [];
  const blocks   = unfolded.split("BEGIN:VEVENT");
  blocks.slice(1).forEach((block, idx) => {
    const get = (key) => {
      const m = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`, "i"));
      return m ? m[1].trim() : "";
    };
    const uid     = get("UID");
    const dtstart = icsDateToISO(get("DTSTART"));
    const dtend   = icsDateToISO(get("DTEND"));
    const summary = get("SUMMARY") || "Bloqueado";
    if (!dtstart || !dtend || dtend <= dtstart) return;
    const isBlock   = /not available|bloqueado|blocked|airbnb \(not/i.test(summary);
    const stableKey = uid || `${dtstart}-${idx}`;
    events.push({
      id:       `ext-${pid}-${urlIdx}-${stableKey}`,
      pid,
      guest:    isBlock ? "🔒 Bloqueado" : summary,
      ci:       dtstart,
      co:       dtend,
      external: true,
    });
  });
  return events;
}

function getIcalUrls(prop) {
  if (Array.isArray(prop.icalUrls) && prop.icalUrls.length > 0)
    return prop.icalUrls.filter((u) => u && u.trim());
  if (prop.icalUrl) return [prop.icalUrl];
  return [];
}

async function sendPush(tokens, title, body) {
  if (!tokens.length) return;
  const db = getFirestore();
  const resp = await getMessaging().sendEachForMulticast({
    data:    { title, body, url: APP_URL },
    webpush: {
      notification: {
        title,
        body,
        icon:  APP_URL + "/favicon-192.png",
        badge: APP_URL + "/favicon-32.png",
      },
      fcmOptions: { link: APP_URL },
    },
    tokens,
  });
  // Limpiar tokens inválidos
  const invalid = new Set();
  resp.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || "";
      if (code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token") ||
          code.includes("invalid-argument")) invalid.add(tokens[i]);
    }
  });
  if (invalid.size > 0) {
    const tokSnap = await db.collection("fcm_tokens").get();
    const batch   = db.batch();
    tokSnap.docs.forEach((d) => { if (invalid.has(d.data().token)) batch.delete(d.ref); });
    await batch.commit();
  }
}

async function getTokens() {
  const snap = await getFirestore().collection("fcm_tokens").get();
  return snap.docs.map((d) => d.data().token).filter(Boolean);
}

async function getPropName(db, pid) {
  try {
    const s = await db.collection("props").doc(String(pid)).get();
    return s.exists ? (s.data().name || "") : "";
  } catch (_) { return ""; }
}

// ── 1. Nueva reserva manual ────────────────────────────────────────────────
exports.notificarNuevaReserva = onDocumentCreated(
  { document: "reservas/{reservaId}", region: "us-central1" },
  async (event) => {
    const snap    = event.data;
    if (!snap) return null;
    const reserva = snap.data();
    // Las reservas iCal las maneja el cron; los marcadores importedAs no notifican.
    if (reserva.external || reserva.importedAs) return null;

    const db       = getFirestore();
    const tokens   = await getTokens();
    if (!tokens.length) return null;

    const propNombre = await getPropName(db, reserva.pid);
    const guest      = reserva.guest  || "Huésped";
    const plat       = reserva.plat   || "";
    const title      = `🏠 Nueva reserva${plat ? " · " + plat : ""}`;
    const body       = `${guest}${propNombre ? " · " + propNombre : ""} · ${fmtFecha(reserva.ci)} → ${fmtFecha(reserva.co)}`;
    await sendPush(tokens, title, body);
    return null;
  },
);

// ── 2. Reserva manual editada ──────────────────────────────────────────────
exports.notificarReservaModificada = onDocumentUpdated(
  { document: "reservas/{reservaId}", region: "us-central1" },
  async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    if (!newData || newData.external || newData.importedAs) return null;
    // Ignorar si no cambió nada relevante (ej: solo actualizó pagos)
    if (newData.guest === oldData.guest &&
        newData.ci    === oldData.ci    &&
        newData.co    === oldData.co    &&
        newData.amt   === oldData.amt   &&
        newData.plat  === oldData.plat) return null;

    const db         = getFirestore();
    const tokens     = await getTokens();
    if (!tokens.length) return null;

    const propNombre = await getPropName(db, newData.pid);
    const guest      = newData.guest || "Huésped";
    const title      = `✏️ Reserva editada${propNombre ? " · " + propNombre : ""}`;
    const body       = `${guest} · ${fmtFecha(newData.ci)} → ${fmtFecha(newData.co)}`;
    await sendPush(tokens, title, body);
    return null;
  },
);

// ── 3. Reserva manual eliminada ────────────────────────────────────────────
exports.notificarReservaEliminada = onDocumentDeleted(
  { document: "reservas/{reservaId}", region: "us-central1" },
  async (event) => {
    const data = event.data.data();
    if (!data || data.external || data.importedAs) return null;

    const db         = getFirestore();
    const tokens     = await getTokens();
    if (!tokens.length) return null;

    const propNombre = await getPropName(db, data.pid);
    const guest      = data.guest || "Huésped";
    const title      = `🗑️ Reserva eliminada${propNombre ? " · " + propNombre : ""}`;
    const body       = `${guest} · ${fmtFecha(data.ci)} → ${fmtFecha(data.co)}`;
    await sendPush(tokens, title, body);
    return null;
  },
);

// ── 4. Cron iCal — cada 30 minutos ────────────────────────────────────────
exports.syncIcalCron = onSchedule(
  { schedule: "every 30 minutes", region: "us-central1", timeZone: "America/Argentina/Buenos_Aires" },
  async () => {
    const db = getFirestore();

    const propsSnap = await db.collection("props").get();
    const props     = propsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => getIcalUrls(p).length > 0);

    if (!props.length) return null;

    const tokens = await getTokens();

    for (const prop of props) {
      const urls = getIcalUrls(prop);

      // Fetch y parseo de todos los feeds
      let rawParsed = [];
      for (let urlIdx = 0; urlIdx < urls.length; urlIdx++) {
        try {
          const resp = await fetch(urls[urlIdx], {
            headers: { "User-Agent": "Fang-PMS/1.0 (calendar sync)" },
            signal:  AbortSignal.timeout(15000),
          });
          if (!resp.ok) { console.warn(`[iCal cron] HTTP ${resp.status} — ${urls[urlIdx]}`); continue; }
          const text = await resp.text();
          rawParsed  = rawParsed.concat(parseICS(text, prop.id, urlIdx));
        } catch (e) {
          console.warn(`[iCal cron] Error ${prop.id} url[${urlIdx}]: ${e.message}`);
        }
      }

      // Dedup: misma propiedad + mismas fechas → preferir evento con nombre real
      const seen = new Map();
      rawParsed.forEach((r) => {
        const key = `${r.pid}|${r.ci}|${r.co}`;
        if (!seen.has(key)) {
          seen.set(key, r);
        } else {
          const ex = seen.get(key);
          if (ex.guest.includes("🔒") && !r.guest.includes("🔒")) seen.set(key, r);
        }
      });
      const parsed    = Array.from(seen.values());
      const parsedIds = new Set(parsed.map((r) => r.id));

      // Docs externos actuales en Firestore para esta propiedad
      const existingSnap = await db.collection("reservas")
        .where("pid",      "==", prop.id)
        .where("external", "==", true)
        .get();
      const existingDocs = existingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const existingMap  = new Map(existingDocs.map((d) => [d.id, d]));

      const notifications = [];
      const batch         = db.batch();

      // Nuevos y modificados
      for (const r of parsed) {
        const existing = existingMap.get(r.id);
        if (!existing) {
          // Nuevo
          batch.set(db.collection("reservas").doc(r.id), { ...r, ownerId: "system", paidAmount: 0, payments: [] });
          batch.set(db.collection("sitioWeb_ocupados").doc(r.id), { pid: r.pid, ci: r.ci, co: r.co });
          if (!/bloqueado|blocked/i.test(r.guest || "")) {
            notifications.push({
              title: `📅 Nueva reserva · ${prop.name}`,
              body:  `${r.guest} · ${fmtFecha(r.ci)} → ${fmtFecha(r.co)}`,
            });
          }
        } else if (existing.ci !== r.ci || existing.co !== r.co) {
          // Modificado (mismo UID, distintas fechas)
          batch.set(db.collection("reservas").doc(r.id), { ...r, ownerId: "system", paidAmount: 0, payments: [] });
          batch.set(db.collection("sitioWeb_ocupados").doc(r.id), { pid: r.pid, ci: r.ci, co: r.co });
          notifications.push({
            title: `✏️ Reserva modificada · ${prop.name}`,
            body:  `${r.guest} · ${fmtFecha(r.ci)} → ${fmtFecha(r.co)} (antes ${fmtFecha(existing.ci)} → ${fmtFecha(existing.co)})`,
          });
        } else {
          // Sin cambios — asegurar que sitioWeb_ocupados esté sincronizado
          batch.set(db.collection("sitioWeb_ocupados").doc(r.id), { pid: r.pid, ci: r.ci, co: r.co }, { merge: true });
        }
      }

      // Cancelados (estaban en Firestore pero ya no están en el feed)
      for (const existing of existingDocs) {
        if (!parsedIds.has(existing.id) && !existing.importedAs) {
          batch.delete(db.collection("reservas").doc(existing.id));
          batch.delete(db.collection("sitioWeb_ocupados").doc(existing.id));
          if (!/bloqueado|blocked/i.test(existing.guest || "")) {
            notifications.push({
              title: `❌ Reserva cancelada · ${prop.name}`,
              body:  `${existing.guest} · ${fmtFecha(existing.ci)} → ${fmtFecha(existing.co)}`,
            });
          }
        }
      }

      await batch.commit();
      console.log(`[iCal cron] ${prop.name}: ${parsed.length} eventos, ${notifications.length} cambios`);

      // Enviar notificaciones
      for (const n of notifications) {
        await sendPush(tokens, n.title, n.body);
      }
    }

    return null;
  },
);
