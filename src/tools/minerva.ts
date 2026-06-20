import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod/v3";
import { executeLogin, loginInputSchema } from "../auth/loginHandler.js";
import type { KairoApiClient } from "../apiClient.js";
import { ApiHttpError } from "../apiClient.js";
import type { LoadedEnv } from "../env.js";
import {
  AuthRequiredError,
  ensureToken,
  fetchCurrentUser,
  getTokenFilePath,
  getTokenSource,
  hasToken,
} from "../session.js";
import { jsonResult, toolError } from "../toolResult.js";

const MINERVA_AUTH_HINT =
  "Sin sesión para Minerva. Llamá `zyta_minerva_login` (email+password recomendado), `zyta_login`, o ejecutá `npx zyta-mcp-login`.";

function minervaToolError(err: unknown): CallToolResult {
  if (err instanceof AuthRequiredError) {
    return toolError(new AuthRequiredError(MINERVA_AUTH_HINT));
  }
  if (err instanceof ApiHttpError && err.status === 401) {
    return toolError(new AuthRequiredError(MINERVA_AUTH_HINT));
  }
  return toolError(err);
}

const consultaInput = z.object({
  query: z.string().min(1).describe("Consulta jurídica en lenguaje natural"),
  top_k: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Cantidad máxima de fallos a recuperar (default: 10)"),
  min_score: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .describe("Score mínimo de relevancia (default: 0)"),
  model: z
    .string()
    .optional()
    .describe(
      "Modelo a usar: gemini-2.5-flash (default), gemini-2.5-pro, claude-haiku-4-5-20251001, claude-sonnet-4-6"
    ),
});

const buscarInput = z.object({
  query: z.string().min(1).describe("Texto de búsqueda"),
  top_k: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Cantidad de chunks a recuperar (default: 10)"),
});

const historialInput = z.object({
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Página (default: 1)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Registros por página (default: 20)"),
});

export function registerMinervaTools(
  server: McpServer,
  api: KairoApiClient,
  env: LoadedEnv
): void {
  server.registerTool(
    "zyta_minerva_login",
    {
      description:
        "Login para usar Minerva desde Cursor. Obligatorio antes de consultar, historial o uso. " +
        "Opciones: email+password (recomendado mientras /mcp-device no esté en prod); access_token manual; " +
        "device flow (navegador). Alias de zyta_login orientado a Minerva.",
      inputSchema: loginInputSchema,
    },
    async (args) =>
      executeLogin(args, {
        pendingHint:
          " Si /mcp-device da 404, usá zyta_minerva_login con email+password o npx zyta-mcp-login.",
        successMessage: "Sesión Minerva OK. Token guardado.",
        credentialsMessage: "Sesión Minerva OK (email/contraseña). Token guardado.",
      })
  );

  server.registerTool(
    "zyta_minerva_auth_status",
    {
      description:
        "Estado de sesión para Minerva: token MCP, usuario y cuota mensual (GET /minerva/uso). " +
        "Si no hay sesión, indica cómo llamar a zyta_minerva_login.",
    },
    async () => {
      const base = {
        baseUrl: env.baseUrl,
        tokenSource: getTokenSource(),
        hasToken: hasToken(),
        tokenFileHint:
          getTokenSource() === "file" || getTokenSource() === "memory"
            ? `Token en ${getTokenFilePath()}`
            : getTokenSource() === "env"
              ? "Token desde KAIRO_API_TOKEN / ZYTA_API_TOKEN"
              : "Sin token — llamá a zyta_minerva_login",
      };

      if (!hasToken()) {
        return jsonResult({
          ok: false,
          authenticated: false,
          ...base,
          loginHint: MINERVA_AUTH_HINT,
        });
      }

      try {
        const token = await ensureToken();
        const [user, uso] = await Promise.all([
          fetchCurrentUser(token),
          api.get<unknown>("/minerva/uso").catch(() => null),
        ]);
        return jsonResult({
          ok: true,
          authenticated: true,
          ...base,
          user,
          minervaUso: uso,
        });
      } catch (e) {
        return jsonResult({
          ok: false,
          authenticated: false,
          ...base,
          loginHint: MINERVA_AUTH_HINT,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  );

  server.registerTool(
    "zyta_minerva_consultar",
    {
      description:
        "Consulta jurídica completa: busca fallos relevantes (RAG) + agrega marco normativo curado + genera respuesta con IA. " +
        "Queda registrada en el historial Minerva del usuario (visible en el dashboard). " +
        "Requiere zyta_minerva_login. POST /minerva/consultar",
      inputSchema: consultaInput,
    },
    async (args) => {
      try {
        const data = await api.post<unknown>("/minerva/consultar", args);
        return jsonResult(data);
      } catch (e) {
        return minervaToolError(e);
      }
    }
  );

  server.registerTool(
    "zyta_minerva_buscar_fallos",
    {
      description:
        "Busca fallos relevantes en la base jurisprudencial sin generar respuesta IA. " +
        "Requiere zyta_minerva_login. POST /minerva/buscar",
      inputSchema: buscarInput,
    },
    async (args) => {
      try {
        const data = await api.post<unknown>("/minerva/buscar", args);
        return jsonResult(data);
      } catch (e) {
        return minervaToolError(e);
      }
    }
  );

  server.registerTool(
    "zyta_minerva_historial",
    {
      description:
        "Historial paginado de consultas Minerva del usuario autenticado. Requiere zyta_minerva_login. " +
        "GET /minerva/historial",
      inputSchema: historialInput,
    },
    async (args) => {
      try {
        const params = new URLSearchParams();
        if (args.page != null) params.set("page", String(args.page));
        if (args.limit != null) params.set("limit", String(args.limit));
        const qs = params.toString();
        const data = await api.get<unknown>(
          qs ? `/minerva/historial?${qs}` : "/minerva/historial"
        );
        return jsonResult(data);
      } catch (e) {
        return minervaToolError(e);
      }
    }
  );

  server.registerTool(
    "zyta_minerva_uso",
    {
      description:
        "Uso mensual de Minerva: costo acumulado, límite del plan y saldo restante. " +
        "Requiere zyta_minerva_login. GET /minerva/uso",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.get<unknown>("/minerva/uso");
        return jsonResult(data);
      } catch (e) {
        return minervaToolError(e);
      }
    }
  );
}
