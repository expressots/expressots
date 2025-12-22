import {
  IContentFormatter,
  YamlFormatOptions,
} from "../../interfaces/content-negotiation.interface";

/**
 * YAML formatter for content negotiation.
 * Formats data as YAML with configurable options.
 */
export class YamlFormatter implements IContentFormatter {
  private options: YamlFormatOptions;

  constructor(options: YamlFormatOptions = {}) {
    this.options = {
      indent: 2,
      quoteStrings: false,
      lineWidth: 80,
      ...options,
    };
  }

  canFormat(contentType: string): boolean {
    return (
      contentType === "application/yaml" ||
      contentType === "text/yaml" ||
      contentType === "application/x-yaml" ||
      contentType === "text/x-yaml" ||
      contentType === "application/*" ||
      contentType === "*/*"
    );
  }

  format<T>(data: T): string {
    return this.serialize(data, 0);
  }

  getContentType(): string {
    return "application/yaml";
  }

  getSupportedTypes(): Array<string> {
    return [
      "application/yaml",
      "text/yaml",
      "application/x-yaml",
      "text/x-yaml",
    ];
  }

  getPriority(): number {
    return 0.7;
  }

  /**
   * Serializes data to YAML string.
   */
  private serialize(data: unknown, indent: number): string {
    const indentStr = " ".repeat(this.options.indent || 2);
    const currentIndent = indentStr.repeat(indent);

    if (data === null || data === undefined) {
      return "null";
    }

    if (typeof data === "string") {
      if (this.options.quoteStrings || this.needsQuoting(data)) {
        return `"${this.escapeString(data)}"`;
      }
      return data;
    }

    if (typeof data === "number" || typeof data === "boolean") {
      return String(data);
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return "[]";
      }

      const items = data.map((item) => {
        const serialized = this.serialize(item, indent + 1);
        return `${currentIndent}${indentStr}- ${serialized.split("\n")[0]}`;
      });

      return items.join("\n");
    }

    if (typeof data === "object") {
      const entries = Object.entries(data);
      if (entries.length === 0) {
        return "{}";
      }

      const lines: Array<string> = [];
      for (const [key, value] of entries) {
        const serialized = this.serialize(value, indent + 1);
        const keyStr = this.needsQuoting(key) ? `"${key}"` : key;

        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          lines.push(`${currentIndent}${keyStr}:`);
          const valueLines = serialized.split("\n");
          valueLines.forEach((line) => {
            if (line.trim()) {
              lines.push(line);
            }
          });
        } else {
          lines.push(`${currentIndent}${keyStr}: ${serialized.split("\n")[0]}`);
        }
      }

      return lines.join("\n");
    }

    return String(data);
  }

  /**
   * Checks if a string needs quoting in YAML.
   */
  private needsQuoting(str: string): boolean {
    return (
      str.includes(":") ||
      str.includes("#") ||
      str.includes("|") ||
      str.includes(">") ||
      str.includes("&") ||
      str.includes("*") ||
      str.includes("!") ||
      str.includes("%") ||
      str.includes("@") ||
      str.includes("`") ||
      str.trim() !== str ||
      /^\d/.test(str) ||
      str === "true" ||
      str === "false" ||
      str === "null" ||
      str === "yes" ||
      str === "no" ||
      str === "on" ||
      str === "off"
    );
  }

  /**
   * Escapes special characters in a string.
   */
  private escapeString(str: string): string {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }
}
