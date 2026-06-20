import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import { fetchAccessToken } from "../auth/loginApi.js";
import { runDeviceLogin, clearPendingDevice } from "../auth/mcpDeviceLogin.js";
import type { LoadedEnv } from "../env.js";
import {
  clearSession,
  ensureToken,
  fetchCurrentUser,
  getBaseUrl,
  getTokenFilePath,
  getTokenSource,
  hasToken,
  setToken,
  validateToken,
} from "../session.js";
import { jsonResult, toolError } from "../toolResult.js";

const loginInput = z.object({
  access_token: z
    .string()
    .optional()
    .describe(
      "JWT manual (alternativa al device flow). También podés usar KAIRO_API_TOKEN en env."
    ),
  email: z
    .string()
    .optional()
    .describe(
      "Email de Zyta. Con password hace POST /auth/login (sin depender del dashboard /mcp-device)."
    ),
  password: z
    .string()
    .optional()
    .describe("Contraseña de Zyta. Requiere email."),
});

export function registerAuthTools(
  server: McpServer,
  env: LoadedEnv
): void {
  server.registerTool(
    "zyta_login",
    {
      description:
        "Obligatorio antes de cualquier otra herramienta si no hay sesión. " +
        "Opciones (en orden): access_token manual; email+password (POST /auth/login); " +
        "device flow (abre navegador en /mcp-device — requiere dashboard desplegado). " +
        "Si el device flow queda pendiente, usá email+password o `npx zyta-mcp-login`.",
      inputSchema: loginInput,
    },
    async (args) => {
      try {
        const baseUrl = getBaseUrl();
        const manual =
          args.access_token?.trim() ||
          process.env.KAIRO_API_TOKEN?.trim() ||
          process.env.ZYTA_API_TOKEN?.trim();

        if (manual) {
          if (!(await validateToken(manual))) {
            return toolError(new Error("El token indicado no es válido o expiró."));
          }
          setToken(manual, true);
          const user = await fetchCurrentUser(manual);
          return jsonResult({
            ok: true,
            message: "Sesión OK. Token guardado.",
            baseUrl,
            tokenFile: getTokenFilePath(),
            user,
          });
        }

        const email = args.email?.trim();
        const password = args.password;
        if (email || password !== undefined) {
          if (!email || !password) {
            return toolError(
              new Error("Para login con credenciales indicá email y password juntos.")
            );
          }
          const accessToken = await fetchAccessToken(baseUrl, email, password);
          if (!(await validateToken(accessToken))) {
            return toolError(new Error("Login OK pero el token recibido no es válido."));
          }
          setToken(accessToken, true);
          const user = await fetchCurrentUser(accessToken);
          return jsonResult({
            ok: true,
            message: "Sesión OK (email/contraseña). Token guardado.",
            baseUrl,
            tokenFile: getTokenFilePath(),
            user,
          });
        }

        const result = await runDeviceLogin(baseUrl);
        if (result.ok) {
          setToken(result.accessToken, true);
          return jsonResult({
            ok: true,
            message: "Sesión OK. Token guardado.",
            baseUrl,
            tokenFile: getTokenFilePath(),
            user: result.user,
          });
        }

        if (result.pending) {
          return jsonResult({
            ok: false,
            pending: true,
            message:
              result.message +
              " Si /mcp-device da 404, usá zyta_login con email+password o ejecutá: npx zyta-mcp-login",
            userCode: result.userCode,
            verificationUriComplete: result.verificationUriComplete,
          });
        }

        return toolError(new Error(result.message));
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "zyta_disconnect",
    {
      description:
        "Cierra la sesión del agente MCP (borra token en memoria y el archivo ~/.zyta-mcp/token). No cierra sesión en el navegador.",
      inputSchema: z.object({}),
    },
    async () => {
      clearSession();
      clearPendingDevice();
      return jsonResult({
        ok: true,
        message: "Sesión del agente cerrada. Usá zyta_login para volver a autorizar.",
      });
    }
  );

  server.registerTool(
    "zyta_whoami",
    {
      description:
        "Devuelve el usuario asociado al token del agente MCP (GET /users). Requiere sesión activa.",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const token = await ensureToken();
        const user = await fetchCurrentUser(token);
        return jsonResult({ ok: true, user });
      } catch (e) {
        return toolError(e);
      }
    }
  );

  server.registerTool(
    "zyta_auth_status",
    {
      description:
        "Indica si el MCP tiene token configurado (variable de entorno, archivo o login MCP) y la URL base del API. No muestra el token.",
    },
    async () => {
      return jsonResult({
        ok: true,
        baseUrl: env.baseUrl,
        tokenSource: getTokenSource(),
        hasToken: hasToken(),
        tokenFileHint:
          getTokenSource() === "file" || getTokenSource() === "memory"
            ? `Token en ${getTokenFilePath()} (o memoria tras zyta_login)`
            : getTokenSource() === "env"
              ? "Token desde KAIRO_API_TOKEN / ZYTA_API_TOKEN"
              : "Sin token — llamá a zyta_login",
      });
    }
  );
}
