import {
    createTestApp,
    setupExpressoTSMatchers,
    TestAppResult,
} from "@expressots/core";
import { afterAll, beforeAll, describe, it } from "@jest/globals";
import { App } from "../src/app";
import { signTestToken } from "./helpers";

setupExpressoTSMatchers();

describe("RBAC authorization", () => {
    let testApp: TestAppResult;

    beforeAll(async () => {
        testApp = await createTestApp(App, {
            env: {
                NODE_ENV: "test",
                JWT_SECRET: "dev-secret-change-me-min-32-chars-long",
            },
            autoCleanup: false,
        });
    });

    afterAll(async () => {
        await testApp.cleanup();
    });

    describe("AdminController @RequireRoles('admin')", () => {
        it("returns 401 without authentication", async () => {
            await testApp.request.get("/api/admin/dashboard").expectStatus(401).execute();
        });

        it("returns 403 for authenticated user without admin role", async () => {
            const token = signTestToken({ id: "u1", roles: ["user"] });

            await testApp.request
                .get("/api/admin/dashboard")
                .set("Authorization", `Bearer ${token}`)
                .expectStatus(403)
                .execute();
        });

        it("returns 200 for admin role", async () => {
            const token = signTestToken({
                id: "admin1",
                roles: ["admin"],
                permissions: ["documents:read"],
            });

            await testApp.request
                .get("/api/admin/dashboard")
                .set("Authorization", `Bearer ${token}`)
                .expectStatus(200)
                .expectBodyPath("message", "Admin dashboard")
                .execute();
        });
    });

    describe("DocumentsController @RequirePermissions('documents:read')", () => {
        it("returns 401 without authentication", async () => {
            await testApp.request.get("/api/documents").expectStatus(401).execute();
        });

        it("returns 403 without documents:read permission", async () => {
            const token = signTestToken({ id: "u1", roles: ["user"], permissions: ["profile:read"] });

            await testApp.request
                .get("/api/documents")
                .set("Authorization", `Bearer ${token}`)
                .expectStatus(403)
                .execute();
        });

        it("returns 200 with documents:read permission", async () => {
            const token = signTestToken({
                id: "admin1",
                roles: ["admin"],
                permissions: ["documents:read"],
            });

            await testApp.request
                .get("/api/documents")
                .set("Authorization", `Bearer ${token}`)
                .expectStatus(200)
                .execute();
        });
    });
});
