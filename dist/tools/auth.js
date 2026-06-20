import { jsonResult } from "../toolResult.js";
export function registerAuthTools(server, env) {
    server.registerTool("zyta_auth_status", {
        description: "Indica si el MCP tiene token configurado (variable de entorno o archivo) y la URL base del API. No muestra el token.",
    }, async () => {
        return jsonResult({
            ok: true,
            baseUrl: env.baseUrl,
            tokenSource: env.tokenSource,
            tokenFileHint: env.tokenSource === "file"
                ? "Token leído desde archivo (ver KAIRO_TOKEN_FILE o ~/.zyta-mcp/token)"
                : "Token desde KAIRO_API_TOKEN / ZYTA_API_TOKEN",
        });
    });
}
