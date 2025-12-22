import { IContentFormatter } from "../../interfaces/content-negotiation.interface";

/**
 * Plain text formatter for content negotiation.
 * Formats data as plain text.
 */
export class PlainTextFormatter implements IContentFormatter {
  canFormat(contentType: string): boolean {
    return (
      contentType === "text/plain" ||
      contentType === "text/*" ||
      contentType === "*/*"
    );
  }

  format<T>(data: T): string {
    if (data === null || data === undefined) {
      return "";
    }

    if (typeof data === "string") {
      return data;
    }

    if (typeof data === "object") {
      // For objects, create a simple text representation
      if (Array.isArray(data)) {
        return data.map((item) => this.format(item)).join("\n");
      }

      // For objects, format as key-value pairs
      const entries = Object.entries(data);
      return entries
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join("\n");
    }

    return String(data);
  }

  getContentType(): string {
    return "text/plain";
  }

  getSupportedTypes(): Array<string> {
    return ["text/plain"];
  }

  getPriority(): number {
    return 0.5; // Lower priority, used as fallback
  }
}
