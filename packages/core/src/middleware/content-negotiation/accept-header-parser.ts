import { AcceptHeaderEntry } from "../interfaces/content-negotiation.interface";

/**
 * Parser for Accept headers with quality value support (RFC 7231).
 */
export class AcceptHeaderParser {
  /**
   * Parses an Accept header string into an array of AcceptHeaderEntry objects.
   * Supports quality values, wildcards, and parameters.
   * @param acceptHeader - The Accept header value (e.g., "application/json;q=0.9, application/xml;q=0.8")
   * @returns Array of parsed accept header entries, sorted by quality (highest first)
   */
  static parse(acceptHeader: string | undefined): Array<AcceptHeaderEntry> {
    if (!acceptHeader || acceptHeader.trim() === "") {
      return [];
    }

    const entries: Array<AcceptHeaderEntry> = [];
    const parts = acceptHeader.split(",");

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      const entry = this.parseEntry(trimmed);
      if (entry) {
        entries.push(entry);
      }
    }

    // Sort by quality (highest first), then by type specificity
    return entries.sort((a, b) => {
      if (b.quality !== a.quality) {
        return b.quality - a.quality;
      }
      // Prefer more specific types (e.g., "application/json" over "application/*")
      const aSpecificity = a.subtype === "*" ? 0 : a.mainType === "*" ? 0 : 1;
      const bSpecificity = b.subtype === "*" ? 0 : b.mainType === "*" ? 0 : 1;
      return bSpecificity - aSpecificity;
    });
  }

  /**
   * Parses a single Accept header entry.
   * @param entry - The entry string (e.g., "application/json;q=0.9;version=1.0")
   * @returns Parsed entry or undefined if invalid
   */
  private static parseEntry(entry: string): AcceptHeaderEntry | undefined {
    const parts = entry.split(";").map((p) => p.trim());
    if (parts.length === 0) return undefined;

    const type = parts[0].trim();
    if (!type) return undefined;

    // Parse type and subtype
    const [mainType, subtype] = type.split("/");
    if (!mainType) return undefined;

    // Parse parameters
    const parameters: Record<string, string> = {};
    let quality = 1.0;

    for (let i = 1; i < parts.length; i++) {
      const param = parts[i];
      const [key, value] = param.split("=").map((p) => p.trim());

      if (key === "q" && value) {
        const qValue = parseFloat(value);
        if (!isNaN(qValue) && qValue >= 0 && qValue <= 1) {
          quality = qValue;
        }
      } else if (key && value) {
        parameters[key] = value;
      }
    }

    return {
      type,
      quality,
      mainType,
      subtype: subtype || "*",
      parameters: Object.keys(parameters).length > 0 ? parameters : undefined,
    };
  }

  /**
   * Finds the best matching content type from Accept header entries.
   * @param entries - Parsed Accept header entries
   * @param availableTypes - Array of available content types
   * @returns Best matching content type, or undefined if no match
   */
  static findBestMatch(
    entries: Array<AcceptHeaderEntry>,
    availableTypes: Array<string>,
  ): string | undefined {
    for (const entry of entries) {
      // Exact match
      if (availableTypes.includes(entry.type)) {
        return entry.type;
      }

      // Partial match (e.g., "application/*" matches "application/json")
      if (entry.subtype === "*" && entry.mainType) {
        const match = availableTypes.find((type) => {
          const [mainType] = type.split("/");
          return mainType === entry.mainType;
        });
        if (match) {
          return match;
        }
      }

      // Wildcard match (*/*)
      if (entry.mainType === "*" && availableTypes.length > 0) {
        return availableTypes[0]; // Return first available
      }
    }

    return undefined;
  }
}
