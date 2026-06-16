import { controller, Get, Post, body } from "@expressots/adapter-express";

interface EchoBody {
    message: string;
}

@controller("/")
export class AppController {
    @Get("/")
    welcome() {
        return {
            message: "OpenAPI and Studio example",
            example: "15-openapi-studio",
            docs: "https://doc.expresso-ts.com/docs/features/openapi",
            studio: "https://doc.expresso-ts.com/docs/studio/overview",
        };
    }

    @Get("/health")
    health() {
        return {
            status: "ok",
            uptime: process.uptime(),
        };
    }

    @Post("/echo")
    echo(@body() payload: EchoBody) {
        return {
            echoed: payload,
            receivedAt: new Date().toISOString(),
        };
    }
}
