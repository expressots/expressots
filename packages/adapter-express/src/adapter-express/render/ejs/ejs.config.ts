import { Application } from "express";
import { join } from "path";
import { Options } from "./ejs.types";

/**
 * Ejs options
 * @typedef {Object} EjsOptions
 * @property {string | Array<string>} viewsDir - The path to the views folder
 * @property {string} viewEngine - The view engine
 * @property {ejs.Options} [serverOptions] - The server options
 *
 */
export type EjsOptions = {
  viewsDir?: string | Array<string>;
  viewEngine?: string;
  serverOptions?: Options;
};

/**
 * Ejs defaults
 * @type {EjsOptions}
 * @constant
 * @default
 */
const EJS_DEFAULTS: EjsOptions = {
  viewsDir: join(process.cwd(), "views"),
  viewEngine: "ejs",
  serverOptions: {},
};

/**
 * Set Ejs as the view engine
 * @param {Application} app - The express application
 * @param {EjsOptions} [options=EJS_DEFAULTS] - The ejs options
 */
export async function setEngineEjs(
  app: Application,
  options: EjsOptions = EJS_DEFAULTS,
): Promise<void> {
  app.set("view engine", options.viewEngine || EJS_DEFAULTS.viewEngine);
  app.set("views", options.viewsDir || EJS_DEFAULTS.viewsDir);

  if (Array.isArray(options.viewsDir)) {
    options.viewsDir.forEach((dir) => {
      app.set("views", dir);
    });
  }

  if (options.serverOptions) {
    app.locals = {
      ...app.locals,
      ...options.serverOptions,
    };
  }
}
