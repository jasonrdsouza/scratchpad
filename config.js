/**
 * Centralized Configuration
 *
 * Contains all constants, storage keys, defaults, and configuration values
 * used throughout the scratchpad application.
 */

/**
 * LocalStorage keys for data persistence
 */
export const STORAGE_KEYS = {
    CONTENT: "vim-scratchpad-content",
    FILETYPE: "vim-scratchpad-filetype",
    THEME: "vim-scratchpad-theme",
    WRAP: "vim-scratchpad-wrap",
    RELATIVE_NUMBERS: "vim-scratchpad-relativenumber",
    VIM_COMMAND_HISTORY: "vim-command-history",
    VIM_SEARCH_HISTORY: "vim-search-history",
    EDITOR_STATE: "editor-state"
};

/**
 * Application defaults
 */
export const DEFAULTS = {
    THEME: "nord",
    CONTENT: "Welcome to your Vim Scratchpad!\n\n:set filetype=markdown",
    WRAP: false,
    RELATIVE_NUMBERS: false,
    EXECUTION_LANGUAGE: "javascript"
};

/**
 * Timing and performance settings
 */
export const TIMING = {
    AUTOSAVE_INTERVAL_MS: 5000,
    VIM_INIT_DELAY_MS: 100,
    RESULT_DISPLAY_TIMEOUT_MS: 5000,
    RESULT_HIDE_ANIMATION_MS: 300
};

/**
 * UI configuration
 */
export const UI = {
    FONT_FAMILY: '"Fira Code", monospace',
    FONT_SIZE: "1.1rem",
    POPUP_Z_INDEX: 101,
    MODE_INDICATOR_Z_INDEX: 100,
    POPUP_OFFSETS: {
        BOTTOM: 60,
        RIGHT: 20,
        MODE_INDICATOR_BOTTOM: 20,
        MODE_INDICATOR_RIGHT: 20
    },
    MAX_POPUP_WIDTH: 300,
    MAX_POPUP_HEIGHT: 200
};

/**
 * Theme categories and names
 */
export const THEMES = {
    LIGHT: [
        "solarized-light",
        "github-light",
        "material-light",
        "gruvbox-light",
        "tokyo-night-day",
        "basic-light"
    ],
    DARK: [
        "nord",
        "solarized-dark",
        "github-dark",
        "material-dark",
        "gruvbox-dark",
        "tokyo-night",
        "tokyo-night-storm",
        "basic-dark"
    ]
};

/**
 * All available theme names (computed)
 */
export const ALL_THEMES = [...THEMES.LIGHT, ...THEMES.DARK].sort();

/**
 * Language aliases and mappings
 */
export const LANGUAGE_ALIASES = {
    md: "markdown",
    py: "python",
    js: "javascript",
    ts: "typescript",
    tsx: "typescript-jsx",
    jsx: "javascript-jsx",
    yml: "yaml"
};

/**
 * Execution language mappings
 */
export const EXECUTION_LANGUAGES = {
    JAVASCRIPT: ["javascript", "js"],
    PYTHON: ["python", "py"]
};

/**
 * Register names and patterns
 */
export const REGISTERS = {
    UNNAMED: '"',
    RESULT: "r",
    VALID_PATTERN: /^[a-zA-Z0-9"=_]$/
};

/**
 * Vim command abbreviations
 */
export const VIM_ABBREVIATIONS = {
    RELATIVE_NUMBER: {
        ENABLE: ["relativenumber", "relati", "rela", "rnu"],
        DISABLE: ["norelativenumber", "norelati", "norela", "nornu"]
    },
    THEME: ["colorscheme", "colo", "theme"],
    FILETYPE: ["filetype", "ft"]
};

/**
 * Nord color scheme (for CSS consistency)
 */
export const NORD_COLORS = {
    NORD0: "#2e3440", // Polar Night - darkest
    NORD1: "#3b4252", // Polar Night
    NORD2: "#434c5e", // Polar Night
    NORD3: "#4c566a", // Polar Night - lightest
    NORD4: "#d8dee9", // Snow Storm - darkest
    NORD5: "#e5e9f0", // Snow Storm
    NORD6: "#eceff4", // Snow Storm - lightest
    NORD7: "#8fbcbb", // Frost - cyan
    NORD8: "#88c0d0", // Frost - bright cyan
    NORD9: "#81a1c1", // Frost - blue
    NORD10: "#5e81ac", // Frost - dark blue
    NORD11: "#bf616a", // Aurora - red
    NORD12: "#d08770", // Aurora - orange
    NORD13: "#ebcb8b", // Aurora - yellow
    NORD14: "#a3be8c", // Aurora - green
    NORD15: "#b48ead" // Aurora - purple
};

/**
 * File format detection patterns
 */
export const FORMAT_PATTERNS = {
    JSON: {
        START_PATTERNS: ["{", "["],
        END_PATTERNS: ["}", "]"]
    },
    CSV_DELIMITERS: [",", "\t", "|", ";"],
    MULTI_SPACE_REGEX: /\s{2,}/
};

/**
 * Help system configuration
 */
export const HELP = {
    MAX_REGISTER_DISPLAY_LENGTH: 50,
    REGISTER_NEWLINE_REPLACEMENT: "↵",
    MIN_TABLE_COLUMN_WIDTH: 3
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
    UNKNOWN_THEME: (theme, available) =>
        `Unknown theme: ${theme}. Available themes: ${available.join(", ")}`,
    REGISTER_NOT_FOUND: (register) =>
        `Register '${register}' is empty or not found`,
    NO_CODE_FOUND: "No code found",
    INVALID_JSON: (error) => `Invalid JSON: ${error}`,
    UNSUPPORTED_FORMAT: (format) =>
        `Unsupported format type: ${format}. Currently supported: 'json', 'clean', 'table'.`,
    UNSUPPORTED_LANGUAGE: (language) => `Unsupported language: ${language}`,
    UNKNOWN_WHITESPACE_ACTION: (action) =>
        `Unknown whitespace action: ${action}. Use 'on', 'off', or 'toggle'.`,
    NO_TEXT_TO_FORMAT: "No text to format",
    NO_DATA_TO_FORMAT: "No data to format as table"
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
    THEME_SWITCHED: (theme) => `Switched to theme: ${theme}`,
    RELATIVE_NUMBERS_ENABLED: "Relative line numbers enabled",
    ABSOLUTE_NUMBERS_ENABLED: "Absolute line numbers enabled",
    WHITESPACE_VISIBLE: "Whitespace is now visible",
    WHITESPACE_HIDDEN: "Whitespace is now hidden",
    FORMAT_SUCCESS: (format) => `Formatted as ${format.toUpperCase()}`
};
