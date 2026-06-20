import { z } from "zod/v3";
import { jsonResult, toolError } from "../toolResult.js";
const trademarksSearchInput = z.object({
    q: z.string().optional().describe("Texto de búsqueda"),
    classes: z
        .string()
        .optional()
        .describe("Clases Niza u otro filtro de clases según el API"),
    from: z.string().optional().describe("Fecha desde (formato del API)"),
    to: z.string().optional().describe("Fecha hasta (formato del API)"),
    limit: z.number().int().positive().optional().describe("Límite de resultados"),
    offset: z.number().int().min(0).optional().describe("Desplazamiento para paginación"),
});
export function registerTrademarksTools(server, api) {
    server.registerTool("zyta_trademarks_search", {
        description: "Búsqueda de marcas en el histórico de boletines INPI. GET /trademarks/search",
        inputSchema: trademarksSearchInput,
    }, async (args) => {
        try {
            const parts = [];
            if (args.q !== undefined) {
                parts.push(`q=${encodeURIComponent(args.q)}`);
            }
            if (args.classes !== undefined) {
                parts.push(`classes=${encodeURIComponent(args.classes)}`);
            }
            if (args.from !== undefined) {
                parts.push(`from=${encodeURIComponent(args.from)}`);
            }
            if (args.to !== undefined) {
                parts.push(`to=${encodeURIComponent(args.to)}`);
            }
            if (args.limit !== undefined) {
                parts.push(`limit=${String(args.limit)}`);
            }
            if (args.offset !== undefined) {
                parts.push(`offset=${String(args.offset)}`);
            }
            const query = parts.length ? `?${parts.join("&")}` : "";
            const data = await api.get(`/trademarks/search${query}`);
            return jsonResult(data);
        }
        catch (e) {
            return toolError(e);
        }
    });
}
