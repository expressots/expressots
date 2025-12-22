import {
  IContentFormatter,
  CsvFormatOptions,
} from "../../interfaces/content-negotiation.interface";

/**
 * CSV formatter for content negotiation.
 * Formats data as CSV with configurable options.
 */
export class CsvFormatter implements IContentFormatter {
  private options: CsvFormatOptions;

  constructor(options: CsvFormatOptions = {}) {
    this.options = {
      includeHeaders: true,
      delimiter: ",",
      escape: true,
      ...options,
    };
  }

  canFormat(contentType: string): boolean {
    return (
      contentType === "text/csv" ||
      contentType === "application/csv" ||
      contentType === "text/*" ||
      contentType === "*/*"
    );
  }

  format<T>(data: T): string {
    if (data === null || data === undefined) {
      return "";
    }

    if (Array.isArray(data)) {
      return this.formatArray(data);
    }

    // Single object
    return this.formatArray([data]);
  }

  getContentType(): string {
    return "text/csv";
  }

  getSupportedTypes(): Array<string> {
    return ["text/csv", "application/csv"];
  }

  getPriority(): number {
    return 0.8;
  }

  /**
   * Formats an array of objects as CSV.
   */
  private formatArray(data: Array<unknown>): string {
    if (data.length === 0) {
      return "";
    }

    const rows: Array<unknown> = data.map((item) => {
      if (this.options.transform) {
        return this.options.transform(item);
      }
      return item;
    });

    // Extract fields
    const fields = this.options.fields || this.extractFields(rows[0]);
    const lines: Array<string> = [];

    // Add headers
    if (this.options.includeHeaders) {
      lines.push(this.formatRow(fields));
    }

    // Add data rows
    for (const row of rows) {
      const values = fields.map((field) => this.getFieldValue(row, field));
      lines.push(this.formatRow(values));
    }

    return lines.join("\n");
  }

  /**
   * Extracts field names from an object.
   */
  private extractFields(obj: unknown): Array<string> {
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return Object.keys(obj);
    }
    return [];
  }

  /**
   * Gets a field value from an object.
   */
  private getFieldValue(obj: unknown, field: string): string {
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const value = (obj as Record<string, unknown>)[field];
      if (value === null || value === undefined) {
        return "";
      }
      return String(value);
    }
    return "";
  }

  /**
   * Formats a row of values as CSV.
   */
  private formatRow(values: Array<string>): string {
    const delimiter = this.options.delimiter || ",";

    if (this.options.escape) {
      return values.map((value) => this.escapeCsvValue(value)).join(delimiter);
    }

    return values.join(delimiter);
  }

  /**
   * Escapes a CSV value.
   */
  private escapeCsvValue(value: string): string {
    // If value contains delimiter, newline, or quote, wrap in quotes and escape quotes
    if (
      value.includes(this.options.delimiter || ",") ||
      value.includes("\n") ||
      value.includes('"')
    ) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
