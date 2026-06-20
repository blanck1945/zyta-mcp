/**
 * Cliente HTTP mínimo hacia el API Zyta (Bearer JWT vía session).
 */

import { ensureToken } from "./session.js";

export class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiHttpError";
  }
}

export class KairoApiClient {
  constructor(private readonly baseUrl: string) {}

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const token = await ensureToken();
    const p = path.startsWith("/") ? path : `/${path}`;
    const url = `${this.baseUrl}${p}`;

    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers as Record<string, string>),
      },
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const j = (await res.json()) as Record<string, unknown>;
        if (typeof j.message === "string") {
          detail = j.message;
        } else if (typeof j.error === "string") {
          detail = j.error;
        } else {
          detail = JSON.stringify(j);
        }
      } catch {
        try {
          const t = await res.text();
          if (t) detail = t.slice(0, 2000);
        } catch {
          /* ignore */
        }
      }
      throw new ApiHttpError(res.status, detail.slice(0, 2000));
    }

    if (res.status === 204) {
      return undefined as T;
    }

    const text = await res.text();
    if (!text) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }
}
