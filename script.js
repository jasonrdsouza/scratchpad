import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { historyField } from "@codemirror/commands";
import { vim, Vim, getCM } from "@replit/codemirror-vim";
import { nord } from "cm6-theme-nord";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { sql } from "@codemirror/lang-sql";
import { yaml } from "@codemirror/lang-yaml";
import { xml } from "@codemirror/lang-xml";
import { go } from "@codemirror/lang-go";

const LS_CONTENT_KEY = "vim-scratchpad-content";
const LS_FT_KEY = "vim-scratchpad-filetype";
const LS_VIM_COMMAND_HISTORY_KEY = "vim-command-history";
const LS_VIM_SEARCH_HISTORY_KEY = "vim-search-history";
const LS_EDITOR_STATE_KEY = "editor-state";

const AUTOSAVE_INTERVAL_MS = 5000; // 5 seconds

const modeIndicator = document.getElementById("vim-mode-indicator");

function updateModeIndicator(modeObj) {
    if (!modeObj || !modeObj.mode) return;

    const modeName = modeObj.mode;
    const subMode = modeObj.subMode;

    // Create display text
    let displayText = `-- ${modeName.toUpperCase()}`;
    if (subMode) {
        displayText += ` ${subMode.toUpperCase()}`;
    }
    displayText += " --";

    modeIndicator.textContent = displayText;
    modeIndicator.className = "vim-mode-indicator " + modeName.toLowerCase();
}

let languageCompartment = new Compartment();

const languages = {
    markdown: () => markdown(),
    md: () => markdown(),
    python: () => python(),
    py: () => python(),
    javascript: () => javascript(),
    js: () => javascript(),
    typescript: () => javascript({ typescript: true }),
    ts: () => javascript({ typescript: true }),
    jsx: () => javascript({ jsx: true }),
    tsx: () => javascript({ typescript: true, jsx: true }),
    json: () => json(),
    css: () => css(),
    html: () => html(),
    sql: () => sql(),
    yaml: () => yaml(),
    yml: () => yaml(),
    xml: () => xml(),
    go: () => go()
};

const initialContent =
    localStorage.getItem(LS_CONTENT_KEY) ||
    "Welcome to your Vim Scratchpad!\n\n:set filetype=markdown";
const initialFt = localStorage.getItem(LS_FT_KEY);

// State fields for serialization (including history)
const stateFields = { history: historyField };

let editorView;

// Try to restore previous editor state with history
const savedState = localStorage.getItem(LS_EDITOR_STATE_KEY);
if (savedState) {
    try {
        const restoredState = EditorState.fromJSON(
            JSON.parse(savedState),
            {
                extensions: [
                    basicSetup,
                    vim(),
                    nord,
                    languageCompartment.of(
                        initialFt && languages[initialFt]
                            ? languages[initialFt]()
                            : []
                    )
                ]
            },
            stateFields
        );

        editorView = new EditorView({
            state: restoredState,
            parent: document.querySelector("#editor")
        });
    } catch (error) {
        console.warn("Failed to restore editor state, creating new:", error);
        // Fallback to new editor if restoration fails
        editorView = new EditorView({
            doc: initialContent,
            extensions: [
                basicSetup,
                vim(),
                nord,
                languageCompartment.of(
                    initialFt && languages[initialFt]
                        ? languages[initialFt]()
                        : []
                )
            ],
            parent: document.querySelector("#editor")
        });
    }
} else {
    // Create new editor if no saved state
    editorView = new EditorView({
        doc: initialContent,
        extensions: [
            basicSetup,
            vim(),
            nord,
            languageCompartment.of(
                initialFt && languages[initialFt] ? languages[initialFt]() : []
            )
        ],
        parent: document.querySelector("#editor")
    });
}

// Set up vim mode change listener using the correct API
const cm = getCM(editorView);
cm.on("vim-mode-change", (modeObj) => {
    console.log("Vim mode changed:", modeObj);
    updateModeIndicator(modeObj);
});

// Load vim history after vim is initialized
setTimeout(() => {
    loadVimHistory();
}, 100); // Small delay to ensure vim is fully initialized

console.log("Editor initialized with vim extension and mode listener");

function setLanguage(view, lang) {
    const language = languages[lang];
    if (language) {
        view.dispatch({
            effects: languageCompartment.reconfigure(language())
        });
        localStorage.setItem(LS_FT_KEY, lang);
    } else {
        view.dispatch({
            effects: languageCompartment.reconfigure([])
        });
        localStorage.removeItem(LS_FT_KEY);
    }
}

function saveContent() {
    const content = editorView.state.doc.toString();
    localStorage.setItem(LS_CONTENT_KEY, content);
    console.log("Content saved.");
}

function saveVimHistory() {
    try {
        const vimGlobalState = Vim.getVimGlobalState_();

        // Save command history (commands like :w, :set ft=js)
        const commandHistory =
            vimGlobalState.exCommandHistoryController.historyBuffer;
        localStorage.setItem(
            LS_VIM_COMMAND_HISTORY_KEY,
            JSON.stringify(commandHistory)
        );

        // Save search history (searches like /pattern, ?pattern)
        const searchHistory =
            vimGlobalState.searchHistoryController.historyBuffer;
        localStorage.setItem(
            LS_VIM_SEARCH_HISTORY_KEY,
            JSON.stringify(searchHistory)
        );

        console.log("Vim history saved.");
    } catch (error) {
        console.error("Failed to save vim history:", error);
    }
}

function saveEditorState() {
    try {
        // Save editor state with undo/redo history
        const stateJson = editorView.state.toJSON(stateFields);
        localStorage.setItem(LS_EDITOR_STATE_KEY, JSON.stringify(stateJson));
        console.log("Editor state with history saved.");
    } catch (error) {
        console.error("Failed to save editor state:", error);
    }
}

function autoSave() {
    // Save content (for backward compatibility)
    const currentContent = editorView.state.doc.toString();
    const storedContent = localStorage.getItem(LS_CONTENT_KEY);

    if (currentContent !== storedContent) {
        localStorage.setItem(LS_CONTENT_KEY, currentContent);
        console.log("Auto-saved content.");
    }

    // Save vim history
    saveVimHistory();

    // Save editor state with undo/redo history
    saveEditorState();
}

function loadVimHistory() {
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

// Set up autosave (content + vim history) at regular intervals
setInterval(autoSave, AUTOSAVE_INTERVAL_MS);
window.addEventListener("beforeunload", autoSave); // Save on page unload

Vim.defineEx("w", "w", () => saveContent());
Vim.defineEx("q", "q", () => window.close());
Vim.defineEx("wq", "wq", () => {
    saveContent();
    window.close();
});

Vim.defineEx("set", "set", (cm, params) => {
    if (params.args && params.args.length > 0) {
        const [key, value] = params.args[0].split("=");
        if (key === "filetype" || key === "ft") {
            setLanguage(editorView, value);
        }
    }
});
