import "reflect-metadata";

import { AppController } from "../src/app.controller";

describe("AppController", () => {
    it("returns Hello Expresso TS!", () => {
        const appController = new AppController();
        const result = appController.execute();

        expect(result).toBe("Hello from ExpressoTS!");
    });
});
