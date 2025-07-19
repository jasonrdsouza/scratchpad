import { EditorView, basicSetup } from "codemirror";
import { Compartment } from "@codemirror/state";
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

const modeIndicator = document.getElementById('vim-mode-indicator');

function updateModeIndicator(modeObj) {
    if (!modeObj || !modeObj.mode) return;
    
    const modeName = modeObj.mode;
    const subMode = modeObj.subMode;
    
    // Create display text
    let displayText = `-- ${modeName.toUpperCase()}`;
    if (subMode) {
        displayText += ` ${subMode.toUpperCase()}`;
    }
    displayText += ' --';
    
    modeIndicator.textContent = displayText;
    modeIndicator.className = 'vim-mode-indicator ' + modeName.toLowerCase();
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
    go: () => go(),
};

const initialContent = localStorage.getItem(LS_CONTENT_KEY) || "Welcome to your Vim Scratchpad!\n\n:set filetype=markdown";
const initialFt = localStorage.getItem(LS_FT_KEY);

const editorView = new EditorView({
    doc: initialContent,
    extensions: [
        basicSetup,
        vim(),
        nord,
        languageCompartment.of(initialFt && languages[initialFt] ? languages[initialFt]() : [])
    ],
    parent: document.querySelector("#editor")
});

// Set up vim mode change listener using the correct API
const cm = getCM(editorView);
cm.on('vim-mode-change', (modeObj) => {
    console.log('Vim mode changed:', modeObj);
    updateModeIndicator(modeObj);
});

console.log('Editor initialized with vim extension and mode listener');

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

function autoSave() {
    const currentContent = editorView.state.doc.toString();
    const storedContent = localStorage.getItem(LS_CONTENT_KEY);
    
    if (currentContent !== storedContent) {
        localStorage.setItem(LS_CONTENT_KEY, currentContent);
        console.log("Auto-saved content.");
    }
}

// Set up autosave every 5 seconds
setInterval(autoSave, 5000);

Vim.defineEx("w", "w", () => saveContent());
Vim.defineEx("q", "q", () => window.close());
Vim.defineEx("wq", "wq", () => {
    saveContent();
    window.close();
});

Vim.defineEx("set", "set", (cm, params) => {
    if (params.args && params.args.length > 0) {
        const [key, value] = params.args[0].split('=');
        if (key === 'filetype' || key === 'ft') {
            setLanguage(editorView, value);
        }
    }
});

