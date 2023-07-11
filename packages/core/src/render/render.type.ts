import { IHandlebars } from "./handlebars.interface";

/**
 * Type alias for the configuration options for rendering templates.
 *
 * Currently, this type alias is equivalent to the `IHandlebars` interface,
 * and represents the configuration options for Handlebars templates.
 *
 * In the future, this type could be expanded to include configuration options
 * for other template engines.
 */
type RenderTemplateOptions = IHandlebars;

export { RenderTemplateOptions };
