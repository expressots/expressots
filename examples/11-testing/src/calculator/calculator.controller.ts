import { controller, Get, query } from "@expressots/adapter-express";
import { inject } from "@expressots/core";
import { CalculatorService } from "./calculator.service";

@controller("/calculator")
export class CalculatorController {
    constructor(@inject(CalculatorService) private readonly calculator: CalculatorService) {}

    @Get("/add")
    add(@query("a") a: string, @query("b") b: string) {
        return {
            operation: "add",
            a: Number(a),
            b: Number(b),
            result: this.calculator.add(Number(a), Number(b)),
        };
    }

    @Get("/multiply")
    multiply(@query("a") a: string, @query("b") b: string) {
        return {
            operation: "multiply",
            a: Number(a),
            b: Number(b),
            result: this.calculator.multiply(Number(a), Number(b)),
        };
    }
}
