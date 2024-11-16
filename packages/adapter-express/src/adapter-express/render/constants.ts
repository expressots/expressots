import { join } from "path";
import { RenderEngine } from "@expressots/shared";

/**
 * Ejs defaults
 * @type {EjsOptions}
 * @constant
 * @default
 */
export const EJS_DEFAULTS: RenderEngine.EjsOptions = {
  viewsDir: join(process.cwd(), "views"),
  viewEngine: "ejs",
  serverOptions: {},
};

/**
 * Handlebars defaults
 * @type {HandlebarsOptions}
 * @constant
 * @default
 */
export const HANDLEBARS_DEFAULTS: RenderEngine.HandlebarsOptions = {
  viewEngine: "hbs",
  viewsDir: join(process.cwd(), "views"),
  partialsDir: join(process.cwd(), "views/partials"),
};

/**
 * Default partials directory
 */
export const DEFAULT_PARTIALS_DIR: string = join(process.cwd(), "views/partials");

/**
 * Pug defaults
 * @type {PugOptions}
 * @constant
 * @default
 */
export const PUG_DEFAULTS: RenderEngine.PugOptions = {
  viewEngine: "pug",
  viewsDir: join(process.cwd(), "views"),
};
