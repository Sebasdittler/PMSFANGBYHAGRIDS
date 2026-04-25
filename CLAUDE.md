# FANG by Hagrids — Sistema de Gestión de Alquileres Temporarios

Aplicación web para gestión de propiedades de alquiler temporario, ubicada en Villa La Angostura, Patagonia. Gestiona reservas de Airbnb, Booking y alquileres directos, con control por roles (admin / propietario).

## Archivo principal

Toda la lógica y vistas de la app viven en **`src/App.jsx`** (~7400 líneas). Es un componente monolítico intencional: no hay React Router ni librería de componentes externa. Las modificaciones siempre se hacen en este repositorio.

## Stack

- **React 18** + **Vite 5** (sin Tailwind, sin librería de UI — estilos inline + CSS variables)
- **Firebase 10** (compat mode): Firestore, Auth, Storage
- **html2canvas + jsPDF** para generación de PDFs (vouchers, liquidaciones)
- Instancias Firebase expuestas en `window._db`, `window._auth`

## Estructura de archivos

```
src/
├── App.jsx          # App completa: estado, vistas, lógica, navegación
├── SitioWeb.jsx     # Vista pública del sitio web de las propiedades
├── firebase.js      # Inicialización de Firebase (usa VITE_FIREBASE_* env vars)
├── notificaciones.js
├── main.jsx
└── index.css        # Sistema de temas (7 paletas pastel) con CSS custom properties
```

## Navegación y vistas

El routing es por estado (`view`), sin React Router. Las vistas disponibles son:

| Vista | Descripción | Acceso |
|---|---|---|
| Dashboard | Métricas generales | Admin |
| Calendario | Reservas en vista mes/semana | Todos |
| Historial | Búsqueda y filtro de reservas | Admin |
| Tareas | Limpieza y mantenimiento por propiedad | Todos |
| Lavadero | Seguimiento de ropa de cama | Todos |
| Cotizador | Cálculo de tarifas por noche | Admin |
| Reportes | Liquidaciones mensuales por propietario | Admin |
| Cobros | Montos adeudados a propietarios | Admin |
| Pagos | Pagos de limpieza/mantenimiento | Admin |
| Gastos | Gastos por propiedad | Admin |
| Propiedades | ABM de propiedades, ambientes, dueños | Admin |
| Usuarios | Gestión de usuarios y roles | Admin |
| Sitio Web | Vista pública de las propiedades | Todos |

## Roles

- **Admin**: acceso completo a todas las vistas y propiedades
- **Propietario**: acceso restringido a sus propiedades únicamente

## Temas

7 paletas de color definidas en `index.css` mediante CSS custom properties (`--bg-main`, `--primary`, `--text-main`, etc.): soft-olive, pastel-purple, warm-sand, dark-soft, pastel-gray, pastel-blue, pastel-rose.

## Variables de entorno requeridas

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

## Convenciones

- Estilos siempre como objetos inline o CSS variables; no agregar Tailwind ni clases externas
- No agregar React Router; la navegación es por estado `view`
- No separar App.jsx en múltiples archivos salvo indicación explícita
- Texto de la UI en español
- Sincronización en tiempo real vía `onSnapshot` de Firestore
