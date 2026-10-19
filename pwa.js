/**
 * Progressive Web App support - service worker registration and updates
 *
 * The service worker precaches the app so it works offline, and caches the
 * Pyodide runtime and packages from the CDN the first time Python runs.
 */

import { registerSW } from "virtual:pwa-register";
import { Vim } from "@replit/codemirror-vim";
import { autoSave } from "./state-manager.js";
import { showExecutionResult } from "./commands.js";
import { SUCCESS_MESSAGES } from "./config.js";

/**
 * Register the service worker and the :upgrade command for applying updates
 */
export function setupPWA(editorView) {
    let updateAvailable = false;

    const updateServiceWorker = registerSW({
        onNeedRefresh() {
            updateAvailable = true;
            showExecutionResult(SUCCESS_MESSAGES.UPDATE_AVAILABLE, false);
        },
        onOfflineReady() {
            showExecutionResult(SUCCESS_MESSAGES.OFFLINE_READY, false);
        },
        // :upgrade handles the reload itself (see below)
        onNeedReload() {}
    });

    // Apply a pending update (saving first, since the page reloads)
    Vim.defineEx("upgrade", "upgrade", () => {
        if (!updateAvailable) {
            showExecutionResult(SUCCESS_MESSAGES.UP_TO_DATE, false);
            return;
        }
        autoSave(editorView);

        // Reload once the new service worker takes control. (The plugin only
        // does this if the page was already controlled when it loaded, which
        // isn't the case for a tab opened before the first install.)
        navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => window.location.reload(),
            { once: true }
        );
        updateServiceWorker();
    });
}
