import { micro, MicroApp } from "@expressots/adapter-express";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { AddressInfo, Server } from "net";

const MOCK_USERS = [
    { id: "1", name: "Ada Lovelace", email: "ada@example.com" },
    { id: "2", name: "Grace Hopper", email: "grace@example.com" },
    { id: "3", name: "Margaret Hamilton", email: "margaret@example.com" },
];

describe("Micro API", () => {
    let api: MicroApp;
    let server: Server;
    let baseUrl: string;

    beforeAll(async () => {
        api = micro({ showBanner: false });
        api.get("/", () => ({
            name: "ExpressoTS Micro API",
            example: "13-micro-api",
            message: "Hello from ExpressoTS Micro API!",
        }));
        api.get("/health", () => ({
            status: "ok",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        }));
        api.get("/users", () => ({
            users: MOCK_USERS,
            count: MOCK_USERS.length,
        }));
        await api.listen(0);

        server = api.getHttpServer()!;
        const { port } = server.address() as AddressInfo;
        baseUrl = `http://localhost:${port}`;
    });

    afterAll(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    it("GET / returns welcome payload", async () => {
        const response = await fetch(`${baseUrl}/`);

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            example: "13-micro-api",
            message: "Hello from ExpressoTS Micro API!",
        });
    });

    it("GET /health returns ok", async () => {
        const response = await fetch(`${baseUrl}/health`);

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ status: "ok" });
    });

    it("GET /users returns mock user list", async () => {
        const response = await fetch(`${baseUrl}/users`);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            users: MOCK_USERS,
            count: MOCK_USERS.length,
        });
    });
});
