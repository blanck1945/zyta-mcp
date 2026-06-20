/**
 * Resuelve URL base del API y JWT (env o archivo). No registrar valores en logs.
 */
export type TokenSource = "env" | "file";
export interface LoadedEnv {
    baseUrl: string;
    token: string;
    tokenSource: TokenSource;
}
export declare function loadEnv(): LoadedEnv;
