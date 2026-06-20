import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import open from "open";
import {
  pollDeviceTokenOnce,
  startDeviceAuthorization,
  type DeviceFlowOptions,
} from "./deviceFlow.js";

const DEVICE_POLL_BUDGET_MS = 45_000;

export type PendingDevice = {
  baseUrl: string;
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  verificationUriComplete?: string;
  expiresAt: number;
  intervalSec: number;
};

export type DeviceLoginResult =
  | {
      ok: true;
      accessToken: string;
      user: unknown | null;
    }
  | {
      ok: false;
      pending: true;
      message: string;
      verificationUriComplete: string;
      userCode: string;
    }
  | {
      ok: false;
      pending: false;
      message: string;
    };

function pendingPath(): string {
  return path.join(os.homedir(), ".zyta-mcp", "device-pending.json");
}

function readPending(): PendingDevice | null {
  try {
    const raw = fs.readFileSync(pendingPath(), "utf8");
    const data = JSON.parse(raw) as PendingDevice;
    if (data.expiresAt <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function writePending(pending: PendingDevice): void {
  const dir = path.dirname(pendingPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(pendingPath(), JSON.stringify(pending, null, 2), "utf8");
}

export function clearPendingDevice(): void {
  try {
    fs.unlinkSync(pendingPath());
  } catch {
    /* ignore */
  }
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

async function fetchUserProfile(
  baseUrl: string,
  token: string
): Promise<unknown | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/users`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function pollWithBudget(
  flowOpts: DeviceFlowOptions,
  pending: PendingDevice
): Promise<
  | { ok: true; accessToken: string }
  | { ok: false; pending: true }
  | { ok: false; pending: false; message: string }
> {
  const deadline = Date.now() + DEVICE_POLL_BUDGET_MS;
  let intervalMs = Math.max(pending.intervalSec, 1) * 1000;
  let first = true;

  while (Date.now() < deadline) {
    if (!first) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    first = false;

    const result = await pollDeviceTokenOnce(flowOpts, pending.deviceCode);
    if (result.status === "ok") {
      return { ok: true, accessToken: result.accessToken };
    }
    if (result.status === "pending") continue;
    if (result.status === "slow_down") {
      intervalMs += 5000;
      continue;
    }
    clearPendingDevice();
    return { ok: false, pending: false, message: result.error };
  }

  return { ok: false, pending: true };
}

/**
 * Login estilo `gh auth login`: abre el navegador en la página de Zyta y hace polling.
 */
export async function runDeviceLogin(baseUrl: string): Promise<DeviceLoginResult> {
  const flowOpts = buildFlowOptions(baseUrl);
  let pending = readPending();

  if (!pending || pending.baseUrl !== baseUrl || pending.expiresAt <= Date.now()) {
    const session = await startDeviceAuthorization(flowOpts);
    pending = {
      baseUrl,
      deviceCode: session.deviceCode,
      userCode: session.userCode,
      verificationUri: session.verificationUri,
      verificationUriComplete: session.verificationUriComplete,
      expiresAt: Date.now() + session.expiresIn * 1000,
      intervalSec: session.intervalSec,
    };
    writePending(pending);

    const toOpen =
      pending.verificationUriComplete?.trim() || pending.verificationUri;
    try {
      await open(toOpen);
    } catch {
      /* el agente puede mostrar la URL al usuario */
    }
  }

  const poll = await pollWithBudget(flowOpts, pending);

  if (poll.ok) {
    clearPendingDevice();
    const user = await fetchUserProfile(baseUrl, poll.accessToken);
    return { ok: true, accessToken: poll.accessToken, user };
  }

  if (poll.pending) {
    const minutesLeft = Math.max(
      1,
      Math.round((pending.expiresAt - Date.now()) / 60000)
    );
    const verificationUriComplete =
      pending.verificationUriComplete?.trim() || pending.verificationUri;
    return {
      ok: false,
      pending: true,
      message:
        `Abrí ${verificationUriComplete} e iniciá sesión en Zyta para autorizar el agente ` +
        `(código ${pending.userCode}). Expira en ~${minutesLeft} min. ` +
        `Volvé a llamar a zyta_login cuando confirmes.`,
      verificationUriComplete,
      userCode: pending.userCode,
    };
  }

  return { ok: false, pending: false, message: poll.message };
}
