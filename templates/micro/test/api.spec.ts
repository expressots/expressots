import "reflect-metadata";
import { createMicroAPI } from "@expressots/adapter-express";
import { Server } from "http";
import { createFluentRequest } from "@expressots/core";

describe("MicroAPI", () => {
    let httpServer: Server;
    let baseUrl: string;

    beforeAll(async () => {
        const microAPI = createMicroAPI();
        const app = microAPI.build();

        // Add routes for testing
        app.Route.get("/", (req, res) => {
            res.json({
                message: "Hello from ExpressoTS Micro!",
                version: "4.0.0",
            });
        });

        app.Route.get("/health", (req, res) => {
            res.json({
                status: "healthy",
                timestamp: new Date().toISOString(),
            });
        });

        // Listen on random port
        await app.listen(0);
        httpServer = microAPI.getHttpServer();
        const address = httpServer.address() as { port: number };
        baseUrl = `http://localhost:${address.port}`;
    });

    afterAll(() => {
        httpServer?.close();
    });

    describe("GET /", () => {
        it("should return welcome message", async () => {
            const request = createFluentRequest(baseUrl);
            const response = await request
                .get("/")
                .expectStatus(200)
                .execute();

            expect(response.body).toHaveProperty("message");
            expect(response.body.message).toBe("Hello from ExpressoTS Micro!");
        });
    });

    describe("GET /health", () => {
        it("should return health status", async () => {
            const request = createFluentRequest(baseUrl);
            const response = await request
                .get("/health")
                .expectStatus(200)
                .execute();

            expect(response.body.status).toBe("healthy");
            expect(response.body).toHaveProperty("timestamp");
        });
    });

    describe("Performance", () => {
        it("should respond quickly", async () => {
            const request = createFluentRequest(baseUrl);
            await request
                .get("/")
                .expectStatus(200)
                .expectTime({ lessThan: 50 })
                .execute();
        });
    });
});
