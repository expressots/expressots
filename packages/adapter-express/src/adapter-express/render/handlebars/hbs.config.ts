import express from "express";
import { join } from "path";
import { Logger } from "@expressots/core";
import { packageResolver } from "../resolve-render";

/**
 * Handlebars options
 * @typedef {Object} HandlebarsOptions
 * @property {string} viewsDir - The path to the views folder
 * @property {string} viewEngine - The view engine to be used
 * @property {ConfigOptions} [serverOptions] - The server options
 *
 */
export type HandlebarsOptions = {
  viewEngine?: string;
  viewsDir?: string;
  partialsDir?: string;
};

/**
 * Handlebars defaults
 * @type {HandlebarsOptions}
 * @constant
 * @default
 */
const HANDLEBARS_DEFAULTS: HandlebarsOptions = {
  viewEngine: "hbs",
  viewsDir: join(process.cwd(), "views"),
  partialsDir: join(process.cwd(), "views/partials"),
};

/**
 * Default partials directory
 */
const DEFAULT_PARTIALS_DIR: string = join(process.cwd(), "views/partials");

/**
 * Set Handlebars as the view engine
 * @param {express.Application} app - The express application
 * @param {HandlebarsOptions} [options=HANDLEBARS_DEFAULTS] - The handlebars options
 */
export async function setEngineHandlebars(
  app: express.Application,
  options: HandlebarsOptions = HANDLEBARS_DEFAULTS,
): Promise<void> {
  const logger = new Logger();

  try {
    const hbs = packageResolver("hbs");

    hbs.registerPartials(options.partialsDir || DEFAULT_PARTIALS_DIR);

    app.set("view engine", options.viewEngine || (HANDLEBARS_DEFAULTS.viewEngine as string));
    app.set("views", options.viewsDir || (HANDLEBARS_DEFAULTS.viewsDir as string));
  } catch (error: unknown) {
    logger.error((error as Error).message, "handlebars-config");
  }
}
