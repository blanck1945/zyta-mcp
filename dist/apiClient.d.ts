/**
 * Cliente HTTP mínimo hacia el API Kairo (misma semántica que el dashboard: Bearer JWT).
 */
export declare class ApiHttpError extends Error {
    readonly status: number;
    constructor(status: number, message: string);
}
export declare class KairoApiClient {
    private readonly baseUrl;
    private readonly token;
    constructor(baseUrl: string, token: string);
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body: unknown): Promise<T>;
    private request;
}
