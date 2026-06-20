export const DEFAULT_MINERVA_APP_URL = "https://minerva.zyta.app";
export function resolveMinervaAppUrl() {
    return (process.env.ZYTA_MINERVA_APP_URL?.trim() ||
        process.env.KAIRO_MINERVA_APP_URL?.trim() ||
        DEFAULT_MINERVA_APP_URL).replace(/\/+$/, "");
}
export function buildVerificationUrls(userCode, override) {
    const base = override.verifyBaseUrl?.trim().replace(/\/+$/, "");
    if (!base)
        return null;
    const pathRaw = (override.verifyPath ?? "/mcp-device").trim() || "/mcp-device";
    const path = pathRaw.startsWith("/") ? pathRaw : `/${pathRaw}`;
    const verificationUri = `${base}${path}`;
    const verificationUriComplete = `${verificationUri}?user_code=${encodeURIComponent(userCode)}`;
    return { verificationUri, verificationUriComplete };
}
export function applyVerificationOverride(pending, override) {
    const rewritten = override
        ? buildVerificationUrls(pending.userCode, override)
        : null;
    if (rewritten)
        return rewritten;
    return {
        verificationUri: pending.verificationUri,
        verificationUriComplete: pending.verificationUriComplete?.trim() || pending.verificationUri,
    };
}
