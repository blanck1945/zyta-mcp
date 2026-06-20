/**
 * Cliente HTTP mínimo hacia el API Zyta (Bearer JWT vía session).
 */
export declare class ApiHttpError extends Error {
    readonly status: number;
    constructor(status: number, message: string);
}
export declare class KairoApiClient {
    private readonly baseUrl;
    constructor(baseUrl: string);
    get<T>(path: string): Promise<T>;
    post<T>(path: string, body: unknown): Promise<T>;
    private request;
}
