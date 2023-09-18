/**
 * ServeFaviconOptions defines the available options for configuring the serve-favicon middleware.
 */
interface ServeFaviconOptions {
  /**
   * The cache-control max-age directive in ms, defaulting to 1 year.
   * This can also be a string accepted by the `ms` module.
   */
  maxAge?: number | string | undefined;
}

export { ServeFaviconOptions };
