import { IContentFormatter } from "../../interfaces/content-negotiation.interface.js";

/**
 * JSON formatter for content negotiation.
 * Formats data as JSON with pretty printing support.
 */
export class JsonFormatter implements IContentFormatter {
  private prettyPrint: boolean = false;

  constructor(prettyPrint: boolean = false) {
    this.prettyPrint = prettyPrint;
  }

  canFormat(contentType: string): boolean {
    return (
      contentType === "application/json" ||
      contentType === "application/*" ||
      contentType === "*/*"
    );
  }

  format<T>(data: T): string {
    if (this.prettyPrint) {
      return JSON.stringify(data, null, 2);
    }
    return JSON.stringify(data);
  }

  getContentType(): string {
    return "application/json";
  }

  getSupportedTypes(): Array<string> {
    return ["application/json"];
  }

  getPriority(): number {
    return 1.0; // Highest priority for JSON
  }
}
