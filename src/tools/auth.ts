import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LoadedEnv } from "../env.js";
import { jsonResult } from "../toolResult.js";

export function registerAuthTools(
  server: McpServer,
  env: LoadedEnv
): void {
  server.registerTool(
    "zyta_auth_status",
    {
      description:
        "Indica si el MCP tiene token configurado (variable de entorno o archivo) y la URL base del API. No muestra el token.",
    },
    async () => {
      return jsonResult({
        ok: true,
        baseUrl: env.baseUrl,
        tokenSource: env.tokenSource,
        tokenFileHint:
          env.tokenSource === "file"
            ? "Token leído desde archivo (ver KAIRO_TOKEN_FILE o ~/.zyta-mcp/token)"
            : "Token desde KAIRO_API_TOKEN / ZYTA_API_TOKEN",
      });
    }
  );
}
