#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { KairoApiClient } from "./apiClient.js";
import { loadEnv, type LoadedEnv } from "./env.js";
import { registerAuthTools } from "./tools/auth.js";
import { registerJudicialTools } from "./tools/judicial.js";
import { registerJurisprudenciaTools } from "./tools/jurisprudencia.js";
import { registerTrademarksTools } from "./tools/trademarks.js";
import { registerMinervaTools } from "./tools/minerva.js";

async function main(): Promise<void> {
  let env: LoadedEnv;
  try {
    env = loadEnv();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[zyta-mcp]", msg);
    process.exit(1);
    return;
  }

  const api = new KairoApiClient(env.baseUrl);

  const server = new McpServer(
    { name: "zyta-mcp", version: "1.2.0" },
    {
      instructions:
        "Herramientas para consultar el API Zyta (judicial, jurisprudencia, marcas, Minerva). " +
        "Autenticación: zyta_login con email+password, access_token, o device flow (requiere /mcp-device en el dashboard). " +
        "Alternativa en terminal: npx zyta-mcp-login. " +
        "Minerva: zyta_minerva_consultar, zyta_minerva_buscar_fallos, zyta_minerva_historial, zyta_minerva_uso. " +
        "No expone credenciales de portales al modelo.",
    }
  );

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
