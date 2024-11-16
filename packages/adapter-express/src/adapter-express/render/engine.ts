import { Application } from "express";
import { Logger } from "@expressots/core";
import { RenderEngine } from "@expressots/shared";
import { packageResolver } from "./resolve-render";
import { DEFAULT_PARTIALS_DIR, EJS_DEFAULTS, HANDLEBARS_DEFAULTS, PUG_DEFAULTS } from "./constants";

/**
 * Set Ejs as the view engine
 * @param {Application} app - The express application
 * @param {EjsOptions} [options=EJS_DEFAULTS] - The ejs options
 */
export async function setEngineEjs(
  app: Application,
  options: RenderEngine.EjsOptions = EJS_DEFAULTS,
): Promise<void> {
  packageResolver("ejs");

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

/**
 * Set Handlebars as the view engine
 * @param {express.Application} app - The express application
 * @param {HandlebarsOptions} [options=HANDLEBARS_DEFAULTS] - The handlebars options
 */
export async function setEngineHandlebars(
  app: Application,
  options: RenderEngine.HandlebarsOptions = HANDLEBARS_DEFAULTS,
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

/**
 * Set Pug as the view engine
 * @param {express.Application} app - The express application
 * @param {PugOptions} [options=PUG_DEFAULTS] - The pug options
 */
export async function setEnginePug(
  app: Application,
  options: RenderEngine.PugOptions = PUG_DEFAULTS,
): Promise<void> {
  packageResolver("pug");

  app.set("view engine", options.viewEngine || (PUG_DEFAULTS.viewEngine as string));
  app.set("views", options.viewsDir || (PUG_DEFAULTS.viewsDir as string));
}
