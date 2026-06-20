export type TokenSource = "env" | "file" | "memory" | "none";
export declare class AuthRequiredError extends Error {
    constructor(detail?: string);
}
export declare function initSession(url: string): void;
export declare function getBaseUrl(): string;
export declare function getTokenFilePath(): string;
export declare function readPersistedToken(): string | null;
export declare function bootstrapSession(url: string): void;
export declare function setToken(token: string, persist?: boolean): void;
export declare function clearSession(): void;
export declare function getTokenSource(): TokenSource;
export declare function hasToken(): boolean;
export declare function validateToken(token: string): Promise<boolean>;
export declare function ensureToken(): Promise<string>;
export declare function fetchCurrentUser(token: string): Promise<unknown>;
