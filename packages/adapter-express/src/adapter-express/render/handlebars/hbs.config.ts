import express from "express";
import { join } from "path";
import { Logger } from "@expressots/core";

/**
 * Handlebars options
 * @typedef {Object} HandlebarsOptions
 * @property {string} viewsDir - The path to the views folder
 * @property {string} viewEngine - The view engine to be used
 * @property {ConfigOptions} [serverOptions] - The server options
 *
 */
export type HandlebarsOptions = {
  viewsDir?: string | Array<string>;
  viewEngine?: string;
  serverOptions?: unknown;
};

/**
 * Handlebars defaults
 * @type {HandlebarsOptions}
 * @constant
 * @default
 */
const HANDLEBARS_DEFAULTS: HandlebarsOptions = {
  viewsDir: join(process.cwd(), "views"),
  viewEngine: "hbs",
  serverOptions: {},
};

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
    app.set("view engine", options.viewEngine || (HANDLEBARS_DEFAULTS.viewEngine as string));
    app.set("views", options.viewsDir || (HANDLEBARS_DEFAULTS.viewsDir as string));

    if (Array.isArray(options.viewsDir)) {
      options.viewsDir.forEach((dir) => {
        app.set("views", dir);
      });
    }

    if (options.serverOptions) {
      app.locals = {
        ...app.locals,
        ...(options.serverOptions as Record<string, unknown>),
      };
    }
  } catch (error: unknown) {
    logger.error((error as Error).message, "handlebars-config");
  }
}
