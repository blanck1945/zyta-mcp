# Inventario — qué hay armado en `zyta-mcp`

Documento orientado al equipo (y al propio MCP en Cursor): **qué existe hoy** en este repo, **cómo se autentica** contra el API Kairo/Zyta y **qué endpoints del backend usa** cada herramienta.

---

## Rol del proyecto

| | |
|--|--|
| **Qué es** | Servidor [MCP](https://modelcontextprotocol.io/) por **stdio** (`dist/index.js`): un proceso que Cursor/Claude lanza y al que el asistente llama vía herramientas. |
| **Qué no es** | No es el backend: **no** reemplaza la API. Es un **cliente HTTP** con el mismo JWT que el dashboard. |
| **Dominios** | Judicial (PJN/SCBA), jurisprudencia, búsqueda de marcas en histórico INPI, **Minerva** (consultas con IA). |

---

## Estructura del repo (código fuente)

| Ruta | Contenido |
|------|-----------|
| `src/index.ts` | Arranque MCP, `loadEnv`, `KairoApiClient`, registro de herramientas. |
| `src/env.ts` | Resuelve `KAIRO_API_BASE_URL` / `ZYTA_API_BASE_URL` y token (env o `~/.zyta-mcp/token`). |
| `src/apiClient.ts` | Cliente HTTP con `Authorization: Bearer`. |
| `src/tokenStore.ts` | Lectura/escritura del archivo de token. |
| `src/toolResult.ts` | Normaliza respuestas JSON y errores (incl. truncado de payloads grandes). |
| `src/auth/loginApi.ts` | Login por email/contraseña → `POST /auth/login`. |
| `src/auth/deviceFlow.ts` | Flujo OAuth 2.0 **Device Authorization** (RFC 8628): `device-authorization` + polling `token`. |
| `src/login-cli.ts` | CLI `npm run login` (contraseña en terminal, no en el chat). |
| `src/device-login-cli.ts` | CLI `npm run login:device` (abre navegador en `verification_uri`). |
| `src/tools/auth.ts` | Herramientas `zyta_login`, `zyta_disconnect`, `zyta_whoami`, `zyta_auth_status`. |
| `src/tools/judicial.ts` | Herramientas PJN/SCBA / expedientes. |
| `src/tools/jurisprudencia.ts` | Búsqueda de jurisprudencia. |
| `src/tools/trademarks.ts` | Búsqueda de marcas (histórico). |
| `src/tools/minerva.ts` | Consultas Minerva: consultar, buscar fallos, historial, uso. |

**Binarios** (`package.json`): `zyta-mcp` → `dist/index.js`, `zyta-mcp-login` → `login-cli`, `zyta-mcp-login-device` → `device-login-cli`.

---

## Herramientas MCP (inventario)

| Herramienta MCP | Método API | Ruta backend (referencia) |
|-----------------|------------|---------------------------|
| `zyta_login` | — | Device flow: POST `/auth/mcp/device-authorization` + polling `/auth/mcp/token`; o token manual |
| `zyta_disconnect` | — | Borra token local (~/.zyta-mcp/token) |
| `zyta_whoami` | GET | `/users` |
| `zyta_auth_status` | — | No llama API; solo describe `baseUrl` y origen del token. |
| `zyta_judicial_portals_status` | GET | `/judicial/portals/status` |
| `zyta_judicial_expedientes_list` | GET | `/judicial/expedientes` (query opcional `portal`: `pjn` \| `scba`) |
| `zyta_judicial_expediente_get` | GET | `/judicial/expedientes/:id` |
| `zyta_judicial_cursor_registrar_actuacion` | POST | `/judicial/cursor/registrar-actuacion` (body: `message` obligatorio; `link`, `expedienteId` opcionales; solo causas `sin_portal`) |
| `zyta_jurisprudencia_search` | POST | `/jurisprudencia/search` (body: `{ query }` obligatorio; resto passthrough) |
| `zyta_trademarks_search` | GET | `/trademarks/search` (query params: `q`, `classes`, `from`, `to`, `limit`, `offset`) |
| `zyta_minerva_consultar` | POST | `/minerva/consultar` (body: `query` obligatorio; `top_k`, `min_score`, `model` opcionales) |
| `zyta_minerva_buscar_fallos` | POST | `/minerva/buscar` (body: `query` obligatorio; `top_k` opcional) |
| `zyta_minerva_historial` | GET | `/minerva/historial` (query: `page`, `limit` opcionales) |
| `zyta_minerva_uso` | GET | `/minerva/uso` |

Las respuestas JSON pueden **truncarse** internamente para no saturar el contexto del modelo.

---

## Autenticación (lado cliente MCP)

Todas las llamadas al API van con:

```http
Authorization: Bearer <JWT>
```

El JWT es el mismo que usa el **login web** (`accessToken` de `POST /auth/login` o equivalente).

| Forma | Cómo |
|--------|------|
| Variable de entorno | `KAIRO_API_TOKEN` o `ZYTA_API_TOKEN` en la config MCP. |
| Archivo | Por defecto `~/.zyta-mcp/token` (Windows: `C:\Users\<usuario>\.zyta-mcp\token`). Ruta alternativa: `KAIRO_TOKEN_FILE` / `ZYTA_TOKEN_FILE`. |
| `npm run login` | Prompt email/contraseña → `POST /auth/login` → guarda token en archivo. |
| `npm run login:device` | Flujo **device** (recomendado): sin contraseña en el modelo; abre el navegador en la URL de verificación del backend. |

---

## Autenticación (lado backend — device flow)

Para que `npm run login:device` funcione, el **API** debe exponer (RFC 8628):

| Endpoint | Rol |
|----------|-----|
| `POST /auth/mcp/device-authorization` | Devuelve `device_code`, `user_code`, `verification_uri`, etc. |
| `POST /auth/mcp/token` | Polling con `device_code` → `accessToken` o `{ error: authorization_pending, ... }`. |
| `POST /auth/mcp/confirm` | **Con JWT** (usuario ya logueado en el dashboard): confirma el `user_code` y autoriza el dispositivo. |
| `POST /auth/mcp/deny` | Opcional: rechaza la vinculación. |

Contrato detallado (incluye `confirm` / `deny`, diagrama y variables del BE): **[BACKEND_MCP_AUTH_SPEC.md](./BACKEND_MCP_AUTH_SPEC.md)**.

Implementación de referencia: **`BE/Zyta-be`** (NestJS) — `src/auth/auth.controller.ts`, `mcp-device-auth.service.ts`, `dto/mcp-device.dto.ts`, migración `mcp_device_codes`. Variables: ver `BE/Zyta-be/.env.example` (`FRONTEND_URL`, `MCP_DEVICE_VERIFICATION_BASE_URL`, `MCP_DEVICE_VERIFY_PATH`, `MCP_DEVICE_CODE_TTL_SEC`, etc.).

**Pendiente típico en producto:** una **pantalla en el dashboard** en la ruta configurada como `verification_uri` / `MCP_DEVICE_VERIFY_PATH` que muestre el código y llame a `POST /auth/mcp/confirm` con la sesión del usuario.

---

## Variables de entorno relevantes (MCP)

| Variable | Uso |
|----------|-----|
| `KAIRO_API_BASE_URL` / `ZYTA_API_BASE_URL` | **Obligatoria.** URL base del API, sin barra final. |
| `KAIRO_API_TOKEN` / `ZYTA_API_TOKEN` | JWT si no usás archivo. |
| `KAIRO_TOKEN_FILE` / `ZYTA_TOKEN_FILE` | Ruta al archivo de token. |
| `KAIRO_MCP_CLIENT_ID` | Opcional; se envía en device-authorization si el backend lo usa. |
| `KAIRO_MCP_DEVICE_AUTH_PATH` / `KAIRO_MCP_DEVICE_TOKEN_PATH` | Opcional; si los paths del BE no son los defaults (`/auth/mcp/...`). |

---

## Scripts npm

| Script | Acción |
|--------|--------|
| `npm run build` | Compila TypeScript → `dist/`. |
| `npm start` | Ejecuta el servidor MCP (stdio); útil para probar que arranca. |
| `npm run login` | Login email/contraseña y guardado de token. |
| `npm run login:device` | Flujo dispositivo (navegador + polling). |

---

## Documentación relacionada

| Archivo | Contenido |
|---------|-----------|
| [README.md](../README.md) | Instalación, Cursor, variables, tabla de herramientas (resumen). |
| [BACKEND_MCP_AUTH_SPEC.md](./BACKEND_MCP_AUTH_SPEC.md) | Contrato del API (device flow, `confirm`, `deny`, alineado a Zyta-be). |
| [MCP_DEVICE_AUTH_BACKEND.md](./MCP_DEVICE_AUTH_BACKEND.md) | Redirige al spec de backend. |

---

## Limitaciones conocidas

- **Un proceso MCP ≈ un usuario/token**; otra cuenta implica otro archivo o otra entrada en la config.
- Jurisprudencia puede ser **lenta** y el API aplica **rate limiting**.
- El MCP **no** expone credenciales de portales (PJN/SCBA/INPI); solo lo que el backend devuelve con el JWT del usuario.

---

*Última actualización: inventario del código en `zyta-mcp` y alineación con **Zyta-be** (`BE/Zyta-be`) y [BACKEND_MCP_AUTH_SPEC.md](./BACKEND_MCP_AUTH_SPEC.md).*
