import { EjsOptions } from "./ejs/ejs.config";
import { HandlebarsOptions } from "./handlebars/hbs.config";

/**
 * The configuration options for the view engine.
 * @typedef {HandlebarsOptions | EjsOptions} EngineOptions
 * @private
 */
export type RenderOptions = {
  engine: Engine;
  options?: EngineOptions;
};

/**
 * The supported view engines.
 * @enum {string}
 * @readonly
 * @public
 */
export enum Engine {
  HBS = "hbs",
  EJS = "ejs",
  PUG = "pug",
}

/**
 * The configuration options for the view engine.
 * @typedef {HandlebarsOptions | EjsOptions} EngineOptions
 * @public
 */
export type EngineOptions = HandlebarsOptions | EjsOptions;
