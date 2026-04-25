import {
  IContentFormatter,
  XmlFormatOptions,
} from "../../interfaces/content-negotiation.interface.js";

/**
 * XML formatter for content negotiation.
 * Formats data as XML with configurable options.
 */
export class XmlFormatter implements IContentFormatter {
  private options: XmlFormatOptions;

  constructor(options: XmlFormatOptions = {}) {
    this.options = {
      rootElement: "root",
      itemElement: "item",
      prettyPrint: false,
      xmlDeclaration: true,
      ...options,
    };
  }

  canFormat(contentType: string): boolean {
    return (
      contentType === "application/xml" ||
      contentType === "text/xml" ||
      contentType === "application/*" ||
      contentType === "*/*"
    );
  }

  format<T>(data: T): string {
    const xml = this.serialize(data, this.options.rootElement || "root");
    if (this.options.xmlDeclaration) {
      return '<?xml version="1.0" encoding="UTF-8"?>\n' + xml;
    }
    return xml;
  }

  getContentType(): string {
    return "application/xml";
  }

  getSupportedTypes(): Array<string> {
    return ["application/xml", "text/xml"];
  }

  getPriority(): number {
    return 0.9;
  }

  /**
   * Serializes data to XML string.
   */
  private serialize(data: unknown, rootElement: string): string {
    if (data === null || data === undefined) {
      return `<${rootElement}></${rootElement}>`;
    }

    if (Array.isArray(data)) {
      const items = data.map((item) =>
        this.serialize(item, this.options.itemElement || "item"),
      );
      return `<${rootElement}>${this.formatXml(items.join(""))}</${rootElement}>`;
    }

    if (typeof data === "object") {
      const entries = Object.entries(data);
      const children: Array<string> = [];
      const attributes: Array<string> = [];

      for (const [key, value] of entries) {
        if (this.options.attributes?.includes(key)) {
          attributes.push(`${key}="${this.escapeXml(String(value))}"`);
        } else {
          children.push(this.serialize(value, key));
        }
      }

      const attrs = attributes.length > 0 ? " " + attributes.join(" ") : "";
      const content = children.join("");

      if (content) {
        return `<${rootElement}${attrs}>${this.formatXml(content)}</${rootElement}>`;
      }
      return `<${rootElement}${attrs}></${rootElement}>`;
    }

    // Primitive value
    return `<${rootElement}>${this.escapeXml(String(data))}</${rootElement}>`;
  }

  /**
   * Formats XML with indentation if pretty print is enabled.
   */
  private formatXml(xml: string): string {
    if (!this.options.prettyPrint) {
      return xml;
    }

    // Simple pretty printing (can be enhanced)
    let formatted = "";
    let indent = 0;
    const indentStr = "  ";

    for (let i = 0; i < xml.length; i++) {
      const char = xml[i];
      const nextChar = xml[i + 1];

      if (char === "<" && nextChar === "/") {
        indent--;
        formatted += "\n" + indentStr.repeat(Math.max(0, indent)) + char;
      } else if (char === "<") {
        if (i > 0 && xml[i - 1] !== ">") {
          formatted += "\n" + indentStr.repeat(indent);
        }
        formatted += char;
        if (nextChar !== "/" && nextChar !== "?") {
          indent++;
        }
      } else if (char === ">") {
        formatted += char;
        if (nextChar && nextChar !== "<") {
          formatted += "\n" + indentStr.repeat(indent);
        }
      } else {
        formatted += char;
      }
    }

    return formatted;
  }

  /**
   * Escapes XML special characters.
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}
