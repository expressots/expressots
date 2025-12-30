import { ExpressoConfig, Pattern } from "@expressots/shared";

/**
 * ExpressoTS Configuration
 * 
 * This file controls how the CLI scaffolds and manages your project.
 * 
 * Options:
 * - entryPoint: Main file name (without extension)
 * - sourceRoot: Source code directory
 * - scaffoldPattern: Naming convention (KEBAB_CASE, SNAKE_CASE, PASCAL_CASE, CAMEL_CASE)
 * - opinionated: Enable structured folder scaffolding with path aliases
 * - scaffoldSchematics: Customize folder/file names for scaffolding
 */
const config: ExpressoConfig = {
    // Entry point for the application
    entryPoint: "main",
    
    // Source directory
    sourceRoot: "src",
    
    // File naming pattern for scaffolded resources
    scaffoldPattern: Pattern.KEBAB_CASE,
    
    // Enable structured scaffolding with path aliases
    // true:  Resources go to folders like src/useCases/, src/entities/, etc.
    // false: Resources go directly to src/ with flat structure
    opinionated: true,
    
    // Customize scaffold folder names (optional)
    // Uncomment and modify to use different folder names
    // scaffoldSchematics: {
    //     // Core schematics
    //     entity: "entities",
    //     controller: "controllers",   // Default: "useCases"
    //     usecase: "useCases",
    //     dto: "dto",
    //     module: "modules",
    //     provider: "providers",
    //     middleware: "middleware",
    //     // v4.0 schematics
    //     interceptor: "interceptors",
    //     event: "events",
    //     handler: "events",
    //     guard: "guards",
    //     config: "config",
    // },
};

export default config;

