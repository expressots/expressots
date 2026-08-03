import { centerText } from "../../src/utils/center-text";

describe("centerText", () => {
	const originalColumns = Object.getOwnPropertyDescriptor(
		process.stdout,
		"columns",
	);

	const setColumns = (value: number | undefined): void => {
		Object.defineProperty(process.stdout, "columns", {
			value,
			configurable: true,
			writable: true,
		});
	};

	afterEach(() => {
		if (originalColumns) {
			Object.defineProperty(process.stdout, "columns", originalColumns);
		}
	});

	it("centres text in a normal terminal", () => {
		setColumns(80);

		const result = centerText("hello");

		// (80 - 5) / 2 floored = 37
		expect(result).toBe(`${" ".repeat(37)}hello`);
	});

	it("does not throw when the terminal is narrower than the text", () => {
		setColumns(10);

		// This threw `RangeError: Invalid count value: -N` and took the whole
		// CLI down after a successful scaffold.
		expect(() => centerText("a text far wider than ten columns")).not.toThrow();
		expect(centerText("a text far wider than ten columns")).toBe(
			"a text far wider than ten columns",
		);
	});

	it("does not throw when the text exactly fills the terminal", () => {
		setColumns(5);

		expect(centerText("hello")).toBe("hello");
	});

	it("falls back to a fixed width when stdout is not a TTY", () => {
		setColumns(undefined);

		// (120 - 5) / 2 floored = 57
		expect(centerText("hello")).toBe(`${" ".repeat(57)}hello`);
	});

	it("falls back to a fixed width when columns is zero", () => {
		setColumns(0);

		expect(centerText("hello")).toBe(`${" ".repeat(57)}hello`);
	});
});
