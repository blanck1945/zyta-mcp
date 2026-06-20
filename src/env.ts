/**
 * Resuelve URL base del API y JWT (env o archivo). No registrar valores en logs.
 */

import {
  getDefaultTokenFilePath,
  readTokenFromFile,
} from "./tokenStore.js";

export type TokenSource = "env" | "file";

export interface LoadedEnv {
  baseUrl: string;
  token: string;
  tokenSource: TokenSource;
}

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export function loadEnv(): LoadedEnv {
  const baseRaw =
    process.env.KAIRO_API_BASE_URL?.trim() ||
    process.env.ZYTA_API_BASE_URL?.trim();
  if (!baseRaw) {
    throw new Error(
      "Falta KAIRO_API_BASE_URL o ZYTA_API_BASE_URL (URL del backend, sin barra final)."
    );
  }

  const baseUrl = normalizeBaseUrl(baseRaw);

  const tokenFromEnv =
    process.env.KAIRO_API_TOKEN?.trim() ||
    process.env.ZYTA_API_TOKEN?.trim();
  if (tokenFromEnv) {
    return {
      baseUrl,
      token: tokenFromEnv,
      tokenSource: "env",
    };
  }

  const tokenPath =
    process.env.KAIRO_TOKEN_FILE?.trim() ||
    process.env.ZYTA_TOKEN_FILE?.trim() ||
    getDefaultTokenFilePath();

  const tokenFromFile = readTokenFromFile(tokenPath);
  if (!tokenFromFile) {
    throw new Error(
      `No hay token: definí KAIRO_API_TOKEN, o ejecutá \`npm run login\` en el repo (guarda el JWT en ${tokenPath}).`
    );
  }

  return {
    baseUrl,
    token: tokenFromFile,
    tokenSource: "file",
  };
}
