import { GreeterProvider } from "../src/greeter.provider";

describe("GreeterProvider", () => {
    it("returns the default greeting", () => {
        const greeter = new GreeterProvider();
        expect(greeter.greet("World")).toBe("Hello, World!");
    });

    it("respects the prefix option", () => {
        const greeter = new GreeterProvider({ prefix: "Olá" });
        expect(greeter.greet("ExpressoTS")).toBe("Olá, ExpressoTS!");
    });
});
