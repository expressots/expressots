import { defineConfig, Env } from "@expressots/core";

/**
 * Type-safe application configuration.
 *
 * Every value is read from `process.env` and validated by the helpers in
 * `Env.*`. The shape of `appConfig.values` is fully inferred, so reading
 * `appConfig.values.app.port` gives you a `number`, not a `string | undefined`.
 *
 * See https://expresso-ts.com/docs/features/configuration for the full
 * surface (`Env.url`, `Env.enum`, `Env.secret`, `Env.array`, etc.).
 */
export const appConfig = defineConfig({
    app: {
        name: Env.string("APP_NAME").default("expressots-app"),
        port: Env.port("PORT").default(3000),
        env: Env.enum("NODE_ENV", ["development", "production", "test"] as const).default(
            "development",
        ),
    },
    logger: {
        level: Env.enum("LOG_LEVEL", ["trace", "debug", "info", "warn", "error", "fatal"] as const)
            .default("info"),
    },
});

export type AppConfig = typeof appConfig;
