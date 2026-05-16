import { controller, Get } from "@expressots/adapter-express";
import { UseInterceptors } from "@expressots/core";
import { LoggingInterceptor } from "@interceptors/logging.interceptor";
import { appConfig } from "@config/app.config";

@UseInterceptors(LoggingInterceptor)
@controller("/")
export class AppController {
    @Get("/")
    welcome() {
        return {
            name: appConfig.values.app.name,
            message: "Hello from ExpressoTS v4!",
            docs: "https://expresso-ts.com/docs/",
        };
    }

    @Get("/health")
    health() {
        return {
            status: "ok",
            uptime: process.uptime(),
            env: appConfig.values.app.env,
        };
    }
}
