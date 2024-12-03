import { createMicroAPI } from "@expressots/adapter-express";
import { Application, Request, Response } from "express";
import request from "supertest";

describe("MicroAPI Root Route", () => {
    let httpServer: Application;

    beforeAll(() => {
        const microAPI = createMicroAPI();
        microAPI.setGlobalRoutePrefix("/v1");

        const app = microAPI.build();

        app.Route.get("/", (req: Request, res: Response) => {
            res.send("Hello from ExpressoTS!");
        });

        httpServer = microAPI.getHttpServer();
    });

    it("should return Hello from ExpressoTS!", () => {
        request.agent(httpServer, { http2: true }).get("/v1").expect(200);
    });
});
