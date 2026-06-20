import { z } from "zod/v3";
import { runDeviceLogin, clearPendingDevice } from "../auth/mcpDeviceLogin.js";
import { clearSession, ensureToken, fetchCurrentUser, getBaseUrl, getTokenFilePath, getTokenSource, hasToken, setToken, validateToken, } from "../session.js";
import { jsonResult, toolError } from "../toolResult.js";
const loginInput = z.object({
    access_token: z
        .string()
        .optional()
        .describe("JWT manual (alternativa al device flow). También podés usar KAIRO_API_TOKEN en env."),
});
export function registerAuthTools(server, env) {
    server.registerTool("zyta_login", {
        description: "Obligatorio antes de cualquier otra herramienta si no hay sesión. Sin argumentos: abre el navegador en la página de Zyta " +
            "(OAuth device flow, estilo gh auth login). También acepta access_token manualmente. " +
            "Si el login queda pendiente, volvé a llamar esta herramienta tras autorizar en el navegador.",
        inputSchema: loginInput,
    }, async (args) => {
        try {
            const baseUrl = getBaseUrl();
            const manual = args.access_token?.trim() ||
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
                    message: result.message,
                    userCode: result.userCode,
                    verificationUriComplete: result.verificationUriComplete,
                });
            }
            return toolError(new Error(result.message));
        }
        catch (e) {
            return toolError(e);
        }
    });
    server.registerTool("zyta_disconnect", {
        description: "Cierra la sesión del agente MCP (borra token en memoria y el archivo ~/.zyta-mcp/token). No cierra sesión en el navegador.",
        inputSchema: z.object({}),
    }, async () => {
        clearSession();
        clearPendingDevice();
        return jsonResult({
            ok: true,
            message: "Sesión del agente cerrada. Usá zyta_login para volver a autorizar.",
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
                    : "Sin token — llamá a zyta_login",
        });
    });
}
