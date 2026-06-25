// firebase-messaging-sw.js — Service Worker para FCM background messages

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyCl0sGzLlRFB__vU5HUdy4trsRBoHWFJwU",
  authDomain:        "fangpmshagrids.firebaseapp.com",
  projectId:         "fangpmshagrids",
  storageBucket:     "fangpmshagrids.firebasestorage.app",
  messagingSenderId: "244923261273",
  appId:             "1:244923261273:web:8febd821a565ca42daac48",
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
