import { z } from "zod/v3";
import { type DeviceVerifyOverride } from "./deviceVerifyUrl.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
export declare const loginInputSchema: z.ZodObject<{
    access_token: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    access_token?: string | undefined;
    email?: string | undefined;
    password?: string | undefined;
}, {
    access_token?: string | undefined;
    email?: string | undefined;
    password?: string | undefined;
}>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type LoginHandlerOptions = {
    pendingHint?: string;
    successMessage?: string;
    credentialsMessage?: string;
    /** Device flow: abrir Minerva u otra base en lugar del dashboard del BE. */
    deviceVerify?: DeviceVerifyOverride;
};
export declare function executeLogin(args: LoginInput, options?: LoginHandlerOptions): Promise<CallToolResult>;
