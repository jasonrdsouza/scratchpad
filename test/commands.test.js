import { describe, expect, it } from "vitest";
import { EditorSelection, EditorState } from "@codemirror/state";
import { getCommandRange } from "../commands.js";

const doc = "line 1\nline 2\nline 3\nline 4";
const stateWith = (selection) =>
    EditorState.create({
        doc,
        selection: EditorSelection.single(...selection)
    });
const textOf = (state, params) => {
    const { from, to } = getCommandRange(state, params);
    return state.doc.sliceString(from, to);
};

describe("getCommandRange", () => {
    const cursorOnLine2 = stateWith([8]);

    it("uses vim's 0-based line range", () => {
        expect(textOf(cursorOnLine2, { line: 1, lineEnd: 2 })).toBe(
            "line 2\nline 3"
        );
    });

    it("handles a single line number", () => {
        expect(textOf(cursorOnLine2, { line: 3 })).toBe("line 4");
    });

    it("clamps ranges past the end of the document", () => {
        expect(textOf(cursorOnLine2, { line: 2, lineEnd: 99 })).toBe(
            "line 3\nline 4"
        );
    });

    it("falls back to the selection, then the current line", () => {
        expect(textOf(stateWith([0, 9]), {})).toBe("line 1\nli");
        expect(textOf(cursorOnLine2, {})).toBe("line 2");
    });
});
