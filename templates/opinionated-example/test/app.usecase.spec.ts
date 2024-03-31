import "reflect-metadata";
import { AppUseCase } from "../src/useCases/app/app.usecase";

describe("AppUseCase", () => {
    let appUseCase: AppUseCase;

    beforeEach(() => {
        appUseCase = new AppUseCase();
    });

    it("returns a valid AppResponse", () => {
        const response = appUseCase.execute();
        expect(response).toBe("Hello from ExpressoTS!");
    });
});
