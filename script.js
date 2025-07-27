import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { vim, Vim, getCM } from "@replit/codemirror-vim";
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
import { highlightWhitespace } from "@codemirror/view";
import {
    LS_FT_KEY,
    loadVimHistory,
    getInitialContent,
    getInitialFiletype,
    restoreEditorState,
    setupAutosave
} from "./state-manager.js";
import { registerVimCommands } from "./commands.js";
import { getTheme } from "./theme-manager.js";

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
let themeCompartment = new Compartment();
let whitespaceCompartment = new Compartment();

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

const initialContent = getInitialContent();
const initialFt = getInitialFiletype();

// Create extensions array
const extensions = [
    basicSetup,
    vim(),
    themeCompartment.of(getTheme()), // Use theme compartment for dynamic switching
    languageCompartment.of(
        initialFt && languages[initialFt] ? languages[initialFt]() : []
    ),
    whitespaceCompartment.of([]) // Start with whitespace hidden
];

let editorView;

// Try to restore previous editor state with history
const restoredState = restoreEditorState(extensions);
if (restoredState) {
    editorView = new EditorView({
        state: restoredState,
        parent: document.querySelector("#editor")
    });
} else {
    // Create new editor if no saved state or restoration failed
    editorView = new EditorView({
        doc: initialContent,
        extensions,
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

// Set up autosave functionality
setupAutosave(editorView);

// Register all vim commands
registerVimCommands(
    editorView,
    languages,
    languageCompartment,
    themeCompartment,
    whitespaceCompartment
);
