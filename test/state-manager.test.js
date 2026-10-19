import { beforeEach, describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { history } from "@codemirror/commands";
import { STORAGE_KEYS } from "../config.js";
import {
    restoreEditorState,
    saveContent,
    saveContentIfChanged,
    saveEditorState,
    stateFields
} from "../state-manager.js";

const store = new Map();
vi.stubGlobal("localStorage", {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
});

const extensions = [history()];
const fakeView = (doc) => ({
    state: EditorState.create({ doc, extensions })
});
const storeState = (doc) =>
    store.set(
        STORAGE_KEYS.EDITOR_STATE,
        JSON.stringify(fakeView(doc).state.toJSON(stateFields))
    );

beforeEach(() => store.clear());

describe("restoreEditorState", () => {
    it("returns null when nothing is saved", () => {
        expect(restoreEditorState(extensions)).toBeNull();
    });

    it("restores state that matches the saved content", () => {
        storeState("hello");
        store.set(STORAGE_KEYS.CONTENT, "hello");
        expect(restoreEditorState(extensions).doc.toString()).toBe("hello");
    });

    it("discards state that is out of date with the saved content", () => {
        storeState("old");
        store.set(STORAGE_KEYS.CONTENT, "newer");
        expect(restoreEditorState(extensions)).toBeNull();
    });

    it("discards unparseable state", () => {
        store.set(STORAGE_KEYS.EDITOR_STATE, "{not json");
        expect(restoreEditorState(extensions)).toBeNull();
    });
});

describe("saving", () => {
    it("only autosaves content edited since this tab's last save", () => {
        saveContent(fakeView("mine"));
        expect(store.get(STORAGE_KEYS.CONTENT)).toBe("mine");

        // Another tab saves newer content; this tab hasn't changed anything
        store.set(STORAGE_KEYS.CONTENT, "from another tab");
        saveContentIfChanged(fakeView("mine"));
        expect(store.get(STORAGE_KEYS.CONTENT)).toBe("from another tab");

        // Once this tab edits, its content is saved
        saveContentIfChanged(fakeView("mine, edited"));
        expect(store.get(STORAGE_KEYS.CONTENT)).toBe("mine, edited");
    });

    it("saves editor state alongside content on :w", () => {
        saveContent(fakeView("doc"));
        const saved = JSON.parse(store.get(STORAGE_KEYS.EDITOR_STATE));
        expect(saved.doc).toBe("doc");
    });

    it("doesn't save editor state that doesn't match the saved content", () => {
        store.set(STORAGE_KEYS.CONTENT, "current");
        saveEditorState(fakeView("stale"));
        expect(store.has(STORAGE_KEYS.EDITOR_STATE)).toBe(false);
    });
});
