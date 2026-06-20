/**
 * Cliente HTTP mínimo hacia el API Zyta (Bearer JWT vía session).
 */
import { ensureToken } from "./session.js";
export class ApiHttpError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "ApiHttpError";
    }
}
export class KairoApiClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async get(path) {
        return this.request(path, { method: "GET" });
    }
    async post(path, body) {
        return this.request(path, {
            method: "POST",
            body: JSON.stringify(body),
        });
    }
    async request(path, init) {
        const token = await ensureToken();
        const p = path.startsWith("/") ? path : `/${path}`;
        const url = `${this.baseUrl}${p}`;
        const res = await fetch(url, {
            ...init,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...init.headers,
            },
        });
        if (!res.ok) {
            let detail = res.statusText;
            try {
                const j = (await res.json());
                if (typeof j.message === "string") {
                    detail = j.message;
                }
                else if (typeof j.error === "string") {
                    detail = j.error;
                }
                else {
                    detail = JSON.stringify(j);
                }
            }
            catch {
                try {
                    const t = await res.text();
                    if (t)
                        detail = t.slice(0, 2000);
                }
                catch {
                    /* ignore */
                }
            }
            throw new ApiHttpError(res.status, detail.slice(0, 2000));
        }
        if (res.status === 204) {
            return undefined;
        }
        const text = await res.text();
        if (!text) {
            return undefined;
        }
        return JSON.parse(text);
    }
}
