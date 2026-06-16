import { RenderEngine } from "@expressots/shared";

export type EJS = RenderEngine.EjsOptions;
export type HBS = RenderEngine.HandlebarsOptions;
export type PUG = RenderEngine.PugOptions;

export { setEngineEjs, setEngineHandlebars, setEnginePug } from "./engine.js";
