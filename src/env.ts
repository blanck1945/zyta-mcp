/**
 * Resuelve URL base del API. El token se gestiona vía session.ts (login MCP o archivo).
 */

import { bootstrapSession, getBaseUrl, getTokenFilePath, getTokenSource, hasToken } from "./session.js";

export type { TokenSource } from "./session.js";

export interface LoadedEnv {
  baseUrl: string;
  tokenSource: ReturnType<typeof getTokenSource>;
  hasToken: boolean;
  tokenFilePath: string;
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

  bootstrapSession(baseRaw);

  return {
    baseUrl: getBaseUrl(),
    tokenSource: getTokenSource(),
    hasToken: hasToken(),
    tokenFilePath: getTokenFilePath(),
  };
}
