# Fila Viva — Frontend

Interfaz de **Fila Viva**, el sistema de predicción inteligente de tiempos de espera. Este repositorio es **uno de tres**:

| Repositorio | Qué hace | Estado |
|---|---|---|
| `fila-viva-backend` | API core: turnos, funcionarios, tipos de trámite, tiempo real | 🟡 Avance semana 3 |
| `fila-viva-frontend` (este) | PWA del ciudadano, pantalla de sala y panel de funcionarios | 🟡 Avance semana 3 |
| `fila-viva-ai` | Servicio de predicción (IA + teoría de colas) | 🟡 Avance semana 3 |


---

## 1. Qué es Fila Viva

Combina teoría de colas y machine learning para decirle a una persona, en tiempo real, cuánto va a esperar realmente (no solo su número de turno). El frontend es la cara visible de eso: la persona ve su turno, personas delante, tiempo estimado y confianza, y esa cifra se actualiza sola cuando algo cambia en la fila.

## 2. Estado del avance (semana 3 de 3)

**Hecho:**
- Proyecto Next.js 14 (App Router) + TypeScript.
- Cliente de API (`src/lib/api.ts`) que respeta exactamente el contrato de `fila-viva-backend` (`TurnResponse`).
- Una pantalla mínima (`app/page.tsx`) que permite tomar un turno de prueba y ver el resultado devuelto por el backend, incluida la predicción.
- Estilos base (`app/globals.css`) usando la misma paleta que la arquitectura de referencia del proyecto (fondo oscuro, acento ámbar para datos en vivo, teal para IA).

**Explícitamente NO hecho todavía:**
- No hay selección real de institución / tipo de trámite: los IDs están hardcodeados como placeholders (`DEMO_INSTITUTION_ID`, `DEMO_SERVICE_TYPE_ID`) hasta que exista una pantalla de configuración.
- No hay conexión WebSocket todavía (`socket.io-client` ya está en `package.json`, pero no se usa). La actualización de la predicción hoy requiere volver a tocar "Tomar un turno".
- No hay Web Worker para suavizar el conteo regresivo (etapa 7 del pipeline de IA, ver `fila-viva-backend/README.md`).
- No hay vista de pantalla de sala (kiosco) ni panel de funcionarios: solo existe la vista del ciudadano.
- No es todavía una PWA instalable (falta manifest y service worker).
- No hay manejo de roles ni autenticación.

## 3. Cómo encaja en la arquitectura completa

```mermaid
flowchart LR
    subgraph Frontend["fila-viva-frontend (este repo)"]
        Page[app/page.tsx]
        Api[src/lib/api.ts]
    end
    Backend[fila-viva-backend]
    Page --> Api -->|POST /turns| Backend
    Backend -->|prediccion incluida en la respuesta| Api
```

El frontend nunca le habla directamente a `fila-viva-ai`: siempre pasa por `fila-viva-backend`, que es quien orquesta la predicción y el estado de la cola. Ver `fila-viva-backend/README.md` para la arquitectura completa del sistema (las 7 capas, el pipeline de IA de 9 etapas y el flujo de recálculo en tiempo real).

## 4. Stack de este repositorio

| Pieza | Tecnología | Por qué |
|---|---|---|
| Framework | Next.js 14 (App Router) | Renderizado en servidor para la primera carga, estructura lista para separar vistas por rol más adelante. |
| Lenguaje | TypeScript | Mismo lenguaje que el backend; los tipos de `TurnResponse` deben coincidir entre ambos repos. |
| Tiempo real (pendiente de conectar) | socket.io-client | Debe conectarse al `TurnsGateway` de `fila-viva-backend`. |
| Estilos | CSS plano por ahora | Se migrará a TailwindCSS cuando se defina el sistema de diseño completo. |

## 5. Cómo correrlo localmente

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar variables de entorno
cp .env.local.example .env.local

# 3. Levantar fila-viva-backend en paralelo (puerto 3000)
#    y crear al menos un service-type de prueba desde /docs

# 4. Levantar el frontend
npm run dev

# 5. Abrir http://localhost:3001 (o el puerto que indique Next si 3000 está ocupado por el backend)
```

## 6. Próximos pasos (backlog inmediato)

1. Pantalla de selección de institución y tipo de trámite (reemplaza los IDs hardcodeados).
2. Conexión WebSocket real: unirse a la sala de la cola (`joinQueue`) y escuchar `queueUpdate`.
3. Web Worker para interpolar el conteo regresivo entre actualizaciones del servidor.
4. Vista de "pantalla de sala" (modo kiosco) y panel de funcionarios, reutilizando el mismo cliente de API.
5. Manifest + service worker para que sea instalable como PWA.
6. Migrar los estilos a TailwindCSS.

## 7. Notas para una IA generadora de código

- **Todo el código va en inglés**; este `README.md` va en español.
- `src/lib/api.ts` define el contrato con el backend. Si el backend cambia su `TurnResponseDto`, actualizar esta interfaz primero.
- No dupliques lógica de predicción acá: cualquier cálculo de tiempos de espera vive en `fila-viva-ai` y se recibe ya resuelto desde `fila-viva-backend`.
- Los placeholders `REPLACE_WITH_A_REAL_...` en `app/page.tsx` son intencionales, no un olvido: reemplazarlos es parte del paso 1 del backlog.
- Antes de agregar una librería de componentes UI, revisar si el equipo ya definió un sistema de diseño (ver si existe una nota al respecto en este README en una versión posterior).
