import { micro, MicroApp } from "@expressots/adapter-express";
import { AddressInfo } from "net";

describe("Micro API", () => {
    let api: MicroApp;
    let baseUrl: string;

    beforeAll(async () => {
        api = micro({ showBanner: false });
        api.get("/", () => "Hello from ExpressoTS Micro API!");
        api.get("/health", () => ({ status: "ok" }));
        await api.listen(0);

        const { port } = api.getHttpServer().address() as AddressInfo;
        baseUrl = `http://localhost:${port}`;
    });

    afterAll(async () => {
        await new Promise<void>((resolve) =>
            api.getHttpServer().close(() => resolve()),
        );
    });

    it("should return hello message on GET /", async () => {
        const response = await fetch(`${baseUrl}/`);

        expect(response.status).toBe(200);
        expect(await response.text()).toBe("Hello from ExpressoTS Micro API!");
    });

    it("should return ok status on GET /health", async () => {
        const response = await fetch(`${baseUrl}/health`);

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: "ok" });
    });
});
