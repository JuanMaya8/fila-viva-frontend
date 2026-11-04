# Fila Viva — Frontend

Interfaz de **Fila Viva** para una sucursal bancaria ficticia (Banco Demo). El cliente toma turno desde el celular y ve, en vivo, cuántas personas tiene delante, cuánto va a esperar y con qué confianza. El asesor atiende desde su panel y el admin gestiona y mide todo. Este repositorio es **uno de tres**:

| Repositorio | Qué hace | Puerto |
|---|---|---|
| `fila-viva-backend` | API central, orquestación y tiempo real | 3000 |
| `fila-viva-frontend` (este) | Web/PWA del cliente, panel del asesor, panel del admin y pantalla de sala | 3001 |
| `fila-viva-ai` | Modelos de ML + simulación de la cola | 8000 |

El orden de arranque y el guion de demo están en `README-GENERAL.md`, en la carpeta que contiene los tres repositorios.

---

## 1. Pantallas y patrones de rendering

| Ruta | Quién | Rendering | Por qué |
|---|---|---|---|
| `/` | todos | **SSG** (estática) | Login y botón "Soy cliente: tomar turno". No depende de datos, así que carga al instante y queda en caché del service worker |
| `/turno` | cliente | **ISR** (`revalidate = 30`) | El catálogo de trámites cambia poco: se pre-renderiza y se regenera cada 30 s. La espera de cada tarjeta se actualiza en vivo por Socket.io (`queueUpdate`) |
| `/turno/[id]` | cliente | **CSR** + WebSocket | Ficha privada y en vivo: turno, personas delante, tiempo estimado (contador en Web Worker), intervalo, confianza, IA vs. tradicional, aviso a ≤ 5 min, "Pase a ventanilla N" y cancelar |
| `/advisor` | asesor | **CSR** protegido | Disponible / En pausa, llamar siguiente, llegó / ausente, pasos, notas, caso complejo, restante según la IA, finalizar (y llamar siguiente) |
| `/admin` | admin | **CSR** protegido | Tablero en vivo (fila por trámite, asesores, espera, error IA vs. tradicional, modelo y reentrenar), gestión de asesores y de trámites |
| `/display` | sala | **SSR** (`force-dynamic`) | Pantalla pública: se renderiza con el estado actual en cada carga y sigue en vivo. Solo códigos de turno y ventanillas, sin datos personales |

## 2. Decisiones técnicas

**Sesión en cookie httpOnly.** El navegador llama al backend a través del *rewrite* same-origin `/api/backend/*` (ver `next.config.js`). Así, la cookie `fv_token` que pone el backend queda en el dominio del frontend, tanto en `localhost:3001` como en Vercel, y JavaScript nunca ve el token. Socket.io se conecta directo al backend (`NEXT_PUBLIC_WS_URL`). Como no puede leer la cookie, las pantallas de admin y asesor piden antes un token de socket de 5 minutos (`POST /auth/socket-token`) en cada intento de conexión.

**Protección por rol.** `middleware.ts` protege `/admin` y `/advisor`: reenvía la cookie a `GET /auth/me` del backend (no decodifica el JWT localmente, así el frontend no necesita el secreto) y redirige a `/` si el rol no corresponde. Además, el backend vuelve a autorizar cada llamada.

**Tiempo real.** `src/hooks/useSocket.ts` crea un socket por pantalla con reconexión automática. `useRoom` se une a la sala, vuelve a unirse y recarga por HTTP tras cada reconexión (para no perder eventos), y al desmontar quita los listeners, sale de la sala y cierra el socket.

**Contador suavizado.** `src/workers/countdown.worker.ts` corre fuera del hilo principal: cuenta hacia atrás en tiempo real y, cuando llega una estimación nueva, se desliza hacia ella en vez de saltar (`src/lib/countdown.ts`). El worker se termina al desmontar.

**PWA.** `public/manifest.webmanifest`, íconos SVG y `public/sw.js`: precachea la portada, `/turno` y una página sin conexión, y sirve los assets estáticos desde caché. Nunca cachea la API, los sockets ni las pantallas autenticadas. El service worker se registra solo en producción.

**UX.** Mobile-first, estados de carga (skeletons), vacíos y error con mensajes claros en español (`src/lib/api.ts` traduce los códigos HTTP sin exponer detalles del servidor), paleta oscura (`#0B141C`, ámbar `#F0A431`, teal `#33C7B6`) y respeto por `prefers-reduced-motion`.

## 3. Cómo correrlo (Windows, PowerShell)

Primero levanta `fila-viva-ai` y `fila-viva-backend` (ver sus README o `README-GENERAL.md`).

```powershell
cd "C:\Users\Acer\Desktop\PROYECTO 1 Fil\fila-viva-frontend"
npm install
Copy-Item .env.local.example .env.local
npm run dev            # http://localhost:3001
```

Producción local (para probar la PWA y el service worker):

```powershell
npm run build
npm start              # http://localhost:3001
```

Calidad:

```powershell
npm test               # vitest: contador suavizado, formato y helpers de la API
npm run lint
```

## 4. Variables de entorno

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del backend. Destino del rewrite `/api/backend` y de las lecturas ISR/SSR del servidor |
| `NEXT_PUBLIC_WS_URL` | URL de Socket.io del backend (normalmente la misma) |
| `NEXT_PUBLIC_INSTITUTION_CODE` | Opcional: sucursal a usar si hay más de una (por defecto la primera) |

## 5. Despliegue en Vercel

1. Importa el repositorio en Vercel (Next.js se detecta solo).
2. Define `NEXT_PUBLIC_API_URL` y `NEXT_PUBLIC_WS_URL` con la URL del backend en Render (p. ej. `https://fila-viva-backend.onrender.com`) para Production y Preview. Como el rewrite se calcula al compilar, si cambias la URL hay que volver a desplegar.
3. En el backend (Render), pon la URL de Vercel en `FRONTEND_URL`, que habilita CORS y WebSocket para ese origen.
4. Despliega. El primer acceso puede tardar si el plan gratuito de Render estaba dormido; mientras tanto, el middleware redirige al login.

## Contratos entre repositorios

> Esta sección es idéntica en los tres README. Todos los campos van en camelCase. Tipos: TypeScript en `fila-viva-backend/src/modules/prediction/interfaces/prediction-result.interface.ts` y `src/modules/queue/interfaces/queue-views.interface.ts`, TypeScript en `fila-viva-frontend/src/lib/types.ts`, y Pydantic en `fila-viva-ai/app/schemas.py`. El contrato gRPC equivalente está en `proto/fila_viva_prediction.proto` (igual en la IA y en el backend). Si cambias un contrato, actualízalo en los tres repositorios.

### Backend → IA (todas las rutas excepto `/health` llevan el header `X-API-Key: <INTERNAL_API_KEY>`)

**`POST /predict/queue`**: una llamada por evento de la cola, con toda la sucursal. Los turnos cuyo `turnId` empieza por `probe:` son hipotéticos ("si alguien llega ahora") y alimentan la espera estimada que se muestra antes de tomar turno.

```json
{
  "timestamp": "2026-11-03T15:30:00.000Z",
  "utcOffsetMinutes": -300,
  "serviceTypes": [
    { "id": "6f1c9a52-6a4e-4d5e-9a57-2a0f2b7c1a10", "avgServiceMinutes": 3, "stepsTotal": 3 },
    { "id": "0b8e4d3c-2f7a-4b61-8d2e-91c5a7e4f220", "avgServiceMinutes": 35, "stepsTotal": 6 }
  ],
  "advisors": [
    {
      "id": "a3d2c1b0-1111-4c2d-9e8f-0a1b2c3d4e5f",
      "status": "busy",
      "serviceTypeIds": ["6f1c9a52-6a4e-4d5e-9a57-2a0f2b7c1a10", "0b8e4d3c-2f7a-4b61-8d2e-91c5a7e4f220"],
      "speedFactor": 1.0,
      "statusSinceSeconds": 240,
      "currentTurn": {
        "turnId": "5e0f7a1c-2222-4b3c-8d4e-5f6a7b8c9d0e",
        "serviceTypeId": "0b8e4d3c-2f7a-4b61-8d2e-91c5a7e4f220",
        "status": "in_service",
        "elapsedSeconds": 600,
        "stepsCompleted": 2,
        "stepsTotal": 6,
        "isComplex": false
      }
    }
  ],
  "waitingTurns": [
    {
      "turnId": "9c8b7a6d-3333-4e5f-8a9b-0c1d2e3f4a5b",
      "serviceTypeId": "6f1c9a52-6a4e-4d5e-9a57-2a0f2b7c1a10",
      "preferential": false,
      "createdAt": "2026-11-03T15:21:00.000Z"
    },
    {
      "turnId": "probe:6f1c9a52-6a4e-4d5e-9a57-2a0f2b7c1a10",
      "serviceTypeId": "6f1c9a52-6a4e-4d5e-9a57-2a0f2b7c1a10",
      "preferential": false,
      "createdAt": "2026-11-03T15:30:00.000Z"
    }
  ]
}
```

```json
{
  "source": "model",
  "modelVersion": "lgbm-20261104001134",
  "congestionLevel": "medium",
  "turns": [
    {
      "turnId": "9c8b7a6d-3333-4e5f-8a9b-0c1d2e3f4a5b",
      "peopleAhead": 0,
      "estimatedWaitMinutes": 18.4,
      "lowerMinutes": 11.4,
      "upperMinutes": 29.2,
      "confidence": 57,
      "traditionalEstimateMinutes": 0.0,
      "congestionLevel": "medium"
    },
    {
      "turnId": "probe:6f1c9a52-6a4e-4d5e-9a57-2a0f2b7c1a10",
      "peopleAhead": 1,
      "estimatedWaitMinutes": 21.8,
      "lowerMinutes": 14.4,
      "upperMinutes": 33.7,
      "confidence": 58,
      "traditionalEstimateMinutes": 10.8,
      "congestionLevel": "medium"
    }
  ],
  "inService": [
    {
      "turnId": "5e0f7a1c-2222-4b3c-8d4e-5f6a7b8c9d0e",
      "remainingMinutes": 19.4,
      "lowerMinutes": 11.5,
      "upperMinutes": 33.4,
      "expectedTotalMinutes": 29.4
    }
  ]
}
```

`source` vale `model` (modelos entrenados), `baseline` (M/M/c dentro de la IA) o `fallback` (estimación del backend cuando la IA no responde). `peopleAhead` cuenta los turnos del mismo trámite que se llamarán antes (preferencial primero, luego el más antiguo). `traditionalEstimateMinutes` = `peopleAhead × 10.8`.

**`POST /predict/remaining`**: tiempo restante de una atención en curso.

```json
{
  "avgServiceMinutes": 25,
  "stepsTotal": 6,
  "stepsCompleted": 3,
  "elapsedSeconds": 720,
  "isComplex": false,
  "advisorSpeedFactor": 1.0,
  "timestamp": "2026-11-03T15:30:00.000Z",
  "utcOffsetMinutes": -300
}
```

```json
{
  "remainingMinutes": 9.4,
  "lowerMinutes": 5.0,
  "upperMinutes": 16.9,
  "expectedTotalMinutes": 21.4,
  "source": "model",
  "modelVersion": "lgbm-20261104001134"
}
```

**`POST /predict`**: contrato original de la semana 3, se mantiene (`avgServiceMinutes` es opcional).

```json
{
  "peopleAhead": 8,
  "activeAgents": 3,
  "serviceTypeId": "2b6f8c2e-1b3a-4a3a-9d90-7d6a0f9b6a11",
  "arrivalTime": "2026-09-29T14:32:00.000Z"
}
```

```json
{
  "estimatedWaitMinutes": 36,
  "confidence": 73,
  "traditionalEstimateMinutes": 86,
  "congestionLevel": "high"
}
```

**IA → Backend: `GET /internal/history`** (header `X-API-Key`), usado por `POST /train` para mezclar datos reales:

```json
{
  "count": 1,
  "records": [
    {
      "serviceTypeId": "6f1c9a52-6a4e-4d5e-9a57-2a0f2b7c1a10",
      "agentId": "a3d2c1b0-1111-4c2d-9e8f-0a1b2c3d4e5f",
      "avgServiceMinutes": 3,
      "stepsTotal": 3,
      "isComplex": false,
      "startedAt": "2026-11-03T15:31:00.000Z",
      "actualServiceMinutes": 2.6,
      "predictedServiceMinutes": 3.1,
      "actualWaitMinutes": 4.2,
      "predictedWaitMinutes": 3.4,
      "traditionalWaitMinutes": 10.8
    }
  ]
}
```

### Backend → Frontend

**Turno (`POST /turns`, `GET /turns/:id`, evento `turnUpdate`)**:

```json
{
  "id": "9c8b7a6d-3333-4e5f-8a9b-0c1d2e3f4a5b",
  "ticketNumber": 12,
  "ticketCode": "C-012",
  "status": "created",
  "serviceTypeId": "6f1c9a52-6a4e-4d5e-9a57-2a0f2b7c1a10",
  "serviceTypeName": "Consulta rápida",
  "preferential": false,
  "peopleAhead": 2,
  "estimatedWaitMinutes": 6.4,
  "lowerMinutes": 3.9,
  "upperMinutes": 9.8,
  "confidence": 74,
  "traditionalEstimateMinutes": 21.6,
  "congestionLevel": "low",
  "source": "model",
  "windowNumber": null,
  "createdAt": "2026-11-03T15:21:00.000Z",
  "calledAt": null,
  "estimatedAt": "2026-11-03T15:30:00.000Z"
}
```

Estados del turno: `created → called → in_service → completed`, más `absent` (desde `called`) y `cancelled` (desde `created` o `called`). Cualquier otra transición responde **409**.

**Socket.io** (URL `NEXT_PUBLIC_WS_URL`):

| El cliente emite | Sala | El servidor emite | Contenido |
|---|---|---|---|
| `joinTurn(turnId)` | `turn:{id}` | `turnUpdate` | Turno (arriba) |
| `joinQueue(serviceTypeId)` | `queue:{serviceTypeId}` | `queueUpdate` | Resumen de la fila: `waiting`, `activeAdvisors`, `estimatedWaitMinutes`, `confidence`, `congestionLevel` |
| `joinDisplay(institutionId)` | `display:{institutionId}` | `displayUpdate` | Turnos llamados con ventanilla, próximos turnos y espera por trámite (sin datos personales) |
| handshake `auth.token` de admin | `admin:{institutionId}` | `dashboardUpdate` | Tablero del admin |
| handshake `auth.token` de asesor | `advisor:{agentId}` | `advisorUpdate` | Panel del asesor |

El token de socket se obtiene con `POST /auth/socket-token` (dura 5 minutos), porque la cookie de sesión es httpOnly. Cada `join*` tiene su `leave*`.

## Notas para quien continúe el proyecto (persona o IA)

- Código, comentarios y commits en inglés; textos de la interfaz y README en español.
- `src/lib/types.ts` refleja los contratos del backend: si cambian allá, cambian aquí primero.
- Nada de lógica de predicción en el frontend: los tiempos llegan ya calculados. El worker solo suaviza la presentación.
- Toda llamada del navegador pasa por `src/lib/api.ts` (rewrite + mensajes de error en español).
