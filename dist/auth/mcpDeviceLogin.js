import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import open from "open";
import { applyVerificationOverride, } from "./deviceVerifyUrl.js";
import { pollDeviceTokenOnce, startDeviceAuthorization, } from "./deviceFlow.js";
import { userLabelFromProfile, writeDeviceAuthComplete } from "./cursorNotify.js";
const DEVICE_POLL_BUDGET_MS = 120_000;
function pendingPath() {
    return path.join(os.homedir(), ".zyta-mcp", "device-pending.json");
}
function readPending() {
    try {
        const raw = fs.readFileSync(pendingPath(), "utf8");
        const data = JSON.parse(raw);
        if (data.expiresAt <= Date.now())
            return null;
        return data;
    }
    catch {
        return null;
    }
}
function writePending(pending) {
    const dir = path.dirname(pendingPath());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(pendingPath(), JSON.stringify(pending, null, 2), "utf8");
}
export function clearPendingDevice() {
    try {
        fs.unlinkSync(pendingPath());
    }
    catch {
        /* ignore */
    }
}
function buildFlowOptions(baseUrl) {
    const authPath = process.env.KAIRO_MCP_DEVICE_AUTH_PATH?.trim() ||
        process.env.ZYTA_MCP_DEVICE_AUTH_PATH?.trim();
    const tokenPath = process.env.KAIRO_MCP_DEVICE_TOKEN_PATH?.trim() ||
        process.env.ZYTA_MCP_DEVICE_TOKEN_PATH?.trim();
    const clientId = process.env.KAIRO_MCP_CLIENT_ID?.trim() ||
        process.env.ZYTA_MCP_CLIENT_ID?.trim();
    return {
        baseUrl,
        ...(authPath ? { deviceAuthPath: authPath } : {}),
        ...(tokenPath ? { deviceTokenPath: tokenPath } : {}),
        ...(clientId ? { clientId } : {}),
    };
}
async function fetchUserProfile(baseUrl, token) {
    try {
        const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/users`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!res.ok)
            return null;
        return res.json();
    }
    catch {
        return null;
    }
}
async function pollWithBudget(flowOpts, pending) {
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
        if (result.status === "pending")
            continue;
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
 * Login estilo `gh auth login`: abre el navegador en la página de verificación y hace polling.
 * `verifyOverride` permite apuntar a Minerva (minerva.zyta.app) en lugar del dashboard.
 */
export async function runDeviceLogin(baseUrl, verifyOverride) {
    const flowOpts = buildFlowOptions(baseUrl);
    let pending = readPending();
    if (!pending || pending.baseUrl !== baseUrl || pending.expiresAt <= Date.now()) {
        const session = await startDeviceAuthorization(flowOpts);
        const urls = applyVerificationOverride({
            userCode: session.userCode,
            verificationUri: session.verificationUri,
            verificationUriComplete: session.verificationUriComplete,
        }, verifyOverride);
        pending = {
            baseUrl,
            deviceCode: session.deviceCode,
            userCode: session.userCode,
            verificationUri: urls.verificationUri,
            verificationUriComplete: urls.verificationUriComplete,
            expiresAt: Date.now() + session.expiresIn * 1000,
            intervalSec: session.intervalSec,
        };
        writePending(pending);
        const toOpen = pending.verificationUriComplete?.trim() || pending.verificationUri;
        try {
            await open(toOpen);
        }
        catch {
            /* el agente puede mostrar la URL al usuario */
        }
    }
    else if (verifyOverride?.verifyBaseUrl) {
        const urls = applyVerificationOverride(pending, verifyOverride);
        pending = {
            ...pending,
            verificationUri: urls.verificationUri,
            verificationUriComplete: urls.verificationUriComplete,
        };
        writePending(pending);
    }
    const poll = await pollWithBudget(flowOpts, pending);
    if (poll.ok) {
        clearPendingDevice();
        const user = await fetchUserProfile(baseUrl, poll.accessToken);
        const { userName, userEmail } = userLabelFromProfile(user);
        writeDeviceAuthComplete({
            authorizedAt: new Date().toISOString(),
            userName,
            userEmail,
            clientLabel: process.env.ZYTA_MCP_CLIENT_LABEL?.trim() || "Agente MCP",
            source: "mcp",
        });
        return { ok: true, accessToken: poll.accessToken, user };
    }
    if (poll.pending) {
        const minutesLeft = Math.max(1, Math.round((pending.expiresAt - Date.now()) / 60000));
        const verificationUriComplete = pending.verificationUriComplete?.trim() || pending.verificationUri;
        return {
            ok: false,
            pending: true,
            message: `Autorizá en el navegador: ${verificationUriComplete} ` +
                `(código ${pending.userCode}). Expira en ~${minutesLeft} min. ` +
                `Cuando confirmes en la web, el agente completará la sesión automáticamente.`,
            verificationUriComplete,
            userCode: pending.userCode,
        };
    }
    return { ok: false, pending: false, message: poll.message };
}
