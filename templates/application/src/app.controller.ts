import { controller, Get } from "@expressots/adapter-express";
import { config } from "./config";

interface AppInfo {
    name: string;
    version: string;
    environment: string;
    message: string;
}

@controller("/")
export class AppController {
    @Get("/")
    execute(): AppInfo {
        return {
            name: config.app.name,
            version: config.app.version,
            environment: config.app.environment,
            message: "Welcome to ExpressoTS!",
        };
    }

    @Get("/health")
    health(): { status: string; timestamp: string } {
        return {
            status: "healthy",
            timestamp: new Date().toISOString(),
        };
    }
}

