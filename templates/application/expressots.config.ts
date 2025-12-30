import { ExpressoConfig, Pattern } from "@expressots/shared";

const config: ExpressoConfig = {
    entryPoint: "main",
    sourceRoot: "src",
    scaffoldPattern: Pattern.KEBAB_CASE,
    opinionated: true,
};

export default config;
