import { describe, expect, it } from "vitest";
import {
    detectFormat,
    formatClean,
    formatJSON,
    formatTable,
    formatText
} from "../formatting.js";

describe("formatJSON", () => {
    it("pretty prints with recursively sorted keys", () => {
        expect(formatJSON('{"b":1,"a":{"d":[{"z":1,"y":2}],"c":null}}')).toBe(
            [
                "{",
                '    "a": {',
                '        "c": null,',
                '        "d": [',
                "            {",
                '                "y": 2,',
                '                "z": 1',
                "            }",
                "        ]",
                "    },",
                '    "b": 1',
                "}"
            ].join("\n")
        );
    });

    it("rejects invalid or empty input", () => {
        expect(() => formatJSON("{nope}")).toThrow(/Invalid JSON/);
        expect(() => formatJSON("   ")).toThrow(/No text to format/);
    });
});

describe("formatClean", () => {
    it("strips trailing whitespace and blank trailing lines, normalizing to LF", () => {
        expect(formatClean("a  \r\nb\t\n\n\n")).toBe("a\nb");
    });

    it("keeps leading indentation", () => {
        expect(formatClean("  indented  ")).toBe("  indented");
    });
});

describe("formatTable", () => {
    const expected = [
        "| name  | age |",
        "|-------|-----|",
        "| Alice | 30  |",
        "| Bob   | 4   |"
    ].join("\n");

    it.each([
        ["comma", "name,age\nAlice,30\nBob,4"],
        ["tab", "name\tage\nAlice\t30\nBob\t4"],
        ["pipe", "name|age\nAlice|30\nBob|4"],
        ["semicolon", "name;age\nAlice;30\nBob;4"],
        ["multi-space", "name   age\nAlice  30\nBob    4"]
    ])("aligns %s-delimited data", (_, input) => {
        expect(formatTable(input)).toBe(expected);
    });

    it("pads short rows", () => {
        expect(formatTable("a,b,c\n1")).toBe(
            [
                "| a   | b   | c   |",
                "|-----|-----|-----|",
                "| 1   |     |     |"
            ].join("\n")
        );
    });

    it("rejects empty input", () => {
        expect(() => formatTable("  ")).toThrow(/No text to format/);
    });
});

describe("detectFormat / formatText", () => {
    it("detects JSON objects and arrays", () => {
        expect(detectFormat(' {"a":1} ')).toBe("json");
        expect(detectFormat("[1,2]")).toBe("json");
        expect(detectFormat("{not json}")).toBe("unknown");
        expect(detectFormat("hello")).toBe("unknown");
    });

    it("auto-formats detected JSON", () => {
        expect(formatText('{"b":1,"a":2}')).toEqual({
            text: '{\n    "a": 2,\n    "b": 1\n}',
            format: "json"
        });
    });

    it("dispatches explicit formats", () => {
        expect(formatText("x  ", "clean")).toEqual({
            text: "x",
            format: "clean"
        });
    });

    it("rejects unknown formats", () => {
        expect(() => formatText("hello")).toThrow(/Unsupported format/);
        expect(() => formatText("hello", "xml")).toThrow(/Unsupported format/);
    });
});
