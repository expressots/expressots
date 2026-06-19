import { defineConfig, Env, loadEnvSync } from "@expressots/core";

/**
 * {{className}} Configuration
 *
 * Type-safe configuration with full TypeScript inference.
 * Features:
 * - Multi-environment defaults
 * - Secret management with auto-redaction
 * - Validation with helpful errors
 */

// Load environment files before config resolution
const envFiles = {
    development: ".env.local",
    production: ".env.prod",
};

loadEnvSync({ files: envFiles });

export const {{moduleName}}Config = defineConfig({
    // Add your configuration schema here
    enabled: Env.boolean("{{envPrefix}}_ENABLED", {
        default: true,
        description: "Enable/disable {{className}} feature",
    }),
    // Example settings - customize as needed
    setting1: Env.string("{{envPrefix}}_SETTING1", {
        default: "default-value",
    }),
    setting2: Env.number("{{envPrefix}}_SETTING2", {
        default: 100,
        min: 0,
        max: 1000,
    }),
    bootstrap: {
        envFileConfig: {
            autoCreateTemplate: true,
            files: envFiles,
        },
    },
});

// Export typed config values
export const config = {{moduleName}}Config.values;
export type {{className}}Config = typeof config;

