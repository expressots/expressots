/**
 * Content negotiation interfaces and types for ExpressoTS.
 * Provides type-safe content negotiation with support for multiple formats,
 * quality values, and custom formatters.
 */

/**
 * Interface for content formatters that serialize data to specific formats.
 * @template T - The type of data being formatted (defaults to unknown)
 */
export interface IContentFormatter<T = unknown> {
  /**
   * Checks if this formatter can handle the given content type.
   * @param contentType - The content type to check (e.g., "application/json")
   * @returns True if this formatter can handle the content type
   */
  canFormat(contentType: string): boolean;

  /**
   * Formats the data according to this formatter's format.
   * @param data - The data to format
   * @returns The formatted data as a string or Buffer
   */
  format(data: T): string | Buffer | Promise<string | Buffer>;

  /**
   * Gets the content type this formatter produces.
   * @returns The MIME type (e.g., "application/json")
   */
  getContentType(): string;

  /**
   * Gets all content types this formatter supports.
   * Useful for wildcard matching (e.g., "application/star").
   * @returns Array of supported MIME types
   */
  getSupportedTypes(): Array<string>;

  /**
   * Gets the priority/quality of this formatter for content negotiation.
   * Higher values are preferred. Default is 1.0.
   * @returns Priority value between 0.0 and 1.0
   */
  getPriority?(): number;
}

/**
 * Options for CSV formatting.
 */
export interface CsvFormatOptions {
  /** Fields to include in CSV output. If not specified, all fields are included. */
  fields?: Array<string>;
  /** Whether to include headers in CSV output. Default: true */
  includeHeaders?: boolean;
  /** CSV delimiter. Default: "," */
  delimiter?: string;
  /** Custom transformation function applied to each row before formatting */
  transform?: (row: unknown) => unknown;
  /** Whether to escape values. Default: true */
  escape?: boolean;
}

/**
 * Options for XML formatting.
 */
export interface XmlFormatOptions {
  /** Root element name. Default: "root" */
  rootElement?: string;
  /** Item element name for arrays. Default: "item" */
  itemElement?: string;
  /** Attributes to include on elements */
  attributes?: Array<string>;
  /** Whether to pretty print XML. Default: false */
  prettyPrint?: boolean;
  /** XML declaration. Default: true */
  xmlDeclaration?: boolean;
  /** Custom attribute mapping function */
  attributeMap?: (key: string, value: unknown) => Record<string, string>;
}

/**
 * Options for YAML formatting.
 */
export interface YamlFormatOptions {
  /** Indentation level. Default: 2 */
  indent?: number;
  /** Whether to quote all strings. Default: false */
  quoteStrings?: boolean;
  /** Line width. Default: 80 */
  lineWidth?: number;
}

/**
 * Content negotiation configuration options.
 */
export interface ContentNegotiationOptions {
  /** Default format to use when Accept header is missing or no match found. Default: "application/json" */
  defaultFormat?: string;
  /** Array of built-in formatter classes */
  formatters?: Array<new () => IContentFormatter>;
  /** Array of custom formatter classes (auto-discovered via DI if @provide() decorated) */
  customFormatters?: Array<new () => IContentFormatter>;
  /** Whether to return 406 Not Acceptable if format not supported. Default: false */
  strictMode?: boolean;
  /** Fallback chain of formats to try if primary format fails. */
  fallbackChain?: Array<string>;
  /** Whether to negotiate wildcard Accept headers (star/star). Default: true */
  negotiateWildcards?: boolean;
  /** Whether to negotiate partial content types (application/star). Default: true */
  negotiatePartial?: boolean;
  /** Whether to support quality values (q=0.9) in Accept headers. Default: true */
  qualityValueSupport?: boolean;
  /** Whether to cache formatter instances. Default: true */
  cacheFormatters?: boolean;
  /** Whether to lazy load formatters. Default: true */
  lazyLoad?: boolean;
  /** Content types to preload. Default: ["application/json"] */
  preload?: Array<string>;
  /** Format-specific default options */
  formatDefaults?: {
    csv?: CsvFormatOptions;
    xml?: XmlFormatOptions;
    yaml?: YamlFormatOptions;
  };
}

/**
 * Parsed Accept header entry with quality value.
 */
export interface AcceptHeaderEntry {
  /** Content type (e.g., "application/json") */
  type: string;
  /** Quality value (0.0 to 1.0). Default: 1.0 */
  quality: number;
  /** Subtype (e.g., "json" from "application/json") */
  subtype?: string;
  /** Main type (e.g., "application" from "application/json") */
  mainType?: string;
  /** Parameters (e.g., version in "application/vnd.api+json;version=1.0") */
  parameters?: Record<string, string>;
}

/**
 * Content negotiation result.
 */
export interface NegotiationResult {
  /** Selected formatter */
  formatter: IContentFormatter;
  /** Selected content type */
  contentType: string;
  /** Quality value of the match */
  quality: number;
}
