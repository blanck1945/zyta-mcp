import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
export declare function jsonResult(data: unknown): CallToolResult;
export declare function toolError(err: unknown): CallToolResult;
