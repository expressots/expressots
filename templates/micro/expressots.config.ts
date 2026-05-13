import { ExpressoConfig, Pattern } from "@expressots/shared";

const config: ExpressoConfig = {
    entryPoint: "api",
    sourceRoot: "src",
    scaffoldPattern: Pattern.KEBAB_CASE,
    opinionated: false,
};

export default config;
