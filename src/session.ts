import {
  getDefaultTokenFilePath,
  readTokenFromFile,
  saveTokenToFile,
} from "./tokenStore.js";

export type TokenSource = "env" | "file" | "memory" | "none";

export class AuthRequiredError extends Error {
  constructor(detail?: string) {
    super(
      detail ??
        "Sin sesión activa. Usá la herramienta `zyta_login` para autorizar el agente (abre el navegador en Zyta)."
    );
    this.name = "AuthRequiredError";
  }
}

let baseUrl = "";
let memoryToken: string | null = null;

export function initSession(url: string): void {
  baseUrl = url.replace(/\/+$/, "");
}

export function getBaseUrl(): string {
  if (!baseUrl) {
    throw new Error("Sesión no inicializada (falta KAIRO_API_BASE_URL).");
  }
  return baseUrl;
}

function tokenFromEnv(): string | null {
  const t =
    process.env.KAIRO_API_TOKEN?.trim() ||
    process.env.ZYTA_API_TOKEN?.trim();
  return t && t.length > 0 ? t : null;
}

function tokenFilePath(): string {
  return (
    process.env.KAIRO_TOKEN_FILE?.trim() ||
    process.env.ZYTA_TOKEN_FILE?.trim() ||
    getDefaultTokenFilePath()
  );
}

export function getTokenFilePath(): string {
  return tokenFilePath();
}

export function readPersistedToken(): string | null {
  return readTokenFromFile(tokenFilePath());
}

export function bootstrapSession(url: string): void {
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

export function setToken(token: string, persist = true): void {
  memoryToken = token.trim();
  if (persist) {
    saveTokenToFile(tokenFilePath(), memoryToken);
  }
}

export function clearSession(): void {
  memoryToken = null;
}

export function getTokenSource(): TokenSource {
  if (tokenFromEnv()) return "env";
  if (readPersistedToken()) return "file";
  if (memoryToken) return "memory";
  return "none";
}

export function hasToken(): boolean {
  return !!(memoryToken || tokenFromEnv() || readPersistedToken());
}

export async function validateToken(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/users`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureToken(): Promise<string> {
  const candidates = [
    memoryToken,
    tokenFromEnv(),
    readPersistedToken(),
  ].filter((t): t is string => !!t);

  for (const token of candidates) {
    if (await validateToken(token)) {
      memoryToken = token;
      return token;
    }
  }

  memoryToken = null;
  throw new AuthRequiredError();
}

export async function fetchCurrentUser(token: string): Promise<unknown> {
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
