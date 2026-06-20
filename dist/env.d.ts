/**
 * Resuelve URL base del API. El token se gestiona vía session.ts (login MCP o archivo).
 */
import { getTokenSource } from "./session.js";
export type { TokenSource } from "./session.js";
export interface LoadedEnv {
    baseUrl: string;
    tokenSource: ReturnType<typeof getTokenSource>;
    hasToken: boolean;
    tokenFilePath: string;
}
export declare function loadEnv(): LoadedEnv;
