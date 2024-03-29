import "reflect-metadata";
import { AppUseCase } from "../src/app/app.usecase";

describe("AppUseCase", () => {
    it("returns Hello Expresso TS!", () => {
        const appUseCase = new AppUseCase();
        const result = appUseCase.execute();

        expect(result).toBe("Hello from ExpressoTS!");
    });
});
