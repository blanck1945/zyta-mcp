/**
 * Cliente del flujo OAuth 2.0 Device Authorization (RFC 8628).
 * Contrato del backend: ver docs/BACKEND_MCP_AUTH_SPEC.md
 */
export interface DeviceAuthorizationSession {
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    expiresIn: number;
    intervalSec: number;
}
export interface DeviceFlowOptions {
    baseUrl: string;
    /** Default: /auth/mcp/device-authorization */
    deviceAuthPath?: string;
    /** Default: /auth/mcp/token */
    deviceTokenPath?: string;
    clientId?: string;
}
export declare function startDeviceAuthorization(opts: DeviceFlowOptions): Promise<DeviceAuthorizationSession>;
export declare function pollDeviceUntilAccessToken(opts: DeviceFlowOptions, session: DeviceAuthorizationSession): Promise<string>;
