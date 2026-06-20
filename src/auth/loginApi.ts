/**
 * Login sin Bearer — mismo contrato que el dashboard: POST /auth/login
 */

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

export async function fetchAccessToken(
  baseUrl: string,
  email: string,
  password: string
): Promise<string> {
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
      const j = JSON.parse(text) as { message?: string };
      if (typeof j.message === "string") detail = j.message;
    } catch {
      /* usar texto crudo */
    }
    throw new Error(`Login falló (${res.status}): ${detail}`);
  }

  let data: { accessToken?: string };
  try {
    data = JSON.parse(text) as { accessToken?: string };
  } catch {
    throw new Error("Respuesta de login no es JSON válido");
  }

  if (!data.accessToken || typeof data.accessToken !== "string") {
    throw new Error("La respuesta no incluye accessToken");
  }
  return data.accessToken;
}
