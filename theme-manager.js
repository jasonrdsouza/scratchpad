import { nord } from "cm6-theme-nord";
import {
    solarizedLight,
    solarizedDark,
    githubLight,
    githubDark,
    materialLight,
    materialDark,
    gruvboxLight,
    gruvboxDark,
    tokyoNight,
    tokyoNightDay,
    tokyoNightStorm,
    basicLight,
    basicDark
} from "@uiw/codemirror-themes-all";
import {
    STORAGE_KEYS,
    DEFAULTS,
    ALL_THEMES,
    THEMES,
    ERROR_MESSAGES
} from "./config.js";

// Theme registry with all available themes
const themes = {
    // Current theme (dark)
    nord: nord,

    // Light themes
    "solarized-light": solarizedLight,
    "github-light": githubLight,
    "material-light": materialLight,
    "gruvbox-light": gruvboxLight,
    "tokyo-night-day": tokyoNightDay,
    "basic-light": basicLight,

    // Dark themes
    "solarized-dark": solarizedDark,
    "github-dark": githubDark,
    "material-dark": materialDark,
    "gruvbox-dark": gruvboxDark,
    "tokyo-night": tokyoNight,
    "tokyo-night-storm": tokyoNightStorm,
    "basic-dark": basicDark
};

/**
 * Get the current theme name from localStorage or default
 */
export function getCurrentTheme() {
    return localStorage.getItem(STORAGE_KEYS.THEME) || DEFAULTS.THEME;
}

/**
 * Get the theme extension for a given theme name
 */
export function getTheme(themeName = null) {
    const name = themeName || getCurrentTheme();
    return themes[name] || themes[DEFAULTS.THEME];
}

/**
 * Get all available theme names
 */
export function getAvailableThemes() {
    return ALL_THEMES;
}

/**
 * Check if a theme name is valid
 */
export function isValidTheme(themeName) {
    return themes.hasOwnProperty(themeName);
}

/**
 * Save theme preference to localStorage
 */
export function saveTheme(themeName) {
    if (isValidTheme(themeName)) {
        localStorage.setItem(STORAGE_KEYS.THEME, themeName);
        return true;
    }
    return false;
}

/**
 * Switch theme in the editor using a theme compartment
 */
export function switchTheme(editorView, themeName, themeCompartment) {
    if (!isValidTheme(themeName)) {
        throw new Error(
            ERROR_MESSAGES.UNKNOWN_THEME(themeName, getAvailableThemes())
        );
    }

    // Save theme preference
    saveTheme(themeName);

    // Get the new theme extension
    const newTheme = getTheme(themeName);

    // Use the compartment to switch the theme
    editorView.dispatch({
        effects: themeCompartment.reconfigure(newTheme)
    });

    console.log(`Switched to theme: ${themeName}`);
    return themeName;
}

/**
 * Get theme information for display
 */
export function getThemeInfo(themeName) {
    if (!isValidTheme(themeName)) {
        return null;
    }

    // Use centralized theme categorization
    const lightThemes = THEMES.LIGHT;
    const darkThemes = THEMES.DARK;

    return {
        name: themeName,
        type: THEMES.LIGHT.includes(themeName) ? "light" : "dark",
        family: themeName.split("-")[0] // e.g., "solarized", "github", etc.
    };
}
