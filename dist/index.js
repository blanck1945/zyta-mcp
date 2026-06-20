#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { KairoApiClient } from "./apiClient.js";
import { loadEnv } from "./env.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerJudicialTools } from "./tools/judicial.js";
import { registerJurisprudenciaTools } from "./tools/jurisprudencia.js";
import { registerTrademarksTools } from "./tools/trademarks.js";
import { registerMinervaTools } from "./tools/minerva.js";
async function main() {
    let env;
    try {
        env = loadEnv();
    }
    catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[zyta-mcp]", msg);
        process.exit(1);
        return;
    }
    const api = new KairoApiClient(env.baseUrl, env.token);
    const server = new McpServer({ name: "zyta-mcp", version: "1.0.0" }, {
        instructions: "Herramientas para consultar el API Kairo/Zyta (judicial, jurisprudencia, marcas, Minerva). " +
            "Incluye registrar actuaciones en causas sin portal desde mensaje (zyta_judicial_cursor_registrar_actuacion). " +
            "Minerva: zyta_minerva_consultar (consulta con IA), zyta_minerva_buscar_fallos (solo RAG), " +
            "zyta_minerva_historial (historial del usuario), zyta_minerva_uso (budget mensual). " +
            "Autenticación: JWT vía KAIRO_API_TOKEN o archivo tras `npm run login`. No expone credenciales de portales al modelo.",
    });
    registerAuthTools(server, env);
    registerJudicialTools(server, api);
    registerJurisprudenciaTools(server, api);
    registerTrademarksTools(server, api);
    registerMinervaTools(server, api);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((e) => {
    console.error("[zyta-mcp] Error fatal:", e instanceof Error ? e.message : e);
    process.exit(1);
});
