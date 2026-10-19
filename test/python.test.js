import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PythonExecutor } from "../execution/python.js";
import { formatResult } from "../execution/formatters.js";

// Use the locally installed Pyodide runtime rather than the CDN. Packages
// that aren't bundled with it (e.g. numpy) are still fetched from the CDN.
const python = new PythonExecutor({
    indexURL: fileURLToPath(
        new URL("../node_modules/pyodide/", import.meta.url)
    ),
    preloadPackages: []
});
const run = async (code) => formatResult(await python.execute(code));

describe("PythonExecutor", { timeout: 120_000 }, () => {
    it("evaluates expressions", async () => {
        expect(await run("[x**2 for x in range(5)]")).toBe("[0,1,4,9,16]");
        expect(await run("None")).toBe("undefined");
    });

    it("converts dicts to plain objects", async () => {
        expect(await run('{"a": 1, "b": [1, 2]}')).toBe(
            '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}'
        );
    });

    it("captures print output alongside the result", async () => {
        expect(await run('print("hello")\nprint("world")')).toBe(
            "hello\nworld"
        );
        expect(await run('print("x"); 1 + 2')).toBe("x\n3");
    });

    it("supports top-level await", async () => {
        expect(
            await run("import asyncio\nawait asyncio.sleep(0)\n'awaited'")
        ).toBe("awaited");
    });

    it("falls back to str() for objects with no JavaScript equivalent", async () => {
        expect(
            await run("class Foo:\n  def __str__(self): return 'a Foo'\nFoo()")
        ).toBe("a Foo");
    });

    it("converts numpy arrays and scalars to plain lists and numbers", async () => {
        expect(await run("import numpy as np\nnp.array([1, 2, 3])")).toBe(
            "[1,2,3]"
        );
        expect(
            await run("import numpy as np\nnp.array([[1.5, 2], [3, 4]])")
        ).toBe("[\n  [\n    1.5,\n    2\n  ],\n  [\n    3,\n    4\n  ]\n]");
        expect(await run("import numpy as np\nnp.int64(7)")).toBe("7");
        expect(await run("import numpy as np\nnp.array(['a', 'b'])")).toBe(
            '["a","b"]'
        );
    });

    it("wraps Python errors", async () => {
        await expect(python.execute("1/0")).rejects.toThrow(
            /Python execution failed: .*ZeroDivisionError/s
        );
    });
});
