/* eslint-disable @typescript-eslint/no-var-requires */

const path = require("path");
const tsconfigPaths = require("tsconfig-paths");
const tsconfig = require("./tsconfig.build.json");

const baseUrl = tsconfig.compilerOptions.baseUrl || ".";
const outDir = tsconfig.compilerOptions.outDir || ".";

let baseUrlPath = path.resolve(outDir, baseUrl);

const explicitPaths = {
    baseUrl: baseUrlPath,
    paths: tsconfig.compilerOptions.paths,
};

tsconfigPaths.register(explicitPaths);
