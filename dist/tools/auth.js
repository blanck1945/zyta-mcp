import { z } from "zod/v3";
import { executeLogin, loginInputSchema } from "../auth/loginHandler.js";
import { clearPendingDevice } from "../auth/mcpDeviceLogin.js";
import { clearSession, ensureToken, fetchCurrentUser, getTokenFilePath, getTokenSource, hasToken, } from "../session.js";
import { jsonResult, toolError } from "../toolResult.js";
export function registerAuthTools(server, env) {
    server.registerTool("zyta_login", {
        description: "Obligatorio antes de cualquier otra herramienta si no hay sesión. " +
            "Opciones (en orden): access_token manual; email+password (POST /auth/login); " +
            "device flow (abre navegador en minerva.zyta.app/mcp-device). " +
            "Para Minerva preferí zyta_minerva_login.",
        inputSchema: loginInputSchema,
    }, async (args) => executeLogin(args, {
        pendingHint: " Autorizá en minerva.zyta.app/mcp-device; el agente completará la sesión al confirmar en la web.",
    }));
    server.registerTool("zyta_disconnect", {
        description: "Cierra la sesión del agente MCP (borra token en memoria y el archivo ~/.zyta-mcp/token). No cierra sesión en el navegador.",
        inputSchema: z.object({}),
    }, async () => {
        clearSession();
        clearPendingDevice();
        return jsonResult({
            ok: true,
            message: "Sesión del agente cerrada. Usá zyta_login o zyta_minerva_login para volver a autorizar.",
        });
    });
    server.registerTool("zyta_whoami", {
        description: "Devuelve el usuario asociado al token del agente MCP (GET /users). Requiere sesión activa.",
        inputSchema: z.object({}),
    }, async () => {
        try {
            const token = await ensureToken();
            const user = await fetchCurrentUser(token);
            return jsonResult({ ok: true, user });
        }
        catch (e) {
            return toolError(e);
        }
    });
    server.registerTool("zyta_auth_status", {
        description: "Indica si el MCP tiene token configurado (variable de entorno, archivo o login MCP) y la URL base del API. No muestra el token.",
    }, async () => {
        return jsonResult({
            ok: true,
            baseUrl: env.baseUrl,
            tokenSource: getTokenSource(),
            hasToken: hasToken(),
            tokenFileHint: getTokenSource() === "file" || getTokenSource() === "memory"
                ? `Token en ${getTokenFilePath()} (o memoria tras zyta_login)`
                : getTokenSource() === "env"
                    ? "Token desde KAIRO_API_TOKEN / ZYTA_API_TOKEN"
                    : "Sin token — llamá a zyta_login o zyta_minerva_login",
        });
    });
}
