import { getDefaultTokenFilePath, readTokenFromFile, saveTokenToFile, } from "./tokenStore.js";
export class AuthRequiredError extends Error {
    constructor(detail) {
        super(detail ??
            "Sin sesión activa. Usá la herramienta `zyta_login` para autorizar el agente (abre el navegador en Zyta).");
        this.name = "AuthRequiredError";
    }
}
let baseUrl = "";
let memoryToken = null;
export function initSession(url) {
    baseUrl = url.replace(/\/+$/, "");
}
export function getBaseUrl() {
    if (!baseUrl) {
        throw new Error("Sesión no inicializada (falta KAIRO_API_BASE_URL).");
    }
    return baseUrl;
}
function tokenFromEnv() {
    const t = process.env.KAIRO_API_TOKEN?.trim() ||
        process.env.ZYTA_API_TOKEN?.trim();
    return t && t.length > 0 ? t : null;
}
function tokenFilePath() {
    return (process.env.KAIRO_TOKEN_FILE?.trim() ||
        process.env.ZYTA_TOKEN_FILE?.trim() ||
        getDefaultTokenFilePath());
}
export function getTokenFilePath() {
    return tokenFilePath();
}
export function readPersistedToken() {
    return readTokenFromFile(tokenFilePath());
}
export function bootstrapSession(url) {
    initSession(url);
    const fromEnv = tokenFromEnv();
    if (fromEnv) {
        memoryToken = fromEnv;
        return;
    }
    const fromFile = readPersistedToken();
    if (fromFile) {
        memoryToken = fromFile;
    }
}
export function setToken(token, persist = true) {
    memoryToken = token.trim();
    if (persist) {
        saveTokenToFile(tokenFilePath(), memoryToken);
    }
}
export function clearSession() {
    memoryToken = null;
}
export function getTokenSource() {
    if (tokenFromEnv())
        return "env";
    if (readPersistedToken())
        return "file";
    if (memoryToken)
        return "memory";
    return "none";
}
export function hasToken() {
    return !!(memoryToken || tokenFromEnv() || readPersistedToken());
}
export async function validateToken(token) {
    try {
        const res = await fetch(`${getBaseUrl()}/users`, {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
            },
        });
        return res.ok;
    }
    catch {
        return false;
    }
}
export async function ensureToken() {
    const candidates = [
        memoryToken,
        tokenFromEnv(),
        readPersistedToken(),
    ].filter((t) => !!t);
    for (const token of candidates) {
        if (await validateToken(token)) {
            memoryToken = token;
            return token;
        }
    }
    memoryToken = null;
    throw new AuthRequiredError();
}
export async function fetchCurrentUser(token) {
    const res = await fetch(`${getBaseUrl()}/users`, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
    });
    if (!res.ok) {
        throw new Error(`No se pudo obtener el perfil (${res.status})`);
    }
    return res.json();
}
