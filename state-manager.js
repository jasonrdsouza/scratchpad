import { Vim } from "@replit/codemirror-vim";
import { historyField } from "@codemirror/commands";
import { EditorState } from "@codemirror/state";

// Storage keys
export const LS_CONTENT_KEY = "vim-scratchpad-content";
export const LS_FT_KEY = "vim-scratchpad-filetype";
export const LS_WRAP_KEY = "vim-scratchpad-wrap";
export const LS_RELATIVENUMBER_KEY = "vim-scratchpad-relativenumber";
export const LS_VIM_COMMAND_HISTORY_KEY = "vim-command-history";
export const LS_VIM_SEARCH_HISTORY_KEY = "vim-search-history";
export const LS_EDITOR_STATE_KEY = "editor-state";

// Configuration
export const AUTOSAVE_INTERVAL_MS = 5000; // 5 seconds

// State fields for serialization (including history)
export const stateFields = { history: historyField };

/**
 * Save editor state (including undo/redo history) only if changed
 */
export function saveEditorState(editorView) {
    try {
        const currentStateJson = JSON.stringify(
            editorView.state.toJSON(stateFields)
        );
        const storedStateJson = localStorage.getItem(LS_EDITOR_STATE_KEY);

        if (currentStateJson !== storedStateJson) {
            localStorage.setItem(LS_EDITOR_STATE_KEY, currentStateJson);
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
            LS_VIM_COMMAND_HISTORY_KEY
        );

        if (currentCommandHistory !== storedCommandHistory) {
            localStorage.setItem(
                LS_VIM_COMMAND_HISTORY_KEY,
                currentCommandHistory
            );
            console.log("Vim command history saved.");
        }

        // Save search history if changed
        const currentSearchHistory = JSON.stringify(
            vimGlobalState.searchHistoryController.historyBuffer
        );
        const storedSearchHistory = localStorage.getItem(
            LS_VIM_SEARCH_HISTORY_KEY
        );

        if (currentSearchHistory !== storedSearchHistory) {
            localStorage.setItem(
                LS_VIM_SEARCH_HISTORY_KEY,
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
    const currentContent = editorView.state.doc.toString();
    const storedContent = localStorage.getItem(LS_CONTENT_KEY);

    if (currentContent !== storedContent) {
        localStorage.setItem(LS_CONTENT_KEY, currentContent);
        console.log("Auto-saved content.");
    }
}

/**
 * Save content immediately (for manual saves like :w)
 */
export function saveContent(editorView) {
    const content = editorView.state.doc.toString();
    localStorage.setItem(LS_CONTENT_KEY, content);
    console.log("Content saved.");
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
            LS_VIM_COMMAND_HISTORY_KEY
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
            LS_VIM_SEARCH_HISTORY_KEY
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
    return (
        localStorage.getItem(LS_CONTENT_KEY) ||
        "Welcome to your Vim Scratchpad!\n\n:set filetype=markdown"
    );
}

/**
 * Get initial filetype from localStorage
 */
export function getInitialFiletype() {
    return localStorage.getItem(LS_FT_KEY);
}

/**
 * Get initial wrap state from localStorage
 */
export function getInitialWrapState() {
    const wrap = localStorage.getItem(LS_WRAP_KEY);
    return wrap === "true";
}

/**
 * Get initial relative number state from localStorage (default to false - absolute numbers)
 */
export function getInitialRelativeNumberState() {
    const relativeNumber = localStorage.getItem(LS_RELATIVENUMBER_KEY);
    return relativeNumber === "true";
}

/**
 * Try to restore editor state from localStorage, return null if not possible
 */
export function restoreEditorState(extensions) {
    const savedState = localStorage.getItem(LS_EDITOR_STATE_KEY);
    if (!savedState) {
        return null;
    }

    try {
        const restoredState = EditorState.fromJSON(
            JSON.parse(savedState),
            { extensions },
            stateFields
        );
        return restoredState;
    } catch (error) {
        console.warn("Failed to restore editor state:", error);
        return null;
    }
}

/**
 * Setup autosave functionality for an editor view
 */
export function setupAutosave(editorView) {
    // Set up autosave (content + vim history) at regular intervals
    const intervalId = setInterval(
        () => autoSave(editorView),
        AUTOSAVE_INTERVAL_MS
    );

    // Save on page unload
    const beforeUnloadHandler = () => autoSave(editorView);
    window.addEventListener("beforeunload", beforeUnloadHandler);

    // Return cleanup function
    return () => {
        clearInterval(intervalId);
        window.removeEventListener("beforeunload", beforeUnloadHandler);
    };
}
