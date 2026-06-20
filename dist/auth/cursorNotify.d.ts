export type ZytaDeviceAuthComplete = {
    authorizedAt: string;
    userName: string | null;
    userEmail: string | null;
    clientLabel: string;
    source: "browser" | "mcp";
};
export declare function deviceAuthNotifyPath(): string;
export declare function writeDeviceAuthComplete(data: ZytaDeviceAuthComplete): void;
export declare function userLabelFromProfile(user: unknown | null): {
    userName: string | null;
    userEmail: string | null;
};
