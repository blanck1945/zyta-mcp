export declare const DEFAULT_MINERVA_APP_URL = "https://minerva.zyta.app";
export type DeviceVerifyOverride = {
    verifyBaseUrl?: string;
    verifyPath?: string;
    retryToolName?: string;
};
export declare function resolveMinervaAppUrl(): string;
export declare function buildVerificationUrls(userCode: string, override: DeviceVerifyOverride): {
    verificationUri: string;
    verificationUriComplete: string;
} | null;
export declare function applyVerificationOverride(pending: {
    userCode: string;
    verificationUri: string;
    verificationUriComplete?: string;
}, override?: DeviceVerifyOverride): {
    verificationUri: string;
    verificationUriComplete: string;
};
