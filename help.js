/**
 * Help System - Modular help documentation for all scratchpad commands
 * 
 * Provides centralized help management with easy extensibility for new commands.
 */

/**
 * Help topics registry - primary content definitions
 */
const helpContent = {
    python: {
        title: "PYTHON EXECUTION HELP",
        content: [
            "Execute any valid Python expression or statement",
            "• Supports Python 3.13.2 via Pyodide WebAssembly runtime",
            "• Pre-loaded packages: numpy, pandas, requests",
            "• Results are automatically stored in \"r register",
            "• First execution may take a moment to load the Python runtime",
            "",
            "Examples:",
            "  :py print(\"Hello, World!\")",
            "  :py [x**2 for x in range(5)]",
            "  :py import math; math.pi * 2",
            "  :python sum([1, 2, 3, 4, 5])",
            "  :py import numpy as np; np.array([1,2,3])",
            "  :py import pandas as pd; pd.DataFrame({\"a\": [1,2,3]})",
            "  :py import requests; requests.get(\"https://httpbin.org/json\").json()",
            "",
            "Note: Additional packages can be installed using micropip:",
            "  :py import micropip; await micropip.install(\"matplotlib\")"
        ]
    },

    javascript: {
        title: "JAVASCRIPT EXECUTION HELP",
        content: [
            "Execute any valid JavaScript expression or statement",
            "• Access browser APIs: console, window, document, etc.",
            "• Use modern JavaScript features: async/await, arrow functions, etc.",
            "• Results are automatically stored in \"r register",
            "",
            "Examples:",
            "  :js Math.PI * 2",
            "  :js [1,2,3].map(x => x * 2)",
            "  :js fetch('/api/data').then(r => r.json())"
        ]
    },

    fmt: {
        title: ":fmt COMMAND HELP",
        content: [
            "The :fmt command formats text in various ways:",
            "",
            "Usage:",
            "  :fmt           - Auto-detect format (currently detects JSON)",
            "  :fmt json      - Format as JSON with alphabetized keys",
            "  :fmt clean     - Remove trailing whitespace, normalize line endings",
            "  :fmt table     - Convert CSV/TSV to aligned ASCII table",
            "",
            "Range Support:",
            "  :'<,'>fmt      - Format visual selection",
            "  :10,20fmt      - Format specific line range",
            "  :fmt           - Format current line (if no selection)",
            "",
            "Examples:",
            '  Select {"name":"John","age":30} and run :\'<,\'>fmt',
            "  Select CSV data and run :\'<,\'>fmt table",
            "  Run :fmt clean to remove trailing spaces",
            "",
            "Supported Table Formats:",
            "  • CSV (comma-separated)",
            "  • TSV (tab-separated)", 
            "  • Pipe-delimited (|)",
            "  • Semicolon-delimited (;)",
            "  • Space-separated (multiple spaces)"
        ]
    }
};

/**
 * Aliases map - points aliases to primary content keys
 */
const helpAliases = {
    py: "python",
    js: "javascript", 
    eval: "javascript"
};

/**
 * Generate the main help summary
 * @param {string[]} supportedLanguages - Array of supported execution languages
 * @returns {string} Complete help summary
 */
export function getMainHelp(supportedLanguages) {
    return [
        "=== SCRATCHPAD HELP ===",
        "",
        "File Operations:",
        "  :w             - Save/write current content",
        "  :q             - Quit/close window",
        "  :wq            - Write and quit",
        "",
        "Code Execution:",
        "  :js <code>     - Execute JavaScript",
        "  :py <code>     - Execute Python",
        "  :python <code> - Execute Python (alias)",
        "  :eval <code>   - Execute JavaScript (alias)",
        "",
        "Code from Registers:",
        "  :js a          - Execute JavaScript from register 'a'",
        "  :py            - Execute Python from unnamed register (yanked code)",
        "  Results stored in register 'r' - use \"rp to paste",
        "",
        "Text Formatting:",
        "  :fmt           - Auto-format selection/line (detects JSON)",
        "  :fmt json      - Format as JSON with sorted keys",
        "  :fmt clean     - Remove trailing whitespace, normalize line endings",
        "  :fmt table     - Convert CSV/TSV to aligned ASCII table",
        "  :'<,'>fmt      - Format visual selection",
        "  :10,20fmt      - Format specific line range",
        "",
        "Theme & Settings:",
        "  :colorscheme   - Show current theme and available options",
        "  :colo <theme>  - Change theme (short form)",
        "  :theme <theme> - Change theme (alternative)",
        "  :set ft=<lang> - Set file type for syntax highlighting",
        "",
        "Other Commands:",
        "  :registers     - Show all vim registers",
        "  :registers r   - Show results register",
        "  :help <lang>   - Show help for specific language",
        "  :help <topic>  - Show help for specific topic (e.g., :help fmt)",
        "",
        `Available languages: ${supportedLanguages.join(", ")}`,
        `Available help topics: ${Object.keys(helpTopics).join(", ")}`,
        "",
        "Examples:",
        "  :help py       - Show Python help",
        "  :help js       - Show JavaScript help",
        "  :help fmt      - Show formatting help"
    ].join("\n");
}

/**
 * Get help for a specific topic
 * @param {string} topic - Topic to get help for
 * @returns {string|null} Help text or null if topic not found
 */
export function getTopicHelp(topic) {
    const normalizedTopic = topic.toLowerCase();
    
    // Check for alias first, then direct topic
    const contentKey = helpAliases[normalizedTopic] || normalizedTopic;
    const helpTopic = helpContent[contentKey];
    
    if (!helpTopic) {
        return null;
    }
    
    return [
        `=== ${helpTopic.title} ===`,
        "",
        ...helpTopic.content
    ].join("\n");
}

/**
 * Get list of available help topics (includes aliases)
 * @returns {string[]} Array of available topic names
 */
export function getAvailableTopics() {
    return [...Object.keys(helpContent), ...Object.keys(helpAliases)];
}

/**
 * Add a new help topic (for future extensibility)
 * @param {string} topic - Topic name
 * @param {string} title - Display title
 * @param {string[]} content - Array of content lines
 */
export function addHelpTopic(topic, title, content) {
    helpContent[topic.toLowerCase()] = {
        title,
        content
    };
}