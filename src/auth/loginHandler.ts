import { z } from "zod/v3";
import { fetchAccessToken } from "./loginApi.js";
import { runDeviceLogin } from "./mcpDeviceLogin.js";
import {
  fetchCurrentUser,
  getBaseUrl,
  getTokenFilePath,
  setToken,
  validateToken,
} from "../session.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { jsonResult, toolError } from "../toolResult.js";

export const loginInputSchema = z.object({
  access_token: z
    .string()
    .optional()
    .describe(
      "JWT manual (alternativa al device flow). También podés usar KAIRO_API_TOKEN en env."
    ),
  email: z
    .string()
    .optional()
    .describe(
      "Email de Zyta. Con password hace POST /auth/login (recomendado si /mcp-device no está desplegado)."
    ),
  password: z
    .string()
    .optional()
    .describe("Contraseña de Zyta. Requiere email."),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export type LoginHandlerOptions = {
  pendingHint?: string;
  successMessage?: string;
  credentialsMessage?: string;
};

export async function executeLogin(
  args: LoginInput,
  options: LoginHandlerOptions = {}
): Promise<CallToolResult> {
  const pendingHint =
    options.pendingHint ??
    " Si /mcp-device da 404, usá email+password o ejecutá: npx zyta-mcp-login";
  const successMessage = options.successMessage ?? "Sesión OK. Token guardado.";
  const credentialsMessage =
    options.credentialsMessage ?? "Sesión OK (email/contraseña). Token guardado.";

  try {
    const baseUrl = getBaseUrl();
    const manual =
      args.access_token?.trim() ||
      process.env.KAIRO_API_TOKEN?.trim() ||
      process.env.ZYTA_API_TOKEN?.trim();

    if (manual) {
      if (!(await validateToken(manual))) {
        return toolError(new Error("El token indicado no es válido o expiró."));
      }
      setToken(manual, true);
      const user = await fetchCurrentUser(manual);
      return jsonResult({
        ok: true,
        message: successMessage,
        baseUrl,
        tokenFile: getTokenFilePath(),
        user,
      });
    }

    const email = args.email?.trim();
    const password = args.password;
    if (email || password !== undefined) {
      if (!email || !password) {
        return toolError(
          new Error("Para login con credenciales indicá email y password juntos.")
        );
      }
      const accessToken = await fetchAccessToken(baseUrl, email, password);
      if (!(await validateToken(accessToken))) {
        return toolError(new Error("Login OK pero el token recibido no es válido."));
      }
      setToken(accessToken, true);
      const user = await fetchCurrentUser(accessToken);
      return jsonResult({
        ok: true,
        message: credentialsMessage,
        baseUrl,
        tokenFile: getTokenFilePath(),
        user,
      });
    }

    const result = await runDeviceLogin(baseUrl);
    if (result.ok) {
      setToken(result.accessToken, true);
      return jsonResult({
        ok: true,
        message: successMessage,
        baseUrl,
        tokenFile: getTokenFilePath(),
        user: result.user,
      });
    }

    if (result.pending) {
      return jsonResult({
        ok: false,
        pending: true,
        message: result.message + pendingHint,
        userCode: result.userCode,
        verificationUriComplete: result.verificationUriComplete,
      });
    }

    return toolError(new Error(result.message));
  } catch (e) {
    return toolError(e);
  }
}
