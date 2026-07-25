import { controller, Get } from "@expressots/adapter-express";
import { RequireAuthentication, RequireRoles } from "@expressots/core";

@controller("/admin")
@RequireAuthentication()
export class AdminController {
    @Get("/dashboard")
    @RequireRoles("admin")
    dashboard() {
        return { message: "Admin dashboard" };
    }
}
