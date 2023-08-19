import express from "express";
import { LogLevel, log } from "../logger";

class MiddlewareResolver {
    private middlewareRegistry: { [key: string]: string } = {
        cors: "cors",
        // Add other middlewares
    };

    getMiddleware(middlewareName: string, ...options: any): express.RequestHandler | null {
        const packageName = this.middlewareRegistry[middlewareName];

        if (!packageName) {
            console.error(`Middleware ${middlewareName} not found`);
            return null;
        }

        let hasMiddleware = "";
        try {
            hasMiddleware = require.resolve(packageName, { paths: [process.cwd()] });
        } catch (error) {
        }

        if (hasMiddleware) {
            const middleware =  require(hasMiddleware);
            return middleware(...options) || middleware.default(...options);
        } else {
            log(LogLevel.Info, `Middleware ${middlewareName} not installed. Please install it using your package manager.`, "middleware-resolver");
        }

        return null;
    }
}

function middlewareResolver(middleware: string, ...options: any): express.RequestHandler | null {
    const resolver = new MiddlewareResolver();
    return resolver.getMiddleware(middleware, ...options);
}

export { middlewareResolver };

