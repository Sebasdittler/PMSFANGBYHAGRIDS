// firebase-messaging-sw.js — Service Worker para FCM background messages
//
// ⚠️  ANTES DE HACER DEPLOY: reemplazá los valores de firebaseConfig
// con los de tu proyecto. Son los mismos que tus VITE_FIREBASE_* env vars
// (no son secretos — ya están en el bundle del cliente).
// Los encontrás en: Firebase Console → Project Settings → General → Your apps.

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "REEMPLAZAR_CON_VITE_FIREBASE_API_KEY",
  authDomain:        "REEMPLAZAR_CON_VITE_FIREBASE_AUTH_DOMAIN",
  projectId:         "fangpmshagrids",
  storageBucket:     "REEMPLAZAR_CON_VITE_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REEMPLAZAR_CON_VITE_FIREBASE_MESSAGING_SENDER_ID",
  appId:             "REEMPLAZAR_CON_VITE_FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

// Se dispara cuando llega una notificación y la app está cerrada o en background
messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || "FANG";
  const body  = notification.body  || "";
  const icon  = notification.icon  || "/favicon-192.png";

  self.registration.showNotification(title, {
    body,
    icon,
    badge:              "/favicon-32.png",
    requireInteraction: true,
    vibrate:            [200, 100, 200],
    tag:                "fang-fcm",
    data:               payload.data || {},
  });
});

// Al hacer click en la notificación → abrir/enfocar la app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
