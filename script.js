import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
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
import {
    LS_FT_KEY,
    saveContent,
    loadVimHistory,
    getInitialContent,
    getInitialFiletype,
    restoreEditorState,
    setupAutosave
} from "./state-manager.js";

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

const initialContent = getInitialContent();
const initialFt = getInitialFiletype();

// Create extensions array
const extensions = [
    basicSetup,
    vim(),
    nord,
    languageCompartment.of(
        initialFt && languages[initialFt] ? languages[initialFt]() : []
    )
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

function executeJavaScript(code) {
    try {
        // Create a safe execution context
        const result = eval(code);

        // Handle different result types
        let displayResult;
        if (result === undefined) {
            displayResult = "undefined";
        } else if (result === null) {
            displayResult = "null";
        } else if (typeof result === "function") {
            displayResult = result.toString();
        } else if (typeof result === "object") {
            displayResult = JSON.stringify(result, null, 2);
        } else {
            displayResult = String(result);
        }

        // Show result in console and as a temporary indicator
        console.log("JavaScript result:", result);
        showExecutionResult(displayResult, false);

        return result;
    } catch (error) {
        console.error("JavaScript execution error:", error);
        showExecutionResult(`Error: ${error.message}`, true);
        return null;
    }
}

function showExecutionResult(result, isError = false) {
    // Create or update result display
    let resultDisplay = document.getElementById("js-result-display");

    if (!resultDisplay) {
        resultDisplay = document.createElement("div");
        resultDisplay.id = "js-result-display";
        resultDisplay.style.cssText = `
            position: absolute;
            bottom: 60px;
            right: 20px;
            max-width: 300px;
            max-height: 200px;
            padding: 10px;
            border-radius: 5px;
            font-family: 'Fira Code', monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
            overflow: auto;
            z-index: 101;
            opacity: 0;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(resultDisplay);
    }

    // Style based on result type
    if (isError) {
        resultDisplay.style.backgroundColor = "#bf616a"; // nord11 red
        resultDisplay.style.color = "#eceff4"; // nord6
        resultDisplay.style.border = "2px solid #d08770"; // nord12
    } else {
        resultDisplay.style.backgroundColor = "#a3be8c"; // nord14 green
        resultDisplay.style.color = "#2e3440"; // nord0
        resultDisplay.style.border = "2px solid #8fbcbb"; // nord7
    }

    resultDisplay.textContent = result;
    resultDisplay.style.opacity = "1";

    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (resultDisplay) {
            resultDisplay.style.opacity = "0";
            setTimeout(() => {
                if (resultDisplay && resultDisplay.parentNode) {
                    resultDisplay.parentNode.removeChild(resultDisplay);
                }
            }, 300);
        }
    }, 5000);
}

function getCodeFromRegister(registerName = null) {
    // First try to get yanked text from vim registers
    try {
        const vimGlobalState = Vim.getVimGlobalState_();
        const registerController = vimGlobalState.registerController;

        if (registerName) {
            // Get text from named register
            const namedRegister = registerController.registers[registerName];
            if (
                namedRegister &&
                namedRegister.keyBuffer &&
                namedRegister.keyBuffer.length > 0
            ) {
                const registerText = namedRegister.keyBuffer[0];
                if (registerText && registerText.trim()) {
                    return registerText;
                }
            }
            throw new Error(`Register '${registerName}' is empty or not found`);
        } else {
            // Use unnamed register
            const unnamedReg = registerController.unnamedRegister;
            if (
                unnamedReg &&
                unnamedReg.keyBuffer &&
                unnamedReg.keyBuffer.length > 0
            ) {
                const yankedText = unnamedReg.keyBuffer[0];
                if (yankedText && yankedText.trim()) {
                    return yankedText;
                }
            }
        }
    } catch (error) {
        if (registerName) {
            throw error; // Re-throw named register errors
        }
        // Continue to fallbacks for unnamed register
    }

    // Fall back to CodeMirror selection or current line
    const state = editorView.state;
    const selection = state.selection.main;

    if (!selection.empty) {
        return state.doc.sliceString(selection.from, selection.to);
    } else {
        // Return current line
        const line = state.doc.lineAt(selection.head);
        return line.text;
    }
}

// Set up autosave functionality
setupAutosave(editorView);

Vim.defineEx("w", "w", () => saveContent(editorView));
Vim.defineEx("q", "q", () => window.close());
Vim.defineEx("wq", "wq", () => {
    saveContent(editorView);
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

Vim.defineEx("js", "js", (cm, params) => {
    try {
        // Check if a register name was provided
        const registerName =
            params.args && params.args.length > 0 ? params.args[0] : null;
        const code = getCodeFromRegister(registerName);

        if (code.trim()) {
            executeJavaScript(code);
        } else {
            showExecutionResult("No code found", true);
        }
    } catch (error) {
        showExecutionResult(error.message, true);
    }
});

Vim.defineEx("eval", "eval", (cm, params) => {
    try {
        // Check if a register name was provided
        const registerName =
            params.args && params.args.length > 0 ? params.args[0] : null;
        const code = getCodeFromRegister(registerName);

        if (code.trim()) {
            executeJavaScript(code);
        } else {
            showExecutionResult("No code found", true);
        }
    } catch (error) {
        showExecutionResult(error.message, true);
    }
});

Vim.defineEx("registers", "registers", (cm, params) => {
    try {
        const vimGlobalState = Vim.getVimGlobalState_();
        const registerController = vimGlobalState.registerController;

        // Check if a specific register was requested
        const registerName =
            params.args && params.args.length > 0 ? params.args[0] : null;

        if (registerName) {
            // Show specific register
            const register =
                registerController.registers[registerName] ||
                (registerName === '"'
                    ? registerController.unnamedRegister
                    : null);

            if (
                register &&
                register.keyBuffer &&
                register.keyBuffer.length > 0
            ) {
                const content = register.keyBuffer[0];
                console.log(
                    `Register '${registerName}':`,
                    JSON.stringify(content)
                );
                showExecutionResult(
                    `Register '${registerName}': ${content}`,
                    false
                );
            } else {
                console.log(`Register '${registerName}' is empty`);
                showExecutionResult(
                    `Register '${registerName}' is empty`,
                    true
                );
            }
        } else {
            // Show all registers with content
            console.log("=== VIM REGISTERS ===");

            // Show unnamed register
            const unnamedReg = registerController.unnamedRegister;
            if (
                unnamedReg &&
                unnamedReg.keyBuffer &&
                unnamedReg.keyBuffer.length > 0
            ) {
                console.log(
                    `"" (unnamed):`,
                    JSON.stringify(unnamedReg.keyBuffer[0])
                );
            }

            // Show named registers
            const registers = registerController.registers;
            for (const [regName, register] of Object.entries(registers)) {
                if (
                    register &&
                    register.keyBuffer &&
                    register.keyBuffer.length > 0
                ) {
                    console.log(
                        `"${regName}":`,
                        JSON.stringify(register.keyBuffer[0])
                    );
                }
            }

            showExecutionResult("Register contents printed to console", false);
        }
    } catch (error) {
        console.error("Error accessing registers:", error);
        showExecutionResult("Error accessing registers", true);
    }
});
