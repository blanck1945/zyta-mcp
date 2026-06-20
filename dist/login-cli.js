#!/usr/bin/env node
/**
 * Login interactivo: POST /auth/login → guarda JWT en ~/.zyta-mcp/token
 * Uso: definir KAIRO_API_BASE_URL (o ZYTA) y ejecutar `npm run login`
 */
import prompts from "prompts";
import { fetchAccessToken } from "./auth/loginApi.js";
import { getDefaultTokenFilePath, saveTokenToFile, } from "./tokenStore.js";
function getBaseUrlFromEnv() {
    const a = process.env.KAIRO_API_BASE_URL?.trim();
    const b = process.env.ZYTA_API_BASE_URL?.trim();
    return a || b || undefined;
}
async function main() {
    let baseUrl = getBaseUrlFromEnv();
    if (!baseUrl) {
        const r = await prompts({
            type: "text",
            name: "baseUrl",
            message: "URL base del API (sin barra final)",
            validate: (v) => v.trim().length > 0 ? true : "Requerido",
        });
        if (!r.baseUrl) {
            console.error("Cancelado.");
            process.exit(1);
        }
        baseUrl = String(r.baseUrl).trim();
    }
    const creds = await prompts([
        {
            type: "text",
            name: "email",
            message: "Email",
            validate: (v) => v.trim().length > 0 ? true : "Requerido",
        },
        {
            type: "password",
            name: "password",
            message: "Contraseña",
            validate: (v) => (v?.length ?? 0) > 0 ? true : "Requerido",
        },
    ]);
    if (!creds.email || creds.password === undefined) {
        console.error("Cancelado.");
        process.exit(1);
    }
    const token = await fetchAccessToken(baseUrl, String(creds.email).trim(), creds.password);
    const outPath = process.env.KAIRO_TOKEN_FILE?.trim() ||
        process.env.ZYTA_TOKEN_FILE?.trim() ||
        getDefaultTokenFilePath();
    saveTokenToFile(outPath, token);
    console.log("Login OK. Token guardado en:", outPath);
    console.log("En Cursor podés dejar solo KAIRO_API_BASE_URL en el MCP (sin pegar el JWT en la config).");
}
main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});
