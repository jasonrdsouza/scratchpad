import { describe, expect, it } from "vitest";
import { formatForConsole, formatResult } from "../execution/formatters.js";
import { OutputResult } from "../execution/executor.js";

describe("formatResult", () => {
    it.each([
        [undefined, "undefined"],
        [null, "null"],
        [true, "true"],
        [42, "42"],
        [NaN, "NaN"],
        [-Infinity, "-Infinity"],
        [0.1 + 0.2, "0.300000000000"],
        [1.5, "1.5"],
        [1e12, "1e+12"],
        [0.00001, "1e-5"],
        [10n, "10n"],
        ["plain", "plain"],
        ["two\nlines", '"two\\nlines"'],
        ['say "hi"', '"say \\"hi\\""']
    ])("formats %o as %s", (value, expected) => {
        expect(formatResult(value)).toBe(expected);
    });

    it("formats short arrays of primitives inline", () => {
        expect(formatResult([1, "a", null])).toBe('[1,"a",null]');
        expect(formatResult([])).toBe("[]");
    });

    it("pretty prints long or nested arrays", () => {
        expect(formatResult([1, 2, 3, 4, 5, 6])).toBe(
            "[\n  1,\n  2,\n  3,\n  4,\n  5,\n  6\n]"
        );
        expect(formatResult([[1], [2]])).toBe(
            "[\n  [\n    1\n  ],\n  [\n    2\n  ]\n]"
        );
    });

    it("pretty prints objects as JSON", () => {
        expect(formatResult({ a: 1, b: [2] })).toBe(
            '{\n  "a": 1,\n  "b": [\n    2\n  ]\n}'
        );
    });

    it("formats typed arrays and BigInts as plain arrays and numbers", () => {
        expect(formatResult(new Int32Array([1, 2, 3]))).toBe("[1,2,3]");
        expect(formatResult(new BigInt64Array([7n]))).toBe("[7]");
        expect(formatResult({ data: new Float64Array([1.5]) })).toBe(
            '{\n  "data": [\n    1.5\n  ]\n}'
        );
    });

    it("formats dates, errors and unserializable objects", () => {
        expect(formatResult(new Date("2024-01-02T03:04:05Z"))).toBe(
            "2024-01-02T03:04:05.000Z"
        );
        expect(formatResult(new Error("boom"))).toBe("Error: boom");

        class Loop {
            constructor() {
                this.self = this;
            }
        }
        expect(formatResult(new Loop())).toBe("[Object Loop]");
    });

    it("formats functions", () => {
        expect(formatResult((x) => x * 2)).toBe("(x) => x * 2");
        const long = function namedFunction(a, b) {
            // a long body
            return a + b;
        };
        expect(formatResult(long)).toBe("function namedFunction() { ... }");
    });

    it("combines printed output with the result value", () => {
        expect(formatResult(new OutputResult("hello\nworld", undefined))).toBe(
            "hello\nworld"
        );
        expect(formatResult(new OutputResult("x", [1, 2]))).toBe("x\n[1,2]");
    });
});

describe("formatForConsole", () => {
    it("passes objects through and formats primitives", () => {
        const obj = { a: 1 };
        expect(formatForConsole(obj)).toBe(obj);
        expect(formatForConsole(NaN)).toBe("NaN");
    });
});
