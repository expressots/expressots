import { describe, expect, it } from "@jest/globals";
import { CalculatorService } from "../../src/calculator/calculator.service";

describe("CalculatorService (unit)", () => {
    const calculator = new CalculatorService();

    it("adds two numbers", () => {
        expect(calculator.add(2, 3)).toBe(5);
    });

    it("multiplies two numbers", () => {
        expect(calculator.multiply(4, 5)).toBe(20);
    });

    it("throws when dividing by zero", () => {
        expect(() => calculator.divide(10, 0)).toThrow("Division by zero");
    });
});
