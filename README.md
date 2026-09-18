# GPS Monitor — Frontend de rastreo en tiempo real

Centro de monitoreo GPS (React + Vite + TypeScript) que consume la API real del backend
**`servidor-trackar`** — Vercel Functions + Supabase PostgreSQL, compatible con
**Traccar Client** (protocolo OsmAnd).

> El backend **no se ha modificado**. Todo lo que consume este frontend existe hoy en la
> API; lo que no existe está documentado en [`API_INTEGRATION.md`](./API_INTEGRATION.md)
> con la interfaz ya preparada y **sin datos simulados**.

---

## Características

| Módulo | Ruta | Estado |
|---|---|---|
| Login (API Key) | `/login` | ✅ funcional |
| Dashboard | `/` | ✅ contadores reales + métricas calculadas del historial |
| Rastreo en tiempo real | `/rastreo` | ✅ mapa + polling + clustering |
| Dispositivos | `/dispositivos` | ✅ búsqueda, filtro, orden, paginación |
| Detalle de dispositivo | `/dispositivos/:deviceId` | ✅ posición y telemetría reales |
| Historial y reproducción | `/historial` | ✅ polilínea + reproductor x1–x8 |
| Estadísticas | `/estadisticas` | ✅ calculadas desde el historial |
| Eventos | `/eventos` | ⏳ interfaz lista (falta `GET /api/events`) |
| Geocercas | `/geocercas` | ⏳ capa lista (falta `GET /api/geofences`) |
| Configuración | `/configuracion` | ✅ preferencias + diagnóstico |

Otros elementos: búsqueda global, campana de alertas, modo oscuro/claro, skeletons de
carga, mensajes de error legibles, diseño responsive (escritorio / tablet / móvil) y
manifest PWA.

---

## 1. Instalación

Requisitos: **Node.js ≥ 20** y **npm ≥ 9**.

```bash
npm install
```

Stack: React 18 · Vite 5 · TypeScript 5 · React Router 6 · Tailwind CSS 3 · Zustand ·
Axios · Leaflet + React-Leaflet · Recharts · Lucide React.

---

## 2. Variables de entorno

```bash
cp .env.example .env
```

| Variable | Por defecto | Descripción |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000/api` | URL base de la API del backend |
| `VITE_API_PROXY_TARGET` | — | Si se define, Vite reenvía `/api` a ese host (evita CORS en local) |
| `VITE_API_KEY` | *(vacío)* | API Key. Si se deja vacía, se solicita en `/login` |
| `VITE_POSITION_REFRESH` | `5000` | Intervalo de polling en ms (no hay WebSocket/SSE) |
| `VITE_MAP_PROVIDER` | `openstreetmap` | `openstreetmap` \| `opentopomap` \| `carto-dark` |
| `VITE_OFFLINE_THRESHOLD_SECONDS` | `300` | Segundos sin reportar para marcar *sin conexión* |
| `VITE_MOVING_SPEED_KMH` | `3` | km/h a partir de los cuales se considera *en movimiento* |
| `VITE_DASHBOARD_MAX_DEVICES` | `25` | Máx. dispositivos con historial agregado en el Dashboard |
| `VITE_API_CONCURRENCY` | `4` | Peticiones concurrentes contra el backend |
| `VITE_HTTP_TIMEOUT` | `20000` | Timeout HTTP en ms |
| `VITE_DEFAULT_THEME` | `dark` | Tema inicial |

`.env` está en `.gitignore`. **Nunca** subas credenciales al repositorio.

> ⚠ En una SPA la API Key termina en el navegador. El backend no ofrece hoy
> autenticación por usuario; ver §6 de `API_INTEGRATION.md`.

---

## 3. Configuración del backend

El backend se analizó antes de escribir código (`api/**`, `src/services/**`,
`src/middleware/auth.js`, `sql/schema.sql`). Resumen:

- **Autenticación:** API Key global (`GPS_API_KEY`) vía `Authorization: Bearer`,
  `X-API-Key` o `?api_key=`. Si está vacía, el servidor queda en **modo abierto**.
- **Endpoints disponibles:** `GET /api/health`, `GET /api/devices`,
  `GET /api/positions/:deviceId`, `GET /api/positions/:deviceId/latest`,
  `POST|GET /api/gps` (ingesta, no usada por el frontend).
- **No existen:** eventos, estadísticas, geocercas, gestión de dispositivos,
  notificaciones, login de usuarios ni WebSocket/SSE/MQTT.

Pasos para apuntar el frontend al backend:

```bash
# 1) Backend en local (Vercel CLI, desde ../servidor-trackar)
vercel dev        # queda en http://localhost:3000

# 2) Frontend: .env
VITE_API_URL=http://localhost:3000/api
```

Si prefieres usar el proxy de Vite (sin tocar CORS):

```env
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://localhost:3000
```

Diagnóstico: en `/configuracion` hay un botón **Probar conexión** que llama a
`/api/health` y a `/api/devices` e informa del resultado.

---

## 4. Ejecución en desarrollo

```bash
npm run dev
```

Disponible en <http://localhost:5173>.

- Si el backend exige clave, entra en `/login` y pega el valor de `GPS_API_KEY`.
- Si el backend está en **modo abierto** (`GPS_API_KEY` vacía), pulsa *Entrar* sin clave.
- Comprobación de tipos: `npm run lint`.

---

## 5. Build de producción

```bash
npm run build      # tsc --noEmit && vite build
npm run preview    # sirve dist/ para validación local
```

El resultado queda en `dist/`. El bundle se divide en `react`, `maps` y `charts` para
mejorar la carga. Para desplegar en un hosting estático (Vercel, Netlify, Nginx), añade
una regla de *fallback* a `index.html` porque el enrutado es del lado del cliente.

Ejemplo Nginx:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

---

## 6. Estructura del proyecto

```
src/
├── api/                     # Una capa por recurso del backend
│   ├── client.ts            # Axios: baseURL, API Key, timeout, interceptor de errores
│   ├── auth.ts              # Validación del acceso (API Key / modo abierto)
│   ├── health.ts            # GET /api/health
│   ├── devices.ts           # GET /api/devices
│   ├── positions.ts         # Historial y última posición
│   ├── statistics.ts        # Agregados calculados (no hay endpoint en el backend)
│   └── events.ts            # Contrato documentado (endpoint inexistente)
│
├── components/
│   ├── layout/              # AppLayout, Header, Sidebar, GlobalSearch, ConnectionStatus
│   ├── maps/                # MapView, ClusterLayer, TrailPolyline, GeofenceLayer, tiles, icons
│   ├── devices/             # DeviceListPanel, DeviceTable, DeviceStatusBadge
│   ├── alerts/              # AlertsBell (alertas derivadas)
│   ├── charts/              # Recharts: distancia, velocidad, estados, categorías
│   ├── tables/              # Table y Pagination
│   └── ui/                  # Button, Card, Badge, Field, Skeleton, Feedback, Modal
│
├── pages/                   # Login, Dashboard, LiveTracking, Devices, DeviceDetails,
│                            # History, Statistics, Events, Geofences, Settings, NotFound
├── hooks/                   # useDevicesPolling, useDeviceHistory, useTheme,
│                            # useGeolocation, useUtils (debounce, intervalos, media query)
├── stores/                  # Zustand: authStore, devicesStore, settingsStore, alertsStore
├── routes/                  # AppRoutes + ProtectedRoute
├── types/                   # Interfaces ajustadas a las respuestas reales del backend
├── utils/                   # constants, format, geo, device, statistics, errors,
│                            # storage, async, geocode, cn
├── App.tsx
└── main.tsx
```

Separación estricta: **componentes visuales** (`components/`), **lógica de dominio**
(`utils/device.ts`, `utils/statistics.ts`), **llamadas API** (`api/`), **estado global**
(`stores/`) y **tipos** (`types/`).

---

## 7. Integración con mapas

**Leaflet + React-Leaflet** con mosaicos **OpenStreetMap** (sin API Key).

- **Proveedores:** OpenStreetMap, OpenTopoMap y Carto Dark (selector en el mapa y en
  `/configuracion`).
- **Controles:** zoom, encuadre de todos los dispositivos, mi ubicación, capas y pantalla
  completa.
- **Marcadores SVG rotables:** el icono respeta el `bearing` real del backend
  (`src/components/maps/icons.ts`); si `bearing` es `null` se dibuja un círculo. El color
  indica el estado derivado (🟢 movimiento · 🟡 detenido · 🔴 sin conexión · ⚪ sin datos)
  y los dispositivos en movimiento llevan un halo animado.
- **Clustering:** a partir de 25 marcadores se agrupan con `leaflet.markercluster` para
  mantener el rendimiento con cientos de dispositivos.
- **Recorridos:** `TrailPolyline` dibuja el histórico por tramos, coloreados por velocidad
  (azul normal, ámbar > 60 km/h, rojo > 100 km/h) con marcadores de inicio y fin.
- **Geocercas:** `GeofenceLayer` soporta círculos y polígonos (a la espera del endpoint).
- **Geocodificación:** desactivada por defecto (se muestran coordenadas). Opcional vía
  Nominatim con caché (`src/utils/geocode.ts`).

---

## 8. Actualización en tiempo real

El backend **no ofrece** WebSocket, SSE ni MQTT: la única vía es **polling**.

`src/hooks/useDevicesPolling.ts` consulta `GET /api/devices` cada
`VITE_POSITION_REFRESH` ms. Ese endpoint ya devuelve la última posición de cada
dispositivo (`lastPosition` + `lastSeenAt`), así que **un solo request** actualiza el
parque completo: posición, velocidad, rumbo, batería y último contacto.

Optimizaciones aplicadas:

- pausa automática cuando la pestaña está oculta (`visibilitychange`) y refresco inmediato
  al volver;
- no se recargan los componentes completos: solo se actualizan los datos;
- los marcadores se sincronizan sin recrear el grupo de Leaflet;
- el dashboard y las estadísticas **no** recalculan en cada refresco: dependen de la firma
  de dispositivos (y de un botón *Recalcular*), evitando ráfagas de peticiones de historial;
- memoización con `useMemo`/`useCallback`, `debounce` en búsquedas y paginación en tablas.

El header muestra el estado del canal: **● CONECTADO**, **SIN CONEXIÓN** o
**SIN AUTORIZACIÓN**.

---

## 9. Otras consideraciones

**Errores.** Nunca se muestra un mensaje crudo de Axios. `src/utils/errors.ts` traduce
`401/403/404/500`, timeouts y fallos de red a mensajes en español, conservando el detalle
técnico solo en consola durante el desarrollo.

**Accesibilidad.** Navegación por teclado (lista y tabla), `role="switch"` / `aria-pressed`
/ `aria-expanded`, `aria-live` en contadores, foco visible, estados con color **y** texto,
y `title`/`aria-label` en controles con icono.

**PWA.** Incluye `manifest.webmanifest`, iconos y `viewport`. No hay service worker ni
soporte offline.

**Rendimiento.** Preparado para 10, 100 y 500+ dispositivos mediante clustering,
concurrencia limitada (`VITE_API_CONCURRENCY`), paginación en tablas y acotación de
agregados (`VITE_DASHBOARD_MAX_DEVICES`).

---

## 10. Documentación relacionada

- [`API_INTEGRATION.md`](./API_INTEGRATION.md) — endpoints, autenticación, formatos,
  restricciones del contrato, funcionalidades ausentes con su contrato propuesto y la
  verificación realizada contra el backend desplegado.