/**
 * Configuration options for Express Handlebars.
 * @interface ConfigOptions
 */
interface ConfigOptions {
  extname?: string;
  layoutDir?: string;
  defaultLayout?: string | false;
}

/**
 * Callback function for rendering templates.
 * @callback RenderCallback
 *
 * @param {Error | null} err - The error object.
 * @param {string} [content] - The rendered content.
 */
interface RenderCallback {
  (err: Error | null, content?: string): void;
}

/**
 * Function for rendering templates.
 * @typedef Engine
 *
 * @param {string} viewPath - The path to the directory containing the templates.
 * @param {ConfigOptions} options - The configuration options for the template engine.
 * @param {RenderCallback} [callback] - The callback function for rendering templates.
 */
type Engine = (
  viewPath: string,
  options: ConfigOptions,
  callback?: RenderCallback,
) => void;

/**
 * Interface representing the configuration options for Handlebars templates.
 */
interface IHandlebars {
  /**
   * Specifies the extension name for the Handlebars templates.
   */
  extName: string;

  /**
   * Specifies the path to the directory containing the Handlebars templates.
   */
  viewPath: string;

  /**
   * Specifies the function for rendering Handlebars templates.
   */
  engine: Engine;
}

export { IHandlebars };
