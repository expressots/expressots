/* eslint-disable @typescript-eslint/no-namespace */
import { Options } from "./ejs.types";

/**
 * The Render namespace contains all the types and interfaces related to rendering views.
 * @namespace Render
 * @public API
 */
export namespace RenderEngine {
  /**
   * Ejs options
   * @typedef {Object} EjsOptions
   * @property {string | Array<string>} viewsDir - The path to the views folder
   * @property {string} viewEngine - The view engine
   * @property {ejs.Options} [serverOptions] - The server options
   * @public API
   */
  export type EjsOptions = {
    viewsDir?: string | Array<string>;
    viewEngine?: string;
    serverOptions?: Options;
  };

  /**
   * Handlebars options
   * @typedef {Object} HandlebarsOptions
   * @property {string} viewsDir - The path to the views folder
   * @property {string} viewEngine - The view engine to be used
   * @property {ConfigOptions} [serverOptions] - The server options
   * @public API
   */
  export type HandlebarsOptions = {
    viewEngine?: string;
    viewsDir?: string;
    partialsDir?: string;
  };

  /**
   * Pug options
   * @typedef {Object} PugOptions
   * @property {string} viewEngine - The view engine to be used
   * @property {string} viewsDir - The path to the views folder
   * @public API
   */
  export type PugOptions = {
    viewEngine?: string;
    viewsDir?: string;
  };

  /**
   * The configuration options for the view engine.
   * @typedef {HandlebarsOptions | EjsOptions | PugOptions} RenderOptions
   * @public API
   */
  export type RenderOptions = {
    engine: Engine;
    options?: EngineOptions;
  };

  /**
   * The supported view engines.
   * @enum {string} Engine - The supported view engines.
   * @readonly - This enum is read-only.
   * @public API
   */
  export enum Engine {
    HBS = "hbs",
    EJS = "ejs",
    PUG = "pug",
  }

  /**
   * The configuration options for the view engine.
   * @typedef {HandlebarsOptions | EjsOptions} EngineOptions
   * @public API
   */
  export type EngineOptions = HandlebarsOptions | EjsOptions | PugOptions;
}
