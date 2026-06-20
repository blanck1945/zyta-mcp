import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type ZytaDeviceAuthComplete = {
  authorizedAt: string;
  userName: string | null;
  userEmail: string | null;
  clientLabel: string;
  source: "browser" | "mcp";
};

function projectRoot(): string {
  if (process.env.ZYTA_PROJECT_ROOT?.trim()) {
    return process.env.ZYTA_PROJECT_ROOT.trim().replace(/\/$/, "");
  }
  if (process.env.KAIRO_PROJECT_ROOT?.trim()) {
    return process.env.KAIRO_PROJECT_ROOT.trim().replace(/\/$/, "");
  }
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, ".cursor", "mcp.json"))) return cwd;
  const parent = path.resolve(cwd, "..");
  if (existsSync(path.join(parent, ".cursor", "mcp.json"))) return parent;
  return cwd;
}

export function deviceAuthNotifyPath(): string {
  return path.join(projectRoot(), ".cursor", "zyta-auth-complete.json");
}

export function writeDeviceAuthComplete(data: ZytaDeviceAuthComplete): void {
  const file = deviceAuthNotifyPath();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

export function userLabelFromProfile(user: unknown | null): {
  userName: string | null;
  userEmail: string | null;
} {
  if (!user || typeof user !== "object") {
    return { userName: null, userEmail: null };
  }
  const u = user as Record<string, unknown>;
  const email = typeof u.email === "string" ? u.email : null;
  const name =
    (typeof u.username === "string" && u.username) ||
    (typeof u.fullName === "string" && u.fullName) ||
    (typeof u.name === "string" && u.name) ||
    null;
  return { userName: name, userEmail: email };
}
