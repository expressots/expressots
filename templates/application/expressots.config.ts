import { ExpressoConfig, Pattern } from "@expressots/shared";

const config: ExpressoConfig = {
    entryPoint: "main",
    sourceRoot: "src",
    scaffoldPattern: Pattern.KEBAB_CASE,
    opinionated: true,
    scaffoldSchematics: {
        controller: "useCases",
        usecase: "useCases",
        dto: "useCases",
        module: "useCases",
        provider: "providers",
        entity: "entities",
        middleware: "middleware",
        interceptor: "interceptors",
        event: "events",
        handler: "events",
        guard: "guards",
        config: "config",
    },
};

export default config;
