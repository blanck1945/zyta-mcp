import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApiHttpError } from "./apiClient.js";

const MAX_JSON_CHARS = 400_000;

export function jsonResult(data: unknown): CallToolResult {
  const s = JSON.stringify(data, null, 2);
  const text =
    s.length > MAX_JSON_CHARS
      ? `${s.slice(0, MAX_JSON_CHARS)}\n\n…[respuesta truncada; reducí limit/offset o el alcance de la consulta]`
      : s;
  return { content: [{ type: "text", text }] };
}

export function toolError(err: unknown): CallToolResult {
  if (err instanceof ApiHttpError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error HTTP ${err.status}: ${err.message}`,
        },
      ],
    };
  }
  const msg = err instanceof Error ? err.message : String(err);
  return {
    isError: true,
    content: [{ type: "text", text: msg }],
  };
}
