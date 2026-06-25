// src/fcm.js — FCM Web Push client
// Llamar initFCM(userId, email) una sola vez después del login exitoso.

import firebase from "firebase/compat/app";
import "firebase/compat/messaging";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

let _messaging = null;
const getMsg = () => {
  if (!_messaging) _messaging = firebase.messaging();
  return _messaging;
};

async function persistToken(token, userId, userEmail) {
  if (!window._db || !token) return;
  // El token FCM se usa como ID de documento para deduplicar por dispositivo.
  // FCM tokens solo usan [A-Za-z0-9_\-:] — sin barras, safe como doc ID.
  try {
    await window._db.collection("fcm_tokens").doc(token).set({
      token,
      userId,
      email:     userEmail || "",
      updatedAt: new Date().toISOString(),
      device:    navigator.userAgent.slice(0, 120),
    }, { merge: true });
  } catch (e) {
    console.warn("[FCM] persistToken error:", e.message);
  }
}

/**
 * Registra el SW de FCM, pide permiso de notificaciones, obtiene el token
 * y configura el handler de mensajes en foreground.
 * Es idempotente: se puede llamar en cada login sin duplicar tokens.
 */
export async function initFCM(userId, userEmail) {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

  if (!VAPID_KEY) {
    console.warn("[FCM] VITE_FIREBASE_VAPID_KEY no definido — push desactivado");
    return;
  }

  try {
    // 1. Registrar el service worker
    const swReg = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" },
    );

    // 2. Pedir permiso (no hace nada si ya fue concedido o denegado)
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[FCM] Permiso denegado — push desactivado para este dispositivo");
      return;
    }

    // 3. Obtener token FCM del dispositivo
    const token = await getMsg().getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (token) {
      await persistToken(token, userId, userEmail);
      console.log("[FCM] Token registrado OK");
    }

    // 4. Manejar mensajes cuando la app está en primer plano
    getMsg().onMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (!title || Notification.permission !== "granted") return;
      try {
        new Notification(title, {
          body:   body || "",
          icon:   "/favicon-192.png",
          badge:  "/favicon-32.png",
          tag:    "fang-fcm",
        });
      } catch (e) {
        console.warn("[FCM] foreground notification error:", e.message);
      }
    });
  } catch (e) {
    // FCM falla silenciosamente en localhost sin HTTPS o en browsers sin soporte.
    console.warn("[FCM] initFCM error:", e.message || e);
  }
}
