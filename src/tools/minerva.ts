import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v3";
import type { KairoApiClient } from "../apiClient.js";
import { jsonResult, toolError } from "../toolResult.js";

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
  api: KairoApiClient
): void {
  // Consulta completa: marco normativo + RAG + LLM → persiste en historial del usuario
  server.registerTool(
    "zyta_minerva_consultar",
    {
      description:
        "Consulta jurídica completa: busca fallos relevantes (RAG) + agrega marco normativo curado + genera respuesta con IA. " +
        "Queda registrada en el historial Minerva del usuario (visible en el dashboard). " +
        "POST /minerva/consultar",
      inputSchema: consultaInput,
    },
    async (args) => {
      try {
        const data = await api.post<unknown>("/minerva/consultar", args);
        return jsonResult(data);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // Solo RAG, sin LLM — para explorar qué fallos hay sobre un tema
  server.registerTool(
    "zyta_minerva_buscar_fallos",
    {
      description:
        "Busca fallos relevantes en la base jurisprudencial sin generar respuesta IA. " +
        "Útil para explorar qué jurisprudencia existe sobre un tema antes de hacer una consulta completa. " +
        "POST /minerva/buscar",
      inputSchema: buscarInput,
    },
    async (args) => {
      try {
        const data = await api.post<unknown>("/minerva/buscar", args);
        return jsonResult(data);
      } catch (e) {
        return toolError(e);
      }
    }
  );

  // Historial paginado del usuario
  server.registerTool(
    "zyta_minerva_historial",
    {
      description:
        "Devuelve el historial paginado de consultas Minerva del usuario autenticado, del más reciente al más antiguo. " +
        "Incluye query, respuesta, fuentes y tokens usados por consulta. " +
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
        return toolError(e);
      }
    }
  );

  // Uso mensual y budget restante
  server.registerTool(
    "zyta_minerva_uso",
    {
      description:
        "Muestra el uso mensual de Minerva del usuario: costo acumulado en USD, límite del plan y saldo restante. " +
        "GET /minerva/uso",
      inputSchema: z.object({}),
    },
    async () => {
      try {
        const data = await api.get<unknown>("/minerva/uso");
        return jsonResult(data);
      } catch (e) {
        return toolError(e);
      }
    }
  );
}
