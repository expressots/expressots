import { createMicroAPI } from "@expressots/adapter-express";
import { Server } from "http";
import request from "supertest";

describe("MicroAPI Root Route", () => {
    let httpServer: Server;

    beforeAll(() => {
        const microAPI = createMicroAPI();
        const app = microAPI.build();
        app.listen(0);

        httpServer = microAPI.getHttpServer();
    });

    afterAll(() => {
        httpServer.close();
    });

    it("should return Hello from ExpressoTS!", () => {
        request(httpServer)
            .get("/")
            .expect(200)
            .expect("Hello from ExpressoTS!");
    });
});
