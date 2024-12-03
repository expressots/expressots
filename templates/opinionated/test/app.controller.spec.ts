import request from "supertest";

import { AppFactory, StatusCode } from "@expressots/core";
import { IWebServerBuilder } from "@expressots/shared";

import { Server } from "http";
import { App } from "../src/app";

describe("AppController", () => {
    let server: Server;
    let webServerBuilder: IWebServerBuilder;

    beforeAll(async () => {
        webServerBuilder = await AppFactory.create(App);
        const app = await webServerBuilder.listen(3000);
        server = await app.getHttpServer();
    });

    afterAll(async () => {
        await server.close();
    });

    it("returns a valid AppResponse", async () => {
        return request(server)
            .get("/v1")
            .expect(StatusCode.OK)
            .expect("Hello from ExpressoTS!");
    });
});
