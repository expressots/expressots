import { controller, Get, principal } from "@expressots/adapter-express";
import { RequireAuthentication } from "@expressots/core";
import { AppPrincipal } from "../auth/app-principal";

@controller("/users")
export class UserController {
    @Get("/me")
    @RequireAuthentication()
    me(@principal() user: AppPrincipal) {
        return user.details;
    }
}
