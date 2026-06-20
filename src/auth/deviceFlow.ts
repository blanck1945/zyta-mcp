/**
 * Cliente del flujo OAuth 2.0 Device Authorization (RFC 8628).
 * Contrato del backend: ver docs/BACKEND_MCP_AUTH_SPEC.md
 */

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

function readField(
  obj: Record<string, unknown>,
  ...keys: string[]
): unknown {
  for (const k of keys) {
    if (k in obj && obj[k] !== undefined && obj[k] !== null) {
      return obj[k];
    }
  }
  return undefined;
}

function readString(
  obj: Record<string, unknown>,
  ...keys: string[]
): string {
  const v = readField(obj, ...keys);
  if (typeof v !== "string" || !v.length) {
    throw new Error(`Campo requerido ausente o inválido: ${keys.join(" / ")}`);
  }
  return v;
}

function readNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  const v = readField(obj, ...keys);
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && /^\d+$/.test(v)) return Number.parseInt(v, 10);
  throw new Error(`Número requerido: ${keys.join(" / ")}`);
}

export interface DeviceAuthorizationSession {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresIn: number;
  intervalSec: number;
}

export interface DeviceFlowOptions {
  baseUrl: string;
  /** Default: /auth/mcp/device-authorization */
  deviceAuthPath?: string;
  /** Default: /auth/mcp/token */
  deviceTokenPath?: string;
  clientId?: string;
}

const DEFAULT_AUTH_PATH = "/auth/mcp/device-authorization";
const DEFAULT_TOKEN_PATH = "/auth/mcp/token";

export async function startDeviceAuthorization(
  opts: DeviceFlowOptions
): Promise<DeviceAuthorizationSession> {
  const path = opts.deviceAuthPath ?? DEFAULT_AUTH_PATH;
  const url = joinUrl(opts.baseUrl, path);
  const body: Record<string, unknown> = {};
  if (opts.clientId) body.clientId = opts.clientId;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `device-authorization: respuesta no JSON (${res.status}): ${text.slice(0, 300)}`
    );
  }

  if (!res.ok) {
    const msg =
      typeof data.message === "string"
        ? data.message
        : text.slice(0, 500);
    throw new Error(`device-authorization falló (${res.status}): ${msg}`);
  }

  const deviceCode = readString(data, "deviceCode", "device_code");
  const userCode = readString(data, "userCode", "user_code");
  const verificationUri = readString(data, "verificationUri", "verification_uri");
  const verificationUriComplete = readField(
    data,
    "verificationUriComplete",
    "verification_uri_complete"
  );
  const expiresIn = readNumber(data, "expiresIn", "expires_in");
  let intervalSec = 5;
  const intervalRaw = readField(data, "interval", "interval_sec");
  if (typeof intervalRaw === "number" && intervalRaw > 0) {
    intervalSec = intervalRaw;
  }

  return {
    deviceCode,
    userCode,
    verificationUri,
    verificationUriComplete:
      typeof verificationUriComplete === "string"
        ? verificationUriComplete
        : undefined,
    expiresIn,
    intervalSec,
  };
}

function parseTokenResponse(data: Record<string, unknown>): string {
  const token = readField(
    data,
    "accessToken",
    "access_token"
  );
  if (typeof token === "string" && token.length > 0) return token;
  throw new Error("Respuesta token sin accessToken / access_token");
}

export async function pollDeviceUntilAccessToken(
  opts: DeviceFlowOptions,
  session: DeviceAuthorizationSession
): Promise<string> {
  const path = opts.deviceTokenPath ?? DEFAULT_TOKEN_PATH;
  const url = joinUrl(opts.baseUrl, path);
  const deadline = Date.now() + session.expiresIn * 1000;
  let intervalMs = Math.max(session.intervalSec, 1) * 1000;
  let firstPoll = true;

  while (Date.now() < deadline) {
    if (!firstPoll) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    firstPoll = false;

    const body = {
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      device_code: session.deviceCode,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(`token: respuesta no JSON (${res.status})`);
    }

    if (res.ok) {
      return parseTokenResponse(data);
    }

    const oauthErr = typeof data.error === "string" ? data.error : "";
    const errMsg =
      oauthErr ||
      (typeof data.message === "string" ? data.message : "") ||
      text.slice(0, 200);

    const normalized = oauthErr.toLowerCase().replace(/\s+/g, "_");

    if (
      oauthErr === "authorization_pending" ||
      normalized === "authorization_pending"
    ) {
      continue;
    }

    if (oauthErr === "slow_down" || normalized === "slow_down") {
      intervalMs += 5000;
      continue;
    }

    if (
      oauthErr === "expired_token" ||
      oauthErr === "access_denied" ||
      normalized === "expired_token" ||
      normalized === "access_denied"
    ) {
      throw new Error(`Flujo cancelado o expirado: ${oauthErr || errMsg}`);
    }

    throw new Error(`token (${res.status}): ${errMsg}`);
  }

  throw new Error("Tiempo de espera agotado: el código de dispositivo expiró.");
}
