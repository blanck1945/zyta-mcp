#!/usr/bin/env node
/**
 * Login por OAuth 2.0 Device Authorization (RFC 8628).
 * El usuario aprueba en el navegador; nada pasa por el chat del LLM.
 *
 * Requiere que el backend implemente los endpoints en docs/BACKEND_MCP_AUTH_SPEC.md
 */
import { openBrowser } from "./auth/browser.js";
import {
  pollDeviceUntilAccessToken,
  startDeviceAuthorization,
  type DeviceFlowOptions,
} from "./auth/deviceFlow.js";
import { resolveMinervaAppUrl } from "./auth/deviceVerifyUrl.js";
import { runDeviceLogin } from "./auth/mcpDeviceLogin.js";
import {
  getDefaultTokenFilePath,
  saveTokenToFile,
} from "./tokenStore.js";

function getBaseUrlFromEnv(): string | undefined {
  const a = process.env.KAIRO_API_BASE_URL?.trim();
  const b = process.env.ZYTA_API_BASE_URL?.trim();
  return a || b || undefined;
}

function buildFlowOptions(baseUrl: string): DeviceFlowOptions {
  const authPath =
    process.env.KAIRO_MCP_DEVICE_AUTH_PATH?.trim() ||
    process.env.ZYTA_MCP_DEVICE_AUTH_PATH?.trim();
  const tokenPath =
    process.env.KAIRO_MCP_DEVICE_TOKEN_PATH?.trim() ||
    process.env.ZYTA_MCP_DEVICE_TOKEN_PATH?.trim();
  const clientId =
    process.env.KAIRO_MCP_CLIENT_ID?.trim() ||
    process.env.ZYTA_MCP_CLIENT_ID?.trim();

  return {
    baseUrl,
    ...(authPath ? { deviceAuthPath: authPath } : {}),
    ...(tokenPath ? { deviceTokenPath: tokenPath } : {}),
    ...(clientId ? { clientId } : {}),
  };
}

async function main(): Promise<void> {
  const baseUrl = getBaseUrlFromEnv();
  if (!baseUrl) {
    console.error(
      "Definí KAIRO_API_BASE_URL (o ZYTA_API_BASE_URL) antes de ejecutar login:device."
    );
    process.exit(1);
  }

  const flowOpts = buildFlowOptions(baseUrl);
  const outPath =
    process.env.KAIRO_TOKEN_FILE?.trim() ||
    process.env.ZYTA_TOKEN_FILE?.trim() ||
    getDefaultTokenFilePath();

  const minervaOverride = process.env.ZYTA_MINERVA_APP_URL?.trim() ||
    process.env.KAIRO_MINERVA_APP_URL?.trim()
    ? {
        verifyBaseUrl: resolveMinervaAppUrl(),
        verifyPath: "/mcp-device",
        retryToolName: "zyta_minerva_login",
      }
    : undefined;

  if (minervaOverride) {
    console.log("Modo Minerva: verificación en", resolveMinervaAppUrl(), "/mcp-device");
    const result = await runDeviceLogin(baseUrl, minervaOverride);
    if (result.ok) {
      saveTokenToFile(outPath, result.accessToken);
      console.log("Listo. Token guardado en:", outPath);
      return;
    }
    if (result.pending) {
      console.error(result.message);
      process.exit(1);
    }
    console.error(result.message);
    process.exit(1);
  }

  console.log("Solicitando código de dispositivo al servidor…");
  const session = await startDeviceAuthorization(flowOpts);

  console.log("\n---");
  console.log("Código para el usuario:", session.userCode);
  console.log("Abrí en el navegador la página de verificación e iniciá sesión.");
  console.log("---\n");

  const toOpen =
    session.verificationUriComplete?.trim() || session.verificationUri;
  try {
    openBrowser(toOpen);
  } catch {
    console.log("No se pudo abrir el navegador automáticamente. URL:\n", toOpen);
  }

  console.log("Esperando confirmación (no cierres esta ventana)…\n");

  const accessToken = await pollDeviceUntilAccessToken(flowOpts, session);

  saveTokenToFile(outPath, accessToken);

  console.log("Listo. Token guardado en:", outPath);
  console.log(
    "En Cursor podés usar solo KAIRO_API_BASE_URL en la config MCP (sin JWT en el JSON)."
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
