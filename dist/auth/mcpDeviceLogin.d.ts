export type PendingDevice = {
    baseUrl: string;
    deviceCode: string;
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
    expiresAt: number;
    intervalSec: number;
};
export type DeviceLoginResult = {
    ok: true;
    accessToken: string;
    user: unknown | null;
} | {
    ok: false;
    pending: true;
    message: string;
    verificationUriComplete: string;
    userCode: string;
} | {
    ok: false;
    pending: false;
    message: string;
};
export declare function clearPendingDevice(): void;
/**
 * Login estilo `gh auth login`: abre el navegador en la página de Zyta y hace polling.
 */
export declare function runDeviceLogin(baseUrl: string): Promise<DeviceLoginResult>;
