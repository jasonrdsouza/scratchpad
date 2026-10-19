import { describe, expect, it } from "vitest";
import { Vim } from "@replit/codemirror-vim";
import { executionEngine } from "../execution/engine.js";
import { JavaScriptExecutor } from "../execution/javascript.js";

const resultsRegister = () =>
    Vim.getVimGlobalState_().registerController.registers.r?.keyBuffer?.[0];

describe("JavaScriptExecutor", () => {
    const js = new JavaScriptExecutor();

    it("evaluates expressions and awaits promises", async () => {
        expect(await js.execute("6 * 7")).toBe(42);
        expect(await js.execute("Promise.resolve('done')")).toBe("done");
    });

    it("runs in global scope, so var declarations persist", async () => {
        await js.execute("var persistedValue = 41");
        expect(await js.execute("persistedValue + 1")).toBe(42);
    });

    it("can't see the executor's module locals", async () => {
        await expect(js.execute("code")).rejects.toThrow(/code is not defined/);
    });

    it("wraps errors", async () => {
        await expect(js.execute("throw new Error('boom')")).rejects.toThrow(
            "JavaScript execution failed: boom"
        );
    });
});

describe("executionEngine", () => {
    it("lists languages without aliases", () => {
        expect(executionEngine.getSupportedLanguages()).toEqual([
            "javascript",
            "python"
        ]);
    });

    it("formats results and stores them in the r register", async () => {
        const result = await executionEngine.execute(
            "[1, 2].map((x) => x * 2)",
            "js"
        );
        expect(result).toMatchObject({
            success: true,
            formattedResult: "[2,4]",
            language: "JavaScript"
        });
        expect(resultsRegister()).toBe("[2,4]");
    });

    it("reports errors and unknown languages", async () => {
        expect(
            await executionEngine.execute("nope(", "javascript")
        ).toMatchObject({
            success: false
        });
        expect(await executionEngine.execute("1", "cobol")).toMatchObject({
            success: false,
            error: "Unsupported language: cobol"
        });
    });
});
