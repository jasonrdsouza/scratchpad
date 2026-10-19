import { Vim } from "@replit/codemirror-vim";
import { historyField } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";
import { STORAGE_KEYS, TIMING, DEFAULTS } from "./config.js";

// State fields for serialization (including history)
export const stateFields = { history: historyField };

// Document content as of this tab's last load or save. Used to tell whether
// this tab has unsaved edits, so an idle tab never overwrites newer content
// saved by another tab.
let lastSavedContent = null;

/**
 * Save editor state (including undo/redo history) only if changed
 */
export function saveEditorState(editorView) {
    try {
        // Only save state that matches the saved content; otherwise this tab
        // is out of date and its state would be stale
        if (
            editorView.state.doc.toString() !==
            localStorage.getItem(STORAGE_KEYS.CONTENT)
        ) {
            return;
        }

        const currentStateJson = JSON.stringify(
            editorView.state.toJSON(stateFields)
        );
        const storedStateJson = localStorage.getItem(STORAGE_KEYS.EDITOR_STATE);

        if (currentStateJson !== storedStateJson) {
            localStorage.setItem(STORAGE_KEYS.EDITOR_STATE, currentStateJson);
            console.log("Editor state with history saved.");
        }
    } catch (error) {
        console.error("Failed to save editor state:", error);
    }
}

/**
 * Save vim command and search history only if changed
 */
export function saveVimHistoryIfChanged() {
    try {
        const vimGlobalState = Vim.getVimGlobalState_();

        // Save command history if changed
        const currentCommandHistory = JSON.stringify(
            vimGlobalState.exCommandHistoryController.historyBuffer
        );
        const storedCommandHistory = localStorage.getItem(
            STORAGE_KEYS.VIM_COMMAND_HISTORY
        );

        if (currentCommandHistory !== storedCommandHistory) {
            localStorage.setItem(
                STORAGE_KEYS.VIM_COMMAND_HISTORY,
                currentCommandHistory
            );
            console.log("Vim command history saved.");
        }

        // Save search history if changed
        const currentSearchHistory = JSON.stringify(
            vimGlobalState.searchHistoryController.historyBuffer
        );
        const storedSearchHistory = localStorage.getItem(
            STORAGE_KEYS.VIM_SEARCH_HISTORY
        );

        if (currentSearchHistory !== storedSearchHistory) {
            localStorage.setItem(
                STORAGE_KEYS.VIM_SEARCH_HISTORY,
                currentSearchHistory
            );
            console.log("Vim search history saved.");
        }
    } catch (error) {
        console.error("Failed to save vim history:", error);
    }
}

/**
 * Save content only if changed
 */
export function saveContentIfChanged(editorView) {
    try {
        const currentContent = editorView.state.doc.toString();

        // Only save edits made in this tab since its last load or save
        if (currentContent !== lastSavedContent) {
            localStorage.setItem(STORAGE_KEYS.CONTENT, currentContent);
            lastSavedContent = currentContent;
            console.log("Auto-saved content.");
        }
    } catch (error) {
        console.error("Failed to save content:", error);
    }
}

/**
 * Save content immediately (for manual saves like :w)
 */
export function saveContent(editorView) {
    const content = editorView.state.doc.toString();
    localStorage.setItem(STORAGE_KEYS.CONTENT, content);
    lastSavedContent = content;
    console.log("Content saved.");
    // Keep the editor state in sync so it isn't discarded as stale on reload
    saveEditorState(editorView);
}

/**
 * Unified autosave function - saves all changed data
 */
export function autoSave(editorView) {
    saveContentIfChanged(editorView);
    saveVimHistoryIfChanged();
    saveEditorState(editorView);
}

/**
 * Load vim command and search history from localStorage
 */
export function loadVimHistory() {
    try {
        const vimGlobalState = Vim.getVimGlobalState_();

        // Load command history
        const savedCommandHistory = localStorage.getItem(
            STORAGE_KEYS.VIM_COMMAND_HISTORY
        );
        if (savedCommandHistory) {
            const commandHistory = JSON.parse(savedCommandHistory);
            vimGlobalState.exCommandHistoryController.historyBuffer =
                commandHistory;
            vimGlobalState.exCommandHistoryController.iterator =
                commandHistory.length;
        }

        // Load search history
        const savedSearchHistory = localStorage.getItem(
            STORAGE_KEYS.VIM_SEARCH_HISTORY
        );
        if (savedSearchHistory) {
            const searchHistory = JSON.parse(savedSearchHistory);
            vimGlobalState.searchHistoryController.historyBuffer =
                searchHistory;
            vimGlobalState.searchHistoryController.iterator =
                searchHistory.length;
        }

        console.log("Vim history loaded.");
    } catch (error) {
        console.error("Failed to load vim history:", error);
    }
}

/**
 * Get initial content from localStorage or default
 */
export function getInitialContent() {
    return localStorage.getItem(STORAGE_KEYS.CONTENT) || DEFAULTS.CONTENT;
}

/**
 * Get initial filetype from localStorage
 */
export function getInitialFiletype() {
    return localStorage.getItem(STORAGE_KEYS.FILETYPE);
}

/**
 * Get initial wrap state from localStorage
 */
export function getInitialWrapState() {
    const wrap = localStorage.getItem(STORAGE_KEYS.WRAP);
    return wrap === "true";
}

/**
 * Get initial relative number state from localStorage (default to false - absolute numbers)
 */
export function getInitialRelativeNumberState() {
    const relativeNumber = localStorage.getItem(STORAGE_KEYS.RELATIVE_NUMBERS);
    return relativeNumber === "true";
}

/**
 * Try to restore editor state from localStorage, return null if not possible
 */
export function restoreEditorState(extensions) {
    const savedState = localStorage.getItem(STORAGE_KEYS.EDITOR_STATE);
    if (!savedState) {
        return null;
    }

    try {
        const restoredState = EditorState.fromJSON(
            JSON.parse(savedState),
            { extensions },
            stateFields
        );

        // Content is the source of truth. If the editor state didn't get saved
        // along with it (e.g. it hit the storage quota), it's stale - discard it
        // rather than restoring an outdated document.
        const savedContent = localStorage.getItem(STORAGE_KEYS.CONTENT);
        if (
            savedContent !== null &&
            savedContent !== restoredState.doc.toString()
        ) {
            console.warn(
                "Saved editor state is out of date with saved content; ignoring it."
            );
            return null;
        }

        return restoredState;
    } catch (error) {
        console.warn("Failed to restore editor state:", error);
        return null;
    }
}

/**
 * Replace the editor's document with content saved by another tab, changing
 * only the part that differs so the cursor stays in place where possible
 */
function applyExternalContent(editorView, newContent) {
    const current = editorView.state.doc.toString();

    let start = 0;
    while (
        start < current.length &&
        start < newContent.length &&
        current[start] === newContent[start]
    ) {
        start++;
    }

    let currentEnd = current.length;
    let newEnd = newContent.length;
    while (
        currentEnd > start &&
        newEnd > start &&
        current[currentEnd - 1] === newContent[newEnd - 1]
    ) {
        currentEnd--;
        newEnd--;
    }

    editorView.dispatch({
        changes: {
            from: start,
            to: currentEnd,
            insert: newContent.slice(start, newEnd)
        }
    });
}

/**
 * Setup autosave functionality for an editor view
 */
export function setupAutosave(editorView) {
    lastSavedContent = editorView.state.doc.toString();

    // Set up autosave (content + vim history) at regular intervals
    const intervalId = setInterval(
        () => autoSave(editorView),
        TIMING.AUTOSAVE_INTERVAL_MS
    );

    // Save when the page is hidden or closed. visibilitychange/pagehide are
    // more reliable than beforeunload, especially on mobile.
    const saveHandler = () => autoSave(editorView);
    const visibilityHandler = () => {
        if (document.visibilityState === "hidden") {
            autoSave(editorView);
        }
    };
    window.addEventListener("beforeunload", saveHandler);
    window.addEventListener("pagehide", saveHandler);
    document.addEventListener("visibilitychange", visibilityHandler);

    // Pick up content saved by another tab, unless this tab has unsaved
    // edits of its own (in which case the most recent save wins)
    const storageHandler = (event) => {
        if (event.key !== STORAGE_KEYS.CONTENT || event.newValue === null) {
            return;
        }

        if (editorView.state.doc.toString() !== lastSavedContent) {
            console.warn(
                "Content changed in another tab, but this tab has unsaved edits; keeping them."
            );
            return;
        }

        applyExternalContent(editorView, event.newValue);
        lastSavedContent = event.newValue;
        console.log("Loaded content saved in another tab.");
    };
    window.addEventListener("storage", storageHandler);

    // Return cleanup function
    return () => {
        clearInterval(intervalId);
        window.removeEventListener("beforeunload", saveHandler);
        window.removeEventListener("pagehide", saveHandler);
        document.removeEventListener("visibilitychange", visibilityHandler);
        window.removeEventListener("storage", storageHandler);
    };
}
