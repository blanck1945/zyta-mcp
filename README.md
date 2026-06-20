# zyta-mcp

Servidor [Model Context Protocol](https://modelcontextprotocol.io/) (transporte **stdio**) que expone herramientas para consultar el **API Zyta** (judicial, jurisprudencia, marcas, **Minerva**). Es un cliente HTTP más del mismo backend que usa el dashboard; **no** sustituye al backend ni se ejecuta dentro del frontend.

**Inventario de lo que hay armado (herramientas, rutas API, auth, scripts):** [docs/MCP_INVENTARIO.md](docs/MCP_INVENTARIO.md).

## Instalación rápida (Cursor / Claude)

```json
{
  "mcpServers": {
    "zyta": {
      "command": "npx",
      "args": ["-y", "zyta-mcp"],
      "env": {
        "KAIRO_API_BASE_URL": "https://api.zyta.app"
      }
    }
  }
}
```

1. Pegá eso en la config MCP de Cursor o Claude Desktop.
2. En el chat del agente: *"logueate en zyta"* → llama `zyta_login` → se abre el navegador en Zyta para autorizar.
3. Alternativa en terminal: `npx --yes zyta-mcp-login-device` o `npx --yes zyta-mcp-login`.

No hace falta clonar el repo ni pegar JWT en el JSON. Solo Node.js 20+.

## Requisitos

- **Node.js** 20 o superior
- URL del API desplegado (staging o producción)
- Un **JWT** válido (vía variable de entorno, o guardado con el login integrado de abajo)

## Autenticación

Cada petición al API lleva:

```http
Authorization: Bearer <JWT>
```

El JWT identifica al usuario y aplica los mismos permisos que en la web.

### Recomendado en producción — Device flow (sin credenciales en el chat ni en el modelo)

Para máxima seguridad, el backend debe implementar **OAuth 2.0 Device Authorization** ([RFC 8628](https://datatracker.ietf.org/doc/html/rfc8628)): el usuario abre **tu** página en el navegador, inicia sesión (y MFA si aplica) **solo ahí**, y el CLI hace polling hasta recibir el JWT. Nada de contraseñas pasa por Cursor ni por el LLM.

- **Especificación para el equipo de backend:** [docs/BACKEND_MCP_AUTH_SPEC.md](docs/BACKEND_MCP_AUTH_SPEC.md) (contrato completo para implementar en el BE).
- **Cliente ya incluido:** tras desplegar el BE, ejecutá:

```powershell
$env:KAIRO_API_BASE_URL = "https://tu-api.example.com"
npm run login:device
```

Se abrirá el navegador en la URL de verificación; al completar el login en la web, el token se guarda en `~/.zyta-mcp/token` como el resto de flujos.

**Tarea en Cursor:** *Run Task…* → **“Zyta MCP: login dispositivo (OAuth RFC 8628)”**.

Variables opcionales: `KAIRO_MCP_CLIENT_ID`, `KAIRO_MCP_DEVICE_AUTH_PATH`, `KAIRO_MCP_DEVICE_TOKEN_PATH` (si no usás los paths por defecto del doc).

### Opción A — Login con email/contraseña en la terminal (`npm run login`)

El comando `npm run login` llama a `POST /auth/login` (igual que el dashboard con email/contraseña) y guarda el `accessToken` en un archivo local:

- **Por defecto:** `~/.zyta-mcp/token` (en Windows: `C:\Users\<tu_usuario>\.zyta-mcp\token`)

**Pasos:**

1. Compilá el proyecto (`npm install` y `npm run build`).
2. Definí la URL del API en el entorno y ejecutá el login:

```powershell
cd C:\ruta\a\Zyta-mcp
$env:KAIRO_API_BASE_URL = "https://tu-api.example.com"
npm run login
```

3. Seguí el prompt: email, contraseña (no se muestra en pantalla al escribir).
4. En la **configuración MCP de Cursor** solo hace falta la URL del API (ya **no** tenés que poner `KAIRO_API_TOKEN` en el JSON si el archivo existe).

**Desde Cursor:** *Terminal → Run Task…* y elegí **“Zyta MCP: login (guardar token)”** (tarea en `.vscode/tasks.json`), o abrí una terminal integrada y ejecutá `npm run login` con `KAIRO_API_BASE_URL` definida (o el script te pedirá la URL).

**Archivo personalizado:** podés guardar el token en otra ruta con `KAIRO_TOKEN_FILE` o `ZYTA_TOKEN_FILE` (misma variable al hacer login y al arrancar el MCP).

**Importante:** el chat del asistente **no** debe pedirte la contraseña como texto (llegaría al modelo). El login con contraseña va solo por el script en terminal.

### Opción B — Variable de entorno con el JWT

Seguís pudiendo definir `KAIRO_API_TOKEN` o `ZYTA_API_TOKEN` en la config MCP (útil en CI o si copiás el token desde el navegador). En producción suele preferirse **device flow** o archivo generado por `npm run login`, no pegar JWTs largos en JSON.

### Variables de entorno (resumen)

| Variable | Descripción |
|----------|-------------|
| `KAIRO_API_BASE_URL` o `ZYTA_API_BASE_URL` | **Obligatoria.** URL base del API, **sin** barra final. Prioridad: `KAIRO_*`. |
| `KAIRO_API_TOKEN` o `ZYTA_API_TOKEN` | Opcional si ya existe token en archivo. Prioridad: `KAIRO_*`. |
| `KAIRO_TOKEN_FILE` o `ZYTA_TOKEN_FILE` | Ruta al archivo con el JWT (lectura/escritura del login). Si no se define, se usa `~/.zyta-mcp/token`. |
| `KAIRO_MCP_CLIENT_ID` | Opcional; envío en `POST` device-authorization si el backend registra clientes. |
| `KAIRO_MCP_DEVICE_AUTH_PATH` / `KAIRO_MCP_DEVICE_TOKEN_PATH` | Opcional; paths distintos a los defaults del [doc de backend](docs/BACKEND_MCP_AUTH_SPEC.md). |

**No** commitees tokens ni el archivo `token` del home.

### Cómo obtener el JWT a mano (alternativa)

1. Iniciá sesión en el **dashboard Zyta**.
2. Desde las herramientas de desarrollador (Application → Local Storage) copiá el token si tu front lo guarda ahí.
3. Pegalo en `KAIRO_API_TOKEN` o ejecutá `npm run login` para no dejar el secret en el JSON de Cursor.

## Instalación

### Desde npm (equipo / otra PC)

El nombre en el registro es **`zyta-mcp`** (no requiere clonar el repo).

```bash
npm install -g zyta-mcp
```

**Variables y login (una vez por máquina):**

1. Definí la URL del API, por ejemplo en PowerShell:  
   `$env:KAIRO_API_BASE_URL = "https://tu-api.example.com"`
2. Ejecutá en terminal (la contraseña no va al chat del asistente):
   - `zyta-mcp-login` — email/contraseña → guarda JWT en `~/.zyta-mcp/token`, o  
   - `zyta-mcp-login-device` — recomendado: abre el navegador (RFC 8628) si el backend lo implementa.

Sin instalación global, podés usar:

```bash
npx --yes --package zyta-mcp zyta-mcp-login
```

**Config MCP en Cursor** (solo URL en `env`; el token queda en el archivo salvo que uses `KAIRO_API_TOKEN`):

```json
{
  "mcpServers": {
    "zyta": {
      "command": "npx",
      "args": ["-y", "zyta-mcp"],
      "env": {
        "KAIRO_API_BASE_URL": "https://tu-api.example.com"
      }
    }
  }
}
```

### Desde el repositorio (desarrollo)

```bash
cd zyta-mcp
npm install
npm run build
```

El servidor MCP es `dist/index.js`. El login es `dist/login-cli.js` (`npm run login`).

### Publicar una nueva versión (mantenimiento)

1. Iniciá sesión en npm: `npm login` (usuario, contraseña, email; 2FA si aplica).
2. Desde la raíz del repo: `npm publish` — el script `prepublishOnly` compila antes de subir.

Si ves `401` o `404` al publicar, no hay sesión válida: repetí `npm login`. No incluyas tokens en el paquete.

## Configuración en Cursor

### Solo URL + token en archivo (tras `npm run login`)

```json
{
  "mcpServers": {
    "zyta": {
      "command": "node",
      "args": ["C:\\Users\\TU_USUARIO\\Desktop\\side\\Kairo\\Zyta-mcp\\dist\\index.js"],
      "env": {
        "KAIRO_API_BASE_URL": "https://tu-api.example.com"
      }
    }
  }
}
```

### URL + token en env (sin archivo)

```json
{
  "mcpServers": {
    "zyta": {
      "command": "node",
      "args": ["C:\\Users\\TU_USUARIO\\Desktop\\side\\Kairo\\Zyta-mcp\\dist\\index.js"],
      "env": {
        "KAIRO_API_BASE_URL": "https://tu-api.example.com",
        "KAIRO_API_TOKEN": "eyJhbGciOi..."
      }
    }
  }
}
```

En macOS/Linux, usá rutas con barras normales en `args`.

Tras cambiar el token en disco, puede hacer falta **reiniciar** el servidor MCP en Cursor para que relea el archivo.

Documentación de Cursor sobre MCP: [https://docs.cursor.com](https://docs.cursor.com) (sección *Model Context Protocol*).

## Configuración en Claude Desktop

Misma idea: `env` con al menos `KAIRO_API_BASE_URL`, y token vía archivo (login) o `KAIRO_API_TOKEN`. Reiniciá Claude Desktop tras editar la config.

## Herramientas incluidas

### General / auth

| Nombre | Descripción resumida |
|--------|----------------------|
| `zyta_login` | **Login obligatorio** si no hay sesión. Abre el navegador en Zyta (device flow) o acepta `access_token` manual |
| `zyta_disconnect` | Cierra la sesión del agente (borra token local) |
| `zyta_whoami` | Usuario autenticado (GET /users) |
| `zyta_auth_status` | URL base y origen del token (sin mostrar el JWT) |

### Judicial

| Nombre | Descripción resumida |
|--------|----------------------|
| `zyta_judicial_portals_status` | Estado de conexión PJN / SCBA |
| `zyta_judicial_expedientes_list` | Lista de expedientes (filtro opcional `portal`: `pjn` \| `scba`) |
| `zyta_judicial_expediente_get` | Detalle de un expediente por `id` |
| `zyta_judicial_cursor_registrar_actuacion` | Mensaje → causa sin portal (IA) + actuación; opcional `link` y `expedienteId` |

### Jurisprudencia y marcas

| Nombre | Descripción resumida |
|--------|----------------------|
| `zyta_jurisprudencia_search` | Búsqueda POST `/jurisprudencia/search` (campo obligatorio `query`) |
| `zyta_trademarks_search` | Búsqueda GET `/trademarks/search` con parámetros opcionales |

### Minerva (consultas con IA)

| Nombre | Descripción resumida |
|--------|----------------------|
| `zyta_minerva_consultar` | Consulta jurídica completa: RAG + marco normativo + respuesta IA. Queda en el historial del usuario. |
| `zyta_minerva_buscar_fallos` | Solo búsqueda de fallos (RAG), sin generar respuesta IA |
| `zyta_minerva_historial` | Historial paginado de consultas del usuario autenticado |
| `zyta_minerva_uso` | Uso mensual: costo acumulado, límite del plan y saldo restante |

Para **generar un documento** (escrito, dictamen, etc.), usá `zyta_minerva_consultar` con un prompt que pida explícitamente el formato deseado.

Las respuestas JSON grandes se **truncan** con un límite interno para no saturar el contexto del modelo.

## Limitaciones y buenas prácticas

- **Un proceso MCP ≈ un token**: otro usuario u otra cuenta requiere otro archivo de token o otra config.
- La búsqueda de jurisprudencia puede ser **lenta** y el API puede aplicar **rate limiting**.
- Para login seguro sin credenciales en el chat, usá **`npm run login:device`** cuando el API implemente el device flow; el contrato completo (incl. `confirm` en el dashboard) está en [docs/BACKEND_MCP_AUTH_SPEC.md](docs/BACKEND_MCP_AUTH_SPEC.md).

## Documentación adicional

| Recurso | Contenido |
|---------|-----------|
| [docs/MCP_INVENTARIO.md](docs/MCP_INVENTARIO.md) | Mapa del repo: archivos, herramientas MCP, variables, scripts y relación con el BE. |
| [docs/BACKEND_MCP_AUTH_SPEC.md](docs/BACKEND_MCP_AUTH_SPEC.md) | Especificación del API: device authorization, `confirm`, `deny`, variables de entorno del BE. |

## Desarrollo

```bash
npm run build
npm start
```

`npm start` solo comprueba que el proceso arranca; el host (Cursor/Claude) lanza el binario y habla por stdio.

## Licencia

ISC
