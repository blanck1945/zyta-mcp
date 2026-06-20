/**
 * Login sin Bearer — mismo contrato que el dashboard: POST /auth/login
 */
function normalizeBaseUrl(raw) {
    return raw.trim().replace(/\/+$/, "");
}
export async function fetchAccessToken(baseUrl, email, password) {
    const url = `${normalizeBaseUrl(baseUrl)}/auth/login`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    const text = await res.text();
    if (!res.ok) {
        let detail = text.slice(0, 800);
        try {
            const j = JSON.parse(text);
            if (typeof j.message === "string")
                detail = j.message;
        }
        catch {
            /* usar texto crudo */
        }
        throw new Error(`Login falló (${res.status}): ${detail}`);
    }
    let data;
    try {
        data = JSON.parse(text);
    }
    catch {
        throw new Error("Respuesta de login no es JSON válido");
    }
    if (!data.accessToken || typeof data.accessToken !== "string") {
        throw new Error("La respuesta no incluye accessToken");
    }
    return data.accessToken;
}
