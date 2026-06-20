/** Ruta por defecto: `~/.zyta-mcp/token` (Windows: `C:\Users\<usuario>\.zyta-mcp\token`). */
export declare function getDefaultTokenFilePath(): string;
export declare function readTokenFromFile(filePath: string): string | null;
export declare function saveTokenToFile(filePath: string, token: string): void;
