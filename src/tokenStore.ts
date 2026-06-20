import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const DIR_NAME = ".zyta-mcp";
const FILE_NAME = "token";

/** Ruta por defecto: `~/.zyta-mcp/token` (Windows: `C:\Users\<usuario>\.zyta-mcp\token`). */
export function getDefaultTokenFilePath(): string {
  return path.join(os.homedir(), DIR_NAME, FILE_NAME);
}

export function readTokenFromFile(filePath: string): string | null {
  try {
    const t = fs.readFileSync(filePath, "utf8").trim();
    return t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

export function saveTokenToFile(filePath: string, token: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, token.trim(), { encoding: "utf8" });
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    /* p. ej. Windows: permisos distintos */
  }
}
