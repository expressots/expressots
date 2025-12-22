import { Request, Response } from "express";
import { interfaces } from "../../di/interfaces/interfaces";
import {
  ContentNegotiationOptions,
  NegotiationResult,
  AcceptHeaderEntry,
} from "../interfaces/content-negotiation.interface";
import { FormatterRegistry } from "./formatter-registry";
import { AcceptHeaderParser } from "./accept-header-parser";
import {
  JsonFormatter,
  XmlFormatter,
  CsvFormatter,
  YamlFormatter,
  PlainTextFormatter,
} from "./formatters";

/**
 * Service for handling content negotiation.
 */
export class ContentNegotiationService {
  private registry: FormatterRegistry;
  private options: Required<ContentNegotiationOptions>;
  private enabled: boolean = false;

  constructor(container?: interfaces.Container) {
    this.registry = new FormatterRegistry(container);
    this.options = this.getDefaultOptions();
  }

  /**
   * Configures content negotiation with the provided options.
   */
  configure(options: ContentNegotiationOptions): void {
    this.options = { ...this.getDefaultOptions(), ...options };
    this.enabled = true;

    // Register built-in formatters
    const builtInFormatters = [
      JsonFormatter,
      XmlFormatter,
      CsvFormatter,
      YamlFormatter,
      PlainTextFormatter,
    ];

    const formattersToRegister = [
      ...(this.options.formatters || []),
      ...builtInFormatters,
    ];

    // Register custom formatters
    if (this.options.customFormatters) {
      formattersToRegister.push(...this.options.customFormatters);
    }

    this.registry.registerAll(formattersToRegister);

    // Configure registry
    this.registry.setCacheEnabled(this.options.cacheFormatters);

    // Preload formatters if specified
    if (this.options.preload && this.options.preload.length > 0) {
      for (const contentType of this.options.preload) {
        this.registry.getFormatter(contentType);
      }
    }
  }

  /**
   * Checks if content negotiation is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Negotiates the best content type based on the Accept header.
   * @param req - Express request object
   * @param availableTypes - Optional array of explicitly available types (from decorators)
   * @returns Negotiation result or undefined if no match
   */
  negotiate(
    req: Request,
    availableTypes?: Array<string>,
  ): NegotiationResult | undefined {
    if (!this.enabled) {
      return undefined;
    }

    const acceptHeader = req.headers.accept;
    const entries = AcceptHeaderParser.parse(acceptHeader);

    // If no Accept header and no explicit types, use default
    if (entries.length === 0 && !availableTypes) {
      return this.getDefaultFormatter();
    }

    // Get all available types - if decorator provides types, use those; otherwise use all formatter types
    let allAvailableTypes: Array<string>;
    if (availableTypes && availableTypes.length > 0) {
      // Use decorator-provided types, but verify formatters support them
      allAvailableTypes = availableTypes;
    } else {
      // Use all formatter-supported types
      allAvailableTypes = this.getAllAvailableTypes();
    }

    // Find best match
    let bestMatch: NegotiationResult | undefined;

    if (this.options.qualityValueSupport && entries.length > 0) {
      // Use quality value negotiation
      bestMatch = this.negotiateWithQuality(entries, allAvailableTypes);
    } else if (entries.length > 0) {
      // Simple negotiation without quality values
      const bestType = AcceptHeaderParser.findBestMatch(
        entries,
        allAvailableTypes,
      );
      if (bestType) {
        // Try to find formatter - use findFormatter for better matching
        const formatter =
          this.registry.findFormatter(bestType) ||
          this.registry.getFormatter(bestType);
        if (formatter) {
          bestMatch = {
            formatter,
            contentType: bestType,
            quality: 1.0,
          };
        }
      }
    }

    // Fallback to default if no match
    if (!bestMatch) {
      if (this.options.strictMode) {
        return undefined; // Will return 406
      }
      return this.getDefaultFormatter();
    }

    return bestMatch;
  }

  /**
   * Formats response data using the negotiated formatter.
   * @param data - Data to format
   * @param result - Negotiation result
   * @returns Formatted data
   */
  async formatResponse(
    data: unknown,
    result: NegotiationResult,
  ): Promise<string | Buffer> {
    const formatted = await result.formatter.format(data);
    return formatted;
  }

  /**
   * Handles response formatting with content negotiation.
   * @param req - Express request object
   * @param res - Express response object
   * @param data - Data to send
   * @param availableTypes - Optional explicitly available types
   * @returns True if response was handled, false otherwise
   */
  async handleResponse(
    req: Request,
    res: Response,
    data: unknown,
    availableTypes?: Array<string>,
  ): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const result = this.negotiate(req, availableTypes);

    if (!result) {
      if (this.options.strictMode) {
        res.status(406).json({
          error: "Not Acceptable",
          message: "The requested content type is not supported",
        });
        return true;
      }
      return false; // Fall back to default behavior
    }

    try {
      const formatted = await this.formatResponse(data, result);

      res.setHeader("Content-Type", result.contentType);

      if (formatted instanceof Buffer) {
        res.send(formatted);
      } else {
        res.send(formatted);
      }

      return true;
    } catch (error) {
      // Silently fall back to default behavior on error
      return false;
    }
  }

  /**
   * Negotiates with quality value support.
   */
  private negotiateWithQuality(
    entries: Array<AcceptHeaderEntry>,
    availableTypes: Array<string>,
  ): NegotiationResult | undefined {
    for (const entry of entries) {
      // Try exact match
      if (availableTypes.includes(entry.type)) {
        const formatter =
          this.registry.findFormatter(entry.type) ||
          this.registry.getFormatter(entry.type);
        if (formatter) {
          return {
            formatter,
            contentType: entry.type,
            quality: entry.quality,
          };
        }
      }

      // Try partial match
      if (
        this.options.negotiatePartial &&
        entry.subtype === "*" &&
        entry.mainType
      ) {
        const match = availableTypes.find((type) => {
          const [mainType] = type.split("/");
          return mainType === entry.mainType;
        });
        if (match) {
          const formatter =
            this.registry.findFormatter(match) ||
            this.registry.getFormatter(match);
          if (formatter) {
            return {
              formatter,
              contentType: match,
              quality: entry.quality,
            };
          }
        }
      }

      // Try wildcard
      if (this.options.negotiateWildcards && entry.mainType === "*") {
        const match = availableTypes[0];
        if (match) {
          const formatter =
            this.registry.findFormatter(match) ||
            this.registry.getFormatter(match);
          if (formatter) {
            return {
              formatter,
              contentType: match,
              quality: entry.quality,
            };
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Gets all available content types from registered formatters.
   */
  private getAllAvailableTypes(): Array<string> {
    const types: Array<string> = [];
    const formatters = this.registry.getAllFormatters();

    for (const formatter of formatters) {
      types.push(...formatter.getSupportedTypes());
    }

    return Array.from(new Set(types));
  }

  /**
   * Gets the default formatter.
   */
  private getDefaultFormatter(): NegotiationResult {
    const formatter = this.registry.getFormatter(this.options.defaultFormat);

    if (!formatter) {
      // Fallback to JSON formatter
      const jsonFormatter = new JsonFormatter();
      return {
        formatter: jsonFormatter,
        contentType: "application/json",
        quality: 1.0,
      };
    }

    return {
      formatter,
      contentType: this.options.defaultFormat,
      quality: 1.0,
    };
  }

  /**
   * Gets default options.
   */
  private getDefaultOptions(): Required<ContentNegotiationOptions> {
    return {
      defaultFormat: "application/json",
      formatters: [],
      customFormatters: [],
      strictMode: false,
      fallbackChain: ["application/json", "application/xml", "text/plain"],
      negotiateWildcards: true,
      negotiatePartial: true,
      qualityValueSupport: true,
      cacheFormatters: true,
      lazyLoad: true,
      preload: ["application/json"],
      formatDefaults: {
        csv: {
          includeHeaders: true,
          delimiter: ",",
          escape: true,
        },
        xml: {
          prettyPrint: false,
          rootElement: "root",
          xmlDeclaration: true,
        },
        yaml: {
          indent: 2,
          quoteStrings: false,
          lineWidth: 80,
        },
      },
    };
  }

  /**
   * Gets the formatter registry (for advanced usage).
   */
  getRegistry(): FormatterRegistry {
    return this.registry;
  }
}
