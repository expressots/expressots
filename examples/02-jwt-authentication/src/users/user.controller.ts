import { controller, Get, principal } from "@expressots/adapter-express";
import {
    RequireAuthentication,
    RequireRoles,
    RequirePermissions,
    UseGuards,
} from "@expressots/core";
import { JwtAuthGuard, JwtPrincipal } from "@expressots/jwt";
@controller("/users")
export class UserController {
    @Get("/me")
    @RequireAuthentication()
    @RequirePermissions("profile:read")
    me(@principal() user: JwtPrincipal) {
        return user.details;
    }
    @Get("/admin")
    @UseGuards(JwtAuthGuard)
    @RequireRoles("admin")
    admin(@principal() user: JwtPrincipal) {
        return user.details;
    }
}
