import { spawn, spawnSync } from "node:child_process";
const BRAVE_WIN = process.env.BRAVE_PATH ??
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe";
function openBraveWindows(url) {
    const attempts = [
        () => {
            const r = spawnSync("powershell", [
                "-NoProfile",
                "-WindowStyle",
                "Hidden",
                "-Command",
                `Start-Process -FilePath '${BRAVE_WIN.replace(/'/g, "''")}' -ArgumentList '${url.replace(/'/g, "''")}'`,
            ], { stdio: "ignore", windowsHide: true });
            return r.status === 0;
        },
        () => {
            const r = spawnSync(BRAVE_WIN, [url], { stdio: "ignore", windowsHide: true });
            return r.status === 0;
        },
    ];
    for (const attempt of attempts) {
        if (attempt())
            return true;
    }
    return false;
}
function openBraveUnix(url) {
    const commands = process.platform === "darwin"
        ? [["open", "-a", "Brave Browser", url]]
        : [
            ["brave-browser", url],
            ["brave", url],
        ];
    for (const entry of commands) {
        const [cmd, ...args] = entry;
        if (!cmd)
            continue;
        const r = spawnSync(cmd, args, { stdio: "ignore", windowsHide: true });
        if (r.status === 0)
            return true;
    }
    return false;
}
function openSystemDefault(url) {
    if (process.platform === "win32") {
        spawn("powershell", ["-NoProfile", "-WindowStyle", "Hidden", "-Command", `Start-Process '${url.replace(/'/g, "''")}'`], { stdio: "ignore", windowsHide: true, detached: true }).unref();
    }
    else if (process.platform === "darwin") {
        spawn("open", [url], { stdio: "ignore", detached: true }).unref();
    }
    else {
        spawn("xdg-open", [url], { stdio: "ignore", detached: true }).unref();
    }
}
/** Abre URL en Brave (Windows/macOS/Linux). Sin ventana de terminal. */
export function openBrowser(url) {
    try {
        const opened = process.platform === "win32" ? openBraveWindows(url) : openBraveUnix(url);
        if (!opened)
            openSystemDefault(url);
    }
    catch {
        try {
            openSystemDefault(url);
        }
        catch {
            /* el usuario puede abrir el link manualmente */
        }
    }
}
