import { z } from "zod/v3";
import { jsonResult, toolError } from "../toolResult.js";
/**
 * Body alineado a JurisprudenciaSearchRequest del dashboard; `query` obligatorio;
 * el resto se reenvía al backend (passthrough) para no bloquear campos nuevos.
 */
const jurisprudenciaSearchInput = z
    .object({
    query: z.string().min(1).describe("Texto de búsqueda principal"),
})
    .passthrough();
export function registerJurisprudenciaTools(server, api) {
    server.registerTool("zyta_jurisprudencia_search", {
        description: "Búsqueda de fallos y jurisprudencia en fuentes oficiales (puede tardar hasta ~30 s; límite típico 5 req/min). POST /jurisprudencia/search",
        inputSchema: jurisprudenciaSearchInput,
    }, async (args) => {
        try {
            const data = await api.post("/jurisprudencia/search", args);
            return jsonResult(data);
        }
        catch (e) {
            return toolError(e);
        }
    });
}
