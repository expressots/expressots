import { defineConfig, Env, loadEnvSync } from "@expressots/core";

loadEnvSync({ files: { development: ".env.local", production: ".env.prod" } });

export const {{moduleName}}Config = defineConfig({
    enabled: Env.boolean("{{envPrefix}}_ENABLED", { default: true }),
    // Add more config options as needed
});

export const config = {{moduleName}}Config.values;
export type {{className}}Config = typeof config;

