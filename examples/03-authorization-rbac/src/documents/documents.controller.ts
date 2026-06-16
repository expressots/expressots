import { controller, Get } from "@expressots/adapter-express";
import { RequireAuthentication, RequirePermissions } from "@expressots/core";

@controller("/documents")
@RequireAuthentication()
export class DocumentsController {
    @Get("/")
    @RequirePermissions("documents:read")
    list() {
        return { documents: [{ id: "doc1", title: "Getting started" }] };
    }
}
