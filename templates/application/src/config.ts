import { defineConfig, Env, loadEnvSync } from "@expressots/core";

/**
 * Environment file mapping
 * Maps environment names to their corresponding .env files
 */
const envFiles = {
    development: ".env.local",
    production: ".env.prod",
};

// Load environment variables before config resolution
loadEnvSync({ files: envFiles });

/**
 * Application Configuration
 *
 * Type-safe configuration with environment variable support.
 * All values are validated and typed at compile time.
 */
export const appConfig = defineConfig({
    // Application metadata
    app: {
        name: Env.string("APP_NAME", { default: "ExpressoTS App" }),
        version: Env.string("APP_VERSION", { default: "1.0.0" }),
        environment: Env.string("NODE_ENV", { default: "development" }),
    },

    // Server settings
    server: {
        port: Env.number("PORT", { default: 3000 }),
        host: Env.string("HOST", { default: "localhost" }),
        globalPrefix: Env.string("API_PREFIX", { default: "/api" }),
    },

    // Logging configuration
    logging: {
        level: Env.string("LOG_LEVEL", { default: "info" }),
    },

    // Bootstrap configuration (passed to bootstrap function)
    bootstrap: {
        envFileConfig: {
            files: envFiles,
            autoCreateTemplate: true,
        },
    },
});

// Export resolved configuration values
export const config = appConfig.values;
