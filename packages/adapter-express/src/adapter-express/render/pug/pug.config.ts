import { join } from "path";
import { packageResolver } from "../resolve-render";
import { Application } from "express";

/**
 * Pug options
 * @typedef {Object} PugOptions
 * @property {string} viewEngine - The view engine to be used
 * @property {string} viewsDir - The path to the views folder
 */
export type PugOptions = {
  viewEngine?: string;
  viewsDir?: string;
};

/**
 * Pug defaults
 * @type {PugOptions}
 * @constant
 * @default
 */
const PUG_DEFAULTS: PugOptions = {
  viewEngine: "pug",
  viewsDir: join(process.cwd(), "views"),
};

/**
 * Set Pug as the view engine
 * @param {express.Application} app - The express application
 * @param {PugOptions} [options=PUG_DEFAULTS] - The pug options
 */
export async function setEnginePug(
  app: Application,
  options: PugOptions = PUG_DEFAULTS,
): Promise<void> {
  packageResolver("pug");

  app.set("view engine", options.viewEngine || (PUG_DEFAULTS.viewEngine as string));
  app.set("views", options.viewsDir || (PUG_DEFAULTS.viewsDir as string));
}
