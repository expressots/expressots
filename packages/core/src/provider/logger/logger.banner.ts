import { IConsoleMessage } from "@expressots/shared";
import { colorCodes, Color } from "../../console/color-codes";
import {
  ApplicationMetrics,
  FeaturesStatus,
  BannerConfig,
  formatMemory,
} from "./logger.metrics";

// Helper to write to stdout - uses process.stdout directly to allow runtime interception
const writeStdout = (text: string): void => {
  process.stdout.write(text);
};

/**
 * ExpressoTS ASCII art logo with TS in white (full EXPRESSOTS name).
 */
function getExpressoTSLogo(): string {
  const green = colorCodes.green;
  const white = colorCodes.white;
  const reset = "\x1b[0m";

  // EXPRESSO in green (full word - E X P R E S S O = 8 letters)
  // Each line must have the same visible width for proper box alignment
  const expressoLines = [
    "███████╗██╗  ██╗██████╗ ██████╗ ███████╗███████╗███████╗ ██████╗ ",
    "██╔════╝╚██╗██╔╝██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝██╔═══██╗",
    "█████╗   ╚███╔╝ ██████╔╝██████╔╝█████╗  ███████╗███████╗██║   ██║",
    "██╔══╝   ██╔██╗ ██╔═══╝ ██╔══██╗██╔══╝  ╚════██║╚════██║██║   ██║",
    "███████╗██╔╝ ██╗██║     ██║  ██║███████╗███████║███████║╚██████╔╝",
    "╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝ ╚═════╝ ",
  ];

  // TS in white (full "TS" ASCII art)
  const tsLines = [
    "████████╗███████╗",
    "╚══██╔══╝██╔════╝",
    "   ██║   ███████╗",
    "   ██║   ╚════██║",
    "   ██║   ███████║",
    "   ╚═╝   ╚══════╝",
  ];

  // Normalize line widths - find max width and pad all lines
  const maxExpressoWidth = Math.max(...expressoLines.map((l) => l.length));
  const maxTsWidth = Math.max(...tsLines.map((l) => l.length));

  const normalizedExpresso = expressoLines.map((l) =>
    l.padEnd(maxExpressoWidth),
  );
  const normalizedTs = tsLines.map((l) => l.padEnd(maxTsWidth));

  // Calculate box width
  const totalContentWidth = maxExpressoWidth + maxTsWidth;
  const leftPadding = 3;
  const rightPadding = 4;
  const boxWidth = totalContentWidth + leftPadding + rightPadding;

  const padLeft = " ".repeat(leftPadding);
  const padRight = " ".repeat(rightPadding);

  // Build the box with proper alignment
  const topBorder = `╔${"═".repeat(boxWidth)}╗`;
  const emptyLine = `║${" ".repeat(boxWidth)}║`;
  const bottomBorder = `╚${"═".repeat(boxWidth)}╝`;

  // Build content lines with colors
  const contentLines = normalizedExpresso.map((exp, i) => {
    const ts = normalizedTs[i];
    return `║${padLeft}${green}${exp}${reset}${white}${ts}${reset}${padRight}║`;
  });

  return `
${topBorder}
${emptyLine}
${contentLines.join("\n")}
${emptyLine}
${bottomBorder}
`.trim();
}

/**
 * Compact ASCII art logo.
 */
const EXPRESSOTS_LOGO_COMPACT = `
╔════════════════════════════════════════════════════════════════╗
║  ExpressoTS  -  Enterprise TypeScript Framework                ║
╚════════════════════════════════════════════════════════════════╝
`.trim();

// Removed unused EXPRESSOTS_LOGO_MINIMAL constant

/**
 * Color text helper.
 */
function colorText(text: string, color: Color): string {
  return `${colorCodes[color]}${text}\x1b[0m`;
}

/**
 * Generate startup banner.
 * @public API
 */
export class BannerGenerator {
  private startTime: number;
  private config: BannerConfig;

  constructor(config?: BannerConfig) {
    this.startTime = Date.now();
    this.config = {
      style: config?.style ?? "full",
      showMetrics: config?.showMetrics ?? true,
      showFeatures: config?.showFeatures ?? true,
      showConfig: config?.showConfig ?? true,
      showPerformance: config?.showPerformance ?? true,
      showHealth: config?.showHealth ?? true,
      showResources: config?.showResources ?? true,
      ...config,
    };
  }

  /**
   * Generate and display the banner.
   * @param port - Server port
   * @param environment - Server environment
   * @param appInfo - Application info
   * @param metrics - Application metrics
   * @param features - Features status
   * @param config - Runtime configuration
   */
  display(
    port: number,
    environment: string,
    appInfo?: IConsoleMessage,
    metrics?: ApplicationMetrics,
    features?: FeaturesStatus,
    config?: Record<string, unknown>,
  ): void {
    if (this.config.style === "none") {
      return;
    }

    const startupTime = Date.now() - this.startTime;
    const memoryUsage = process.memoryUsage().heapUsed;
    const memoryFormatted = formatMemory(memoryUsage);

    writeStdout("\n");

    // Display logo based on style
    switch (this.config.style) {
      case "full":
        this.displayFullBanner(
          port,
          environment,
          appInfo,
          metrics,
          features,
          config,
          startupTime,
          memoryFormatted,
        );
        break;
      case "compact":
        this.displayCompactBanner(
          port,
          environment,
          appInfo,
          metrics,
          features,
          startupTime,
          memoryFormatted,
        );
        break;
      case "minimal":
        this.displayMinimalBanner(port, environment, appInfo);
        break;
    }

    writeStdout("\n");
  }

  /**
   * Display full banner.
   */
  private displayFullBanner(
    port: number,
    environment: string,
    appInfo: IConsoleMessage | undefined,
    metrics: ApplicationMetrics | undefined,
    features: FeaturesStatus | undefined,
    config: Record<string, unknown> | undefined,
    startupTime: number,
    memoryFormatted: string,
  ): void {
    // Logo with TS in white
    writeStdout(getExpressoTSLogo());
    writeStdout("\n\n");

    // Version and platform info
    const frameworkVersion = "4.0.0-beta.1";
    const nodeVersion = process.version;
    const platform = process.platform;
    const appName = appInfo?.appName || "App";
    const appVersion = appInfo?.appVersion || "not provided";

    // Align Node with Platform (both right-side items should align)
    const frameworkText = `ExpressoTS  v${frameworkVersion}`;
    const nodeText = `Node ${nodeVersion}`;
    const appText = `${appName} v${appVersion}`;
    const platformText = `Platform: ${platform}`;

    // Calculate padding to align Node with Platform
    // Both right-side items should start at the same column (around column 50)
    const leftPrefix = "   "; // 3 spaces
    const targetColumn = 50; // Target column for right-side alignment

    const frameworkLineLength = leftPrefix.length + frameworkText.length;
    const appLineLength = leftPrefix.length + appText.length;

    const nodePadding = Math.max(1, targetColumn - frameworkLineLength);
    const platformPadding = Math.max(1, targetColumn - appLineLength);

    writeStdout(
      colorText(`${leftPrefix}${frameworkText}`, "green") +
        colorText(`${" ".repeat(nodePadding)}${nodeText}`, "blue") +
        "\n",
    );
    writeStdout(
      colorText(`${leftPrefix}${appText}`, "blue") +
        colorText(`${" ".repeat(platformPadding)}${platformText}`, "blue") +
        "\n",
    );
    writeStdout("\n");

    // Server status
    writeStdout(colorText("⚡ Server Status", "yellow") + "\n");
    writeStdout(`   ├─ Environment: ${this.colorEnvironment(environment)}\n`);
    writeStdout(`   ├─ Port: ${colorText(String(port), "blue")}\n`);
    writeStdout(`   ├─ PID: ${colorText(String(process.pid), "blue")}\n`);
    writeStdout(
      `   ├─ URL: ${colorText(`http://localhost:${port}`, "blue")}\n`,
    );
    writeStdout(
      `   └─ Started: ${colorText(new Date().toLocaleString(), "white")}\n`,
    );
    writeStdout("\n");

    // Application metrics
    if (this.config.showMetrics && metrics) {
      writeStdout(colorText("🎯 Application Health", "yellow") + "\n");
      writeStdout(
        `   ├─ Controllers: ${colorText(String(metrics.controllers), "green")} loaded\n`,
      );
      writeStdout(
        `   ├─ Providers: ${colorText(String(metrics.providers), "green")} registered\n`,
      );
      writeStdout(
        `   ├─ Middleware: ${colorText(String(metrics.middleware), "green")} active\n`,
      );
      if (metrics.guards > 0) {
        writeStdout(
          `   ├─ Guards: ${colorText(String(metrics.guards), "green")} active\n`,
        );
      }
      if (metrics.filters > 0) {
        writeStdout(
          `   ├─ Filters: ${colorText(String(metrics.filters), "green")} active\n`,
        );
      }
      writeStdout(
        `   └─ Routes: ${colorText(String(metrics.routes), "green")} registered\n`,
      );
      writeStdout("\n");
    }

    // Features status
    if (this.config.showFeatures && features) {
      writeStdout(colorText("📦 Features Enabled", "yellow") + "\n");
      this.displayFeature("Content Negotiation", features.contentNegotiation);
      this.displayFeature("Smart Validation", features.smartValidation);
      this.displayFeature(
        "Authorization (RBAC, ABAC, Ownership)",
        features.authorization,
      );
      this.displayFeature(
        "Exception Filters (RFC 7807)",
        features.exceptionFilters,
      );
      this.displayFeature("Graceful Shutdown", features.gracefulShutdown);
      this.displayFeature("Lifecycle Hooks", features.lifecycleHooks);
      this.displayFeature("Custom Scopes", features.customScopes);
      writeStdout("\n");
    }

    // Configuration
    if (this.config.showConfig && config) {
      writeStdout(colorText("⚙️  Configuration", "yellow") + "\n");
      Object.entries(config).forEach(([key, value], index, entries) => {
        const isLast = index === entries.length - 1;
        const connector = isLast ? "└─" : "├─";
        writeStdout(
          `   ${connector} ${key}: ${colorText(String(value), "blue")}\n`,
        );
      });
      writeStdout("\n");
    }

    // Resources
    if (this.config.showResources) {
      writeStdout(colorText("🔗 Resources", "yellow") + "\n");
      writeStdout(
        `   ├─ Documentation: ${colorText("https://expresso-ts.com", "blue")}\n`,
      );
      writeStdout(
        `   ├─ GitHub: ${colorText("https://github.com/expressots/expressots", "blue")}\n`,
      );
      writeStdout(
        `   └─ Discord: ${colorText("https://discord.gg/PyPJfGK", "blue")}\n`,
      );
      writeStdout("\n");
    }

    // Performance metrics
    if (this.config.showPerformance) {
      writeStdout(
        colorText(`⏱️  Startup Time: ${startupTime.toFixed(2)}ms`, "yellow") +
          colorText(`   Memory: ${memoryFormatted}`, "yellow") +
          "\n",
      );
      writeStdout("\n");
    }

    // System health status
    if (this.config.showHealth) {
      const memory = process.memoryUsage();
      const memoryUsagePercent = Math.round(
        (memory.heapUsed / memory.heapTotal) * 100,
      );
      const memoryColor =
        memoryUsagePercent >= 80 ? "red" : memoryUsagePercent >= 60 ? "yellow" : "green";

      writeStdout(colorText("💚 System Health", "yellow") + "\n");
      writeStdout(
        `   ├─ Memory: ${colorText(`${memoryFormatted} (${memoryUsagePercent}%)`, memoryColor as Color)}\n`,
      );
      writeStdout(
        `   ├─ Heap Total: ${colorText(formatMemory(memory.heapTotal), "blue")}\n`,
      );
      writeStdout(
        `   ├─ External: ${colorText(formatMemory(memory.external), "blue")}\n`,
      );
      writeStdout(
        `   └─ RSS: ${colorText(formatMemory(memory.rss), "blue")}\n`,
      );
      writeStdout("\n");
    }
  }

  /**
   * Display compact banner.
   */
  private displayCompactBanner(
    port: number,
    environment: string,
    appInfo: IConsoleMessage | undefined,
    metrics: ApplicationMetrics | undefined,
    features: FeaturesStatus | undefined,
    startupTime: number,
    memoryFormatted: string,
  ): void {
    writeStdout(colorText(EXPRESSOTS_LOGO_COMPACT, "green"));
    writeStdout("\n\n");

    const appName = appInfo?.appName || "App";
    const appVersion = appInfo?.appVersion || "not provided";

    writeStdout(
      colorText(`ExpressoTS v4.0.0-beta.1`, "green") +
        colorText(` | ${appName} v${appVersion}`, "blue") +
        colorText(` | Node ${process.version}`, "blue") +
        "\n",
    );
    writeStdout(
      colorText(
        `Environment: ${this.colorEnvironment(environment)}`,
        "yellow",
      ) +
        colorText(` | Port: ${port}`, "blue") +
        colorText(` | PID: ${process.pid}`, "blue") +
        "\n",
    );

    if (metrics) {
      writeStdout(
        colorText(
          `Controllers: ${metrics.controllers} | Providers: ${metrics.providers} | Routes: ${metrics.routes}`,
          "white",
        ) + "\n",
      );
    }

    writeStdout(
      colorText(`Startup: ${startupTime.toFixed(2)}ms`, "yellow") +
        colorText(` | Memory: ${memoryFormatted}`, "yellow") +
        "\n",
    );
  }

  /**
   * Display minimal banner.
   */
  private displayMinimalBanner(
    port: number,
    environment: string,
    appInfo: IConsoleMessage | undefined,
  ): void {
    const appName = appInfo?.appName || "App";
    writeStdout(
      colorText(`[${appName}]`, "green") +
        colorText(` running on port [${port}]`, "blue") +
        colorText(` - Environment: [${environment}]`, "yellow") +
        "\n",
    );
  }

  /**
   * Display a feature status.
   */
  private displayFeature(name: string, enabled: boolean): void {
    const status = enabled ? colorText("✅", "green") : colorText("❌", "red");
    const isLast = name === "Custom Scopes";
    const connector = isLast ? "└─" : "├─";
    writeStdout(`   ${connector} ${status} ${name}\n`);
  }

  /**
   * Color environment based on type.
   */
  private colorEnvironment(environment: string): string {
    const env = environment.toLowerCase();
    if (env === "development") {
      return colorText(environment, "yellow");
    }
    if (env === "production") {
      return colorText(environment, "green");
    }
    return colorText(environment, "red");
  }
}
