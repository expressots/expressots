import { describe, it, expect } from "@jest/globals";
import { AppController } from "../src/app.controller";

describe("AppController", () => {
    let controller: AppController;

    beforeEach(() => {
        controller = new AppController();
    });

    describe("execute", () => {
        it("should return application info", () => {
            const mockRes = {} as any;
            const result = controller.execute(mockRes);

            expect(result).toBeDefined();
            expect(result.message).toBe("Welcome to ExpressoTS!");
            expect(result).toHaveProperty("name");
            expect(result).toHaveProperty("version");
            expect(result).toHaveProperty("environment");
        });
    });

    describe("health", () => {
        it("should return health status", () => {
            const mockRes = {} as any;
            const result = controller.health(mockRes);

            expect(result.status).toBe("healthy");
            expect(result).toHaveProperty("timestamp");
        });
    });
});

