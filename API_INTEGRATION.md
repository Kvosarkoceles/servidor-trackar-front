# API_INTEGRATION.md

Documento de integración entre este frontend y el backend **`servidor-trackar`**
(Vercel Functions + Supabase PostgreSQL, Node.js ≥ 20).

> **Regla aplicada:** este documento se generó inspeccionando el código real del backend
> (`api/**`, `src/services/**`, `src/middleware/**`, `src/utils/**`, `sql/schema.sql`).
> No se ha modificado el backend ni se han inventado endpoints.

---

## 1. Mapa de integración

```
Backend: servidor-trackar (Vercel Functions + Supabase)
   │
   ├── Auth ................ API Key global (GPS_API_KEY) · Bearer / X-API-Key / ?api_key=
   │                         · modo abierto si GPS_API_KEY está vacía
   ├── Health .............. GET /api/health                 (público)
   ├── Devices ............. GET /api/devices                (API Key)
   ├── Positions ........... GET /api/positions/:deviceId    (API Key)
   │                         GET /api/positions/:deviceId/latest (API Key)
   ├── Ingesta ............. POST/GET /api/gps               (API Key)  ← solo Traccar Client
   ├── Events .............. ❌ NO EXISTE
   ├── Statistics .......... ❌ NO EXISTE
   ├── Geofences ........... ❌ NO EXISTE
   └── Realtime ............ ❌ NO EXISTE (ni WebSocket, ni SSE, ni MQTT)
                                     │
                                     ▼
Frontend: servidor-trackar-front (React + Vite + TS)
   │
   ├── /login ............ valida el acceso con GET /api/devices
   ├── / ................. Dashboard  ← GET /api/devices + historial del día
   ├── /rastreo .......... Live Map   ← polling GET /api/devices (incluye lastPosition)
   ├── /dispositivos ..... Devices    ← GET /api/devices
   ├── /dispositivos/:id . Detalle    ← GET /api/devices + /api/positions/:id/latest
   ├── /historial ........ History    ← GET /api/positions/:deviceId?from&to&limit
   ├── /estadisticas ..... Statistics ← historial (cálculo en cliente)
   ├── /eventos .......... preparado  ← requiere GET /api/events   (documentado abajo)
   ├── /geocercas ........ preparado  ← requiere GET /api/geofences (documentado abajo)
   └── /configuracion .... preferencias locales + diagnóstico
```

---

## 2. Autenticación

| Aspecto | Valor real del backend |
|---|---|
| Mecanismo | **API Key global** (variable `GPS_API_KEY`) |
| Cabeceras aceptadas | `Authorization: Bearer <KEY>` · `X-API-Key: <KEY>` |
| Parámetros aceptados | `api_key`, `apikey`, `apiKey`, `key`, `token` (query o cuerpo) |
| Comparación | `timingSafeEqual` (tiempo constante) |
| Modo abierto | Si `GPS_API_KEY` está **vacía/no definida**, la API **no exige clave** y registra `auth_disabled` |
| Códigos | `401 Missing API key` · `403 Invalid API key` (solo si la clave está configurada) |
| CORS | `CORS_ORIGIN` (por defecto `*`). Métodos: `GET`, `POST`, `OPTIONS`. Cabeceras: `Content-Type`, `Authorization`, `X-API-Key` |

**No existe** login de usuarios, JWT, sesiones, cookies, OAuth ni roles. La autorización
es todo-o-nada a nivel de servicio.

### Cómo lo integra el frontend

- `src/api/client.ts` inyecta `Authorization: Bearer <API Key>` en cada petición.
- `src/stores/authStore.ts` guarda la credencial (localStorage si "recordar sesión",
  sessionStorage en caso contrario) y **valida el acceso** llamando a `GET /api/devices`.
- Si la clave se rechaza (`401`/`403`), el interceptor limpia la sesión y redirige a `/login`.
- Si `GPS_API_KEY` no está configurada en el servidor, el login funciona **sin clave**
  (modo abierto) y la interfaz lo refleja.

> ⚠ **Limitación de seguridad conocida:** en una SPA la API Key viaja al navegador.
> Cualquiera con acceso al bundle puede extraerla. El backend debería exponer
> autenticación por usuario (ver §6) antes de un uso multiusuario real.

---

## 3. Endpoints existentes y utilizados

### 3.1 `GET /api/health` — público

| | |
|---|---|
| **Método** | `GET` |
| **Autenticación** | No |
| **Request** | — |
| **Response 200** | `{ "success": true, "service": "traccar-gps-server", "status": "ok" }` |
| **Descripción** | Comprobación de vida del servicio. Usado en `/login` y en el diagnóstico de `/configuracion` para distinguir *servidor caído* de *clave inválida*. |

### 3.2 `GET /api/devices` — API Key

| | |
|---|---|
| **Método** | `GET` |
| **Autenticación** | API Key |
| **Request** | Sin parámetros |
| **Límite** | Máximo **1000** dispositivos (constante `MAX_DEVICES`) |
| **Orden** | `last_seen_at DESC NULLS LAST` |

**Response 200**

```json
{
  "success": true,
  "devices": [
    {
      "deviceId": "59275505",
      "name": null,
      "uniqueId": null,
      "active": true,
      "createdAt": "2026-09-18T06:26:34.891649+00:00",
      "updatedAt": "2026-09-18T16:42:23.822441+00:00",
      "lastSeenAt": "2026-09-18T16:42:23.102+00:00",
      "lastPosition": {
        "latitude": 19.3093153,
        "longitude": -99.2602446,
        "speed": null,
        "bearing": null,
        "battery": 38
      }
    }
  ]
}
```

- `lastPosition` es `null` si el dispositivo nunca ha enviado posición.
- `name` / `uniqueId` son `null` salvo que se inserten manualmente en la base de datos
  (no existe endpoint para editarlos).

**Uso en el frontend:** Dashboard, Rastreo en tiempo real, listado y detalle de
dispositivos. Es la **fuente única del polling**: un solo request actualiza posición,
velocidad, rumbo, batería y último contacto de todo el parque.

### 3.3 `GET /api/positions/:deviceId/latest` — API Key

| | |
|---|---|
| **Método** | `GET` |
| **Autenticación** | API Key |
| **Request** | `deviceId` en la ruta |
| **Response 200** | `{ "success": true, "position": { … } }` |
| **Response 404** | `{ "success": false, "error": "No positions found for device", "deviceId": "…" }` |
| **Descripción** | Última posición conocida. Se usa en el detalle del dispositivo, donde aporta campos que `devices.lastPosition` no incluye (altitud, precisión, timestamps). |

```json
{
  "success": true,
  "position": {
    "deviceId": "59275505",
    "latitude": 19.3093153,
    "longitude": -99.2602446,
    "speed": null,
    "bearing": null,
    "altitude": 2679.90014648438,
    "accuracy": 15.1339998245239,
    "battery": 38,
    "timestamp": "2026-09-18T16:42:19+00:00",
    "receivedAt": "2026-09-18T16:42:24.304042+00:00"
  }
}
```

### 3.4 `GET /api/positions/:deviceId` — API Key

| | |
|---|---|
| **Método** | `GET` |
| **Autenticación** | API Key |
| **Query** | `from` (ISO 8601), `to` (ISO 8601), `limit` (1–5000, por defecto 100) |
| **Orden** | `gps_timestamp DESC` (más reciente primero) |
| **Response** | `{ "success": true, "deviceId": "…", "count": 3, "limit": 3, "positions": [ … ] }` |

```json
{
  "success": true,
  "deviceId": "59275505",
  "count": 3,
  "limit": 3,
  "positions": [
    {
      "deviceId": "59275505",
      "latitude": 19.3093153,
      "longitude": -99.2602446,
      "speed": null,
      "bearing": null,
      "altitude": 2679.90014648438,
      "accuracy": 15.1339998245239,
      "battery": 38,
      "timestamp": "2026-09-18T16:42:19+00:00",
      "receivedAt": "2026-09-18T16:42:24.304042+00:00"
    }
  ]
}
```

**Uso en el frontend:** `/historial` (recorrido + reproductor) y `/estadisticas`.
El frontend reordena a ascendente para trazar la polilínea y calcular distancias.

### 3.5 `POST|GET /api/gps` — API Key (ingesta)

| | |
|---|---|
| **Método** | `POST` (`application/x-www-form-urlencoded` o JSON) y `GET` (query string) |
| **Autenticación** | API Key (o **modo abierto** si `GPS_API_KEY` está vacía) |
| **Consumidor** | **Traccar Client** (protocolo OsmAnd) — *el frontend no lo invoca* |
| **Response 200** | `{ "success": true, "message": "Position received", "deviceId": "…" }` |

> ⚠ `GPS_API_KEY` **no autentica usuarios**, autoriza la **ingesta** de posiciones.
> Si se deja vacía, cualquiera que conozca la URL puede inyectar posiciones.
> Este endpoint **no se usa** desde el frontend (es solo de escritura).

### 3.6 Códigos de error comunes

| Código | Cuerpo | Cuándo |
|---|---|---|
| `400` | `{ "success": false, "error": "Missing deviceId" \| "Invalid latitude" \| "Invalid JSON body" … }` | Entrada inválida |
| `401` | `{ "success": false, "error": "Missing API key" }` | Falta la clave habiendo `GPS_API_KEY` |
| `403` | `{ "success": false, "error": "Invalid API key" }` | Clave incorrecta |
| `404` | `{ "success": false, "error": "No positions found for device" }` | Sin posiciones |
| `405` | `{ "success": false, "error": "Method not allowed" }` + `Allow` | Método incorrecto |
| `413` | `{ "success": false, "error": "Payload too large" }` | Cuerpo > 64 KiB |
| `500` | `{ "success": false, "error": "Internal server error" }` | Fallo interno (nunca expone detalles) |
| `500` | `{ "success": false, "error": "Server configuration error" }` | Faltan variables de entorno |

El mensaje público de `500` **nunca** incluye detalles de PostgreSQL: el frontend no debe
esperar información técnica (`src/utils/errors.js` del backend).

---

## 4. Restricciones del contrato que el frontend respeta

1. **No hay campo `status`.** El estado *en movimiento / detenido / sin conexión* se
   **deriva en el cliente** (`src/utils/device.ts`) combinando:
   - `lastSeenAt` → antigüedad (umbral `VITE_OFFLINE_THRESHOLD_SECONDS`, por defecto 300 s),
   - `lastPosition.speed` → movimiento (umbral `VITE_MOVING_SPEED_KMH`, por defecto 3 km/h).
2. **No hay normalización de unidades.** `speed` se guarda tal cual lo envía el dispositivo.
   El frontend ofrece el ajuste *Unidad de velocidad* (`km/h`, `nudos`, `mph`).
3. **No hay teléfono, modelo, odómetro, combustible, temperatura ni voltaje** en el esquema.
   El frontend no los muestra ni los inventa.
4. **El historial tiene tope de 5000 puntos** por consulta (`MAX_HISTORY_LIMIT`).
5. **No hay paginación por cursor**: solo `limit`. El frontend pagina en memoria.
6. **No hay `total`** en las respuestas; los agregados de flota se calculan en el cliente.
7. **`/api/devices` limita a 1000 dispositivos.** Con más dispositivos haría falta
   paginación en el backend.

---

## 5. Tiempo real

| Tecnología | Disponible en el backend |
|---|---|
| WebSocket | ❌ |
| Server-Sent Events (SSE) | ❌ |
| MQTT | ❌ |
| **Polling HTTP** | ✅ (única vía real) |

**Implementación elegida:** polling de `GET /api/devices` cada
`VITE_POSITION_REFRESH` ms (5 s por defecto), porque ese endpoint ya incluye la última
posición de cada dispositivo (1 request = parque completo).

Detalles en `src/hooks/useDevicesPolling.ts`:

- se **pausa** cuando la pestaña no está visible (`visibilitychange`);
- al volver a primer plano hace un refresco inmediato;
- cada ciclo actualiza mapa, marcadores, listas y alertas derivadas;
- el indicador del header muestra `CONECTADO` / `SIN CONEXIÓN` / `SIN AUTORIZACIÓN`.

---

## 6. Funcionalidades solicitadas que el backend NO ofrece

Todas ellas tienen la **interfaz ya creada** y quedan documentadas aquí, sin datos
simulados (requisitos 16, 35).

### 6.1 Eventos y alertas — `GET /api/events` ❌

No existe tabla ni endpoint. No hay detección de exceso de velocidad, geocercas,
movimiento/detención, pérdida de GPS ni desconexión.

**Página `/eventos`:** filtros y tabla listos; estado vacío explicativo.

**Contrato propuesto:**

```
GET /api/events?deviceId=<id>&type=<tipo>&from=<ISO>&to=<ISO>&limit=<n>
Authorization: Bearer <API_KEY>

200 {
  "success": true,
  "count": 12,
  "events": [
    {
      "id": "1",
      "deviceId": "123456",
      "type": "overspeed | movement | stop | gps_lost | low_battery | disconnected",
      "timestamp": "2026-09-18T10:23:00Z",
      "latitude": 19.4326,
      "longitude": -99.1332,
      "speed": 112.4,
      "message": "Exceso de velocidad"
    }
  ]
}
```

**Alternativa sin nueva tabla:** calcular los eventos al vuelo desde `gps_positions`
(velocidad > umbral, brecha > N minutos entre posiciones, `battery <= 20`…).

**Mientras no exista:** la campana del header muestra *alertas derivadas en el cliente*
(`source: 'derived'`) a partir de datos reales: dispositivo offline, `speed > 100` y
`battery <= 20`. Están etiquetadas como derivadas para no aparentar que vienen del servidor.

### 6.2 Estadísticas — `GET /api/statistics` ❌

No existe. Las métricas se calculan en el cliente
(`src/utils/statistics.ts`, `src/api/statistics.ts`) desde el historial real:

- distancia (Haversine entre puntos consecutivos, descartando saltos > 350 km/h),
- velocidad máxima / promedio (ponderada por tiempo),
- tiempo en movimiento / detenido (por intervalos, sin contar huecos > 15 min),
- agregación por hora (≤ 48 h) o por día (> 48 h).

**Coste:** 1 request por dispositivo y rango. Se acota con
`VITE_DASHBOARD_MAX_DEVICES` (25 por defecto) y concurrencia `VITE_API_CONCURRENCY` (4).
Con muchos dispositivos conviene un endpoint de agregados en el servidor:

```
GET /api/statistics?deviceId=<id>&from=<ISO>&to=<ISO>
200 { "success": true, "stats": { "distanceKm": 0, "maxSpeedKmh": 0, "avgSpeedKmh": 0,
      "movingSeconds": 0, "stoppedSeconds": 0 } }
```

### 6.3 Geocercas — `GET /api/geofences` ❌

Sin tabla ni endpoint. La capa `GeofenceLayer` ya soporta círculos y polígonos.

```
GET /api/geofences
200 {
  "success": true,
  "geofences": [
    { "id": "1", "name": "Bodega", "type": "circle",
      "center": { "lat": 19.43, "lng": -99.13 }, "radiusMeters": 300, "color": "#2f83f6" },
    { "id": "2", "name": "Ruta", "type": "polygon",
      "points": [{ "lat": 19.44, "lng": -99.14 }, { "lat": 19.45, "lng": -99.12 }] }
  ]
}
```

### 6.4 Gestión de dispositivos ❌

No hay endpoints de alta, edición, baja ni activación/desactivación. El botón *Editar* de
`/dispositivos` abre un modal que documenta el contrato necesario:

```
PUT /api/devices/:deviceId
Authorization: Bearer <API_KEY>
Content-Type: application/json

{ "name": "string", "uniqueId": "string", "active": true }
```

### 6.5 Notificaciones push ❌

No hay integración de envío de notificaciones. Las alertas del frontend son locales.

### 6.6 Autenticación multiusuario ❌

No hay usuarios, roles ni permisos. Requeriría, como mínimo:

```
POST /api/auth/login   { "username": "...", "password": "..." }  -> { token, user }
POST /api/auth/logout
GET  /api/auth/me
```

y que el resto de endpoints validasen el token y el alcance por usuario.

### 6.7 Geocodificación ❌

El backend solo almacena `latitude`/`longitude`. El frontend muestra **coordenadas** por
defecto y ofrece, **desactivada y opcional**, geocodificación inversa contra Nominatim
(OpenStreetMap) con caché y una petición en vuelo (`src/utils/geocode.ts`). Si el backend
añade geocodificación, se sustituye esa llamada.

### 6.8 PWA offline ❌ (no aplicable)

No hay sincronización offline ni service worker (por decisión de alcance). Solo se incluye
`manifest.webmanifest`, iconos y viewport, según el requisito 32.

---

## 7. Verificación realizada contra el backend real

Ejecutado contra `https://servidor-trackar.vercel.app` con la API Key del proyecto
(septiembre 2026):

| Comprobación | Resultado |
|---|---|
| `GET /api/health` | `200` · `{"success":true,"service":"traccar-gps-server","status":"ok"}` |
| `GET /api/devices` (con clave) | `200` · 1 dispositivo con `lastPosition` |
| `GET /api/devices` (sin clave) | `200` → **el despliegue está en modo abierto** (validado en la UI) |
| `GET /api/positions/59275505?limit=3` | `200` · `count: 3`, campos coincidentes con `Position` |
| `GET /api/positions/59275505/latest` | `200` · incluye `altitude`, `accuracy`, `receivedAt` |

Los tipos de `src/types/index.ts` se ajustaron a estas respuestas: **ningún campo se
declaró sin haberlo observado en el backend**.

---

## 8. Cambios requeridos en el backend (opcionales, para completar el producto)

Ninguno es imprescindible para que el frontend funcione hoy. Priorizados:

1. `GPS_API_KEY` en producción (el despliegue actual está en modo abierto).
2. Autenticación multiusuario si el sistema tendrá varios clientes.
3. `GET /api/events` (o detección de eventos sobre `gps_positions`).
4. Paginación en `GET /api/devices` (> 1000 dispositivos).
5. `GET /api/statistics` para no agregar en el cliente.
6. `GET /api/geofences`.
7. `PUT /api/devices/:deviceId` para nombres editables.
