/**
 * Login sin Bearer — mismo contrato que el dashboard: POST /auth/login
 */
export declare function fetchAccessToken(baseUrl: string, email: string, password: string): Promise<string>;
