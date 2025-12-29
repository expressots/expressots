import { IConsoleMessage } from "@expressots/shared";
import { colorCodes, Color } from "../../console/color-codes";
import {
  ApplicationMetrics,
  FeaturesStatus,
  BannerConfig,
  formatMemory,
} from "./logger.metrics";
import { MiddlewareCategory } from "../../middleware/middleware-service";

// eslint-disable-next-line no-control-regex
const ANSI_STRIP_REGEX = /\x1b\[[0-9;]*m/g;

/**
 * Middleware view entry for banner display.
 */
export interface MiddlewareView {
  entries: Array<{
    name: string;
    category: MiddlewareCategory;
    type: "built-in" | "custom";
  }>;
  total: number;
  remaining: number;
}

/**
 * Provider view entry for banner display.
 */
export interface ProviderView {
  entries: Array<{
    name: string;
    scope: string;
    hasLifecycle: boolean;
    hasHealthCheck: boolean;
    hasMetrics: boolean;
    /** Provider is an event handler */
    isEventHandler?: boolean;
    /** Provider is an interceptor */
    isInterceptor?: boolean;
    /** Provider is a lazy module */
    isLazyModule?: boolean;
  }>;
  total: number;
  remaining: number;
}

/**
 * Extended banner data including middleware and provider info.
 */
export interface BannerData {
  appInfo?: IConsoleMessage & { apiVersions?: Array<string> };
  metrics?: ApplicationMetrics;
  features?: FeaturesStatus;
  config?: Record<string, unknown>;
  middlewareView?: MiddlewareView;
  providerView?: ProviderView;
}

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
      showMiddlewarePipeline: config?.showMiddlewarePipeline ?? true,
      showProviderRegistry: config?.showProviderRegistry ?? true,
      maxMiddlewareDisplay: config?.maxMiddlewareDisplay ?? 6,
      maxProviderDisplay: config?.maxProviderDisplay ?? 5,
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
   * @param bannerData - Extended banner data (middleware/provider views)
   */
  display(
    port: number,
    environment: string,
    appInfo?: IConsoleMessage,
    metrics?: ApplicationMetrics,
    features?: FeaturesStatus,
    config?: Record<string, unknown>,
    bannerData?: BannerData,
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
          bannerData,
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
    bannerData?: BannerData,
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

    // Display API versions if available
    const appInfoWithVersions = appInfo as IConsoleMessage & {
      apiVersions?: Array<string>;
    };
    if (
      appInfoWithVersions?.apiVersions &&
      appInfoWithVersions.apiVersions.length > 0
    ) {
      const apiVersionsText = `   API Versions: ${appInfoWithVersions.apiVersions.join(", ")}`;
      writeStdout(colorText(`${leftPrefix}${apiVersionsText}`, "blue") + "\n");
    }

    writeStdout("\n");

    // Two-column layout: Server Status (left) | Application Health (right)
    const colWidth = 40;
    const separator = "   ";

    // Server Status (left column)
    const serverLines: Array<string> = [
      colorText("⚡ Server Status", "yellow"),
      `   ├─ Env: ${this.colorEnvironment(environment)}`,
      `   ├─ Port: ${colorText(String(port), "blue")}`,
      `   ├─ PID: ${colorText(String(process.pid), "blue")}`,
      `   └─ URL: ${colorText(`http://localhost:${port}`, "blue")}`,
    ];

    // Application Health (right column)
    const healthLines: Array<string> = [
      colorText("🎯 Application Health", "yellow"),
    ];

    if (this.config.showMetrics && metrics) {
      healthLines.push(
        `   ├─ Controllers: ${colorText(String(metrics.controllers), "green")} loaded`,
      );
      healthLines.push(
        `   ├─ Providers: ${colorText(String(metrics.providers), "green")} registered`,
      );
      healthLines.push(
        `   ├─ Middleware: ${colorText(String(metrics.middleware), "green")} active`,
      );
      if (metrics.guards && metrics.guards > 0) {
        healthLines.push(
          `   ├─ Guards: ${colorText(String(metrics.guards), "green")} active`,
        );
      }
      if (metrics.filters && metrics.filters > 0) {
        healthLines.push(
          `   ├─ Filters: ${colorText(String(metrics.filters), "green")} active`,
        );
      }
      if (metrics.interceptors && metrics.interceptors > 0) {
        healthLines.push(
          `   ├─ Interceptors: ${colorText(String(metrics.interceptors), "green")} active`,
        );
      }
      if (metrics.eventHandlers && metrics.eventHandlers > 0) {
        healthLines.push(
          `   ├─ Event Handlers: ${colorText(String(metrics.eventHandlers), "green")} registered`,
        );
      }
      if (metrics.lazyModules && metrics.lazyModules > 0) {
        healthLines.push(
          `   ├─ Lazy Modules: ${colorText(String(metrics.lazyModules), "green")} configured`,
        );
      }
      healthLines.push(
        `   └─ Routes: ${colorText(String(metrics.routes), "green")} registered`,
      );
    }

    // Render two columns side by side
    const maxRows = Math.max(serverLines.length, healthLines.length);
    for (let i = 0; i < maxRows; i++) {
      const left = serverLines[i] || "";
      const right = healthLines[i] || "";
      // Calculate visible length (strip ANSI codes for padding)
      const leftVisible = left.replace(ANSI_STRIP_REGEX, "");
      const padding = colWidth - leftVisible.length;
      writeStdout(
        left + " ".repeat(Math.max(0, padding)) + separator + right + "\n",
      );
    }
    writeStdout("\n");

    // ══════════════════════════════════════════════════════════════════════
    // Middleware Pipeline | Provider Registry (Two-column layout)
    // ══════════════════════════════════════════════════════════════════════
    const middlewareView = bannerData?.middlewareView;
    const providerView = bannerData?.providerView;
    const showMw = this.config.showMiddlewarePipeline !== false;
    const showPrv = this.config.showProviderRegistry !== false;

    if ((showMw && middlewareView) || (showPrv && providerView)) {
      const mwLines: Array<string> = [];
      const prvLines: Array<string> = [];

      // Middleware Pipeline (left column)
      if (showMw && middlewareView && middlewareView.total > 0) {
        mwLines.push(colorText("🔌 Middleware Pipeline", "yellow"));
        middlewareView.entries.forEach((mw, i, arr) => {
          const isLast = i === arr.length - 1 && middlewareView.remaining === 0;
          const connector = isLast ? "└─" : "├─";
          const typeIcon = mw.type === "built-in" ? "📦" : "🔧";
          const categoryColor = this.getCategoryColor(mw.category);
          mwLines.push(
            `   ${connector} ${typeIcon} ${colorText(mw.name, categoryColor)} (${mw.category})`,
          );
        });
        if (middlewareView.remaining > 0) {
          mwLines.push(
            `   └─ ${colorText(`... +${middlewareView.remaining} more`, "white")}`,
          );
        }
      }

      // Provider Registry (right column)
      if (showPrv && providerView && providerView.total > 0) {
        prvLines.push(colorText("📚 Provider Registry", "yellow"));
        providerView.entries.forEach((prv, i, arr) => {
          const isLast = i === arr.length - 1 && providerView.remaining === 0;
          const connector = isLast ? "└─" : "├─";
          const icons: Array<string> = [];
          // v4.0 feature icons (show first for visibility)
          if (prv.isEventHandler) icons.push("⚡");
          if (prv.isInterceptor) icons.push("🎭");
          if (prv.isLazyModule) icons.push("💤");
          // Original capability icons
          if (prv.hasLifecycle) icons.push("🔄");
          if (prv.hasHealthCheck) icons.push("💚");
          if (prv.hasMetrics) icons.push("📊");
          const iconStr = icons.length > 0 ? ` ${icons.join("")}` : "";
          const scopeColor = this.getScopeColor(prv.scope);
          prvLines.push(
            `   ${connector} ${colorText(prv.name, "blue")} [${colorText(prv.scope, scopeColor)}]${iconStr}`,
          );
        });
        if (providerView.remaining > 0) {
          prvLines.push(
            `   └─ ${colorText(`... +${providerView.remaining} more`, "white")}`,
          );
        }
      }

      // Render two columns
      const pipelineMaxRows = Math.max(mwLines.length, prvLines.length);
      for (let i = 0; i < pipelineMaxRows; i++) {
        const left = mwLines[i] || "";
        const right = prvLines[i] || "";
        const leftVisible = left.replace(ANSI_STRIP_REGEX, "");
        const padding = colWidth - leftVisible.length;
        writeStdout(
          left + " ".repeat(Math.max(0, padding)) + separator + right + "\n",
        );
      }
      writeStdout("\n");
    }

    // ══════════════════════════════════════════════════════════════════════
    // Features | Configuration (Two-column layout)
    // ══════════════════════════════════════════════════════════════════════
    if (
      (this.config.showFeatures && features) ||
      (this.config.showConfig && config)
    ) {
      const featLines: Array<string> = [];
      const cfgLines: Array<string> = [];

      // Features (left column)
      if (this.config.showFeatures && features) {
        featLines.push(colorText("📦 Features Enabled", "yellow"));
        const featureList = [
          { name: "Global Route Prefix", enabled: features.globalRoutePrefix },
          { name: "API Versioning", enabled: features.apiVersioning },
          { name: "Content Negotiation", enabled: features.contentNegotiation },
          { name: "Smart Validation", enabled: features.smartValidation },
          { name: "Authorization (Guards)", enabled: features.authorization },
          { name: "Exception Filters", enabled: features.exceptionFilters },
          { name: "Interceptors", enabled: features.interceptors },
          { name: "Error Handler", enabled: features.errorHandler },
          { name: "Graceful Shutdown", enabled: features.gracefulShutdown },
          { name: "Lifecycle Hooks", enabled: features.lifecycleHooks },
          { name: "Request Logging", enabled: features.requestLogging },
          { name: "Event System", enabled: features.eventSystem },
          { name: "Lazy Loading", enabled: features.lazyLoading },
          { name: "Enhanced Config", enabled: features.enhancedConfiguration },
          { name: "Custom Scopes", enabled: features.customScopes },
        ];
        featureList.forEach((feat, i) => {
          const isLast = i === featureList.length - 1;
          const connector = isLast ? "└─" : "├─";
          const status = feat.enabled
            ? colorText("✅", "green")
            : colorText("❌", "red");
          featLines.push(`   ${connector} ${status} ${feat.name}`);
        });
      }

      // Configuration (right column)
      if (this.config.showConfig && config) {
        cfgLines.push(colorText("⚙️  Configuration", "yellow"));
        const entries = Object.entries(config);
        entries.forEach(([key, value], i) => {
          const isLast = i === entries.length - 1;
          const connector = isLast ? "└─" : "├─";
          cfgLines.push(
            `   ${connector} ${key}: ${colorText(String(value), "blue")}`,
          );
        });
      }

      // Render two columns
      const fcMaxRows = Math.max(featLines.length, cfgLines.length);
      for (let i = 0; i < fcMaxRows; i++) {
        const left = featLines[i] || "";
        const right = cfgLines[i] || "";
        const leftVisible = left.replace(ANSI_STRIP_REGEX, "");
        const padding = colWidth - leftVisible.length;
        writeStdout(
          left + " ".repeat(Math.max(0, padding)) + separator + right + "\n",
        );
      }
      writeStdout("\n");
    }

    // ══════════════════════════════════════════════════════════════════════
    // Resources | System Health (Two-column layout)
    // ══════════════════════════════════════════════════════════════════════
    if (this.config.showResources || this.config.showHealth) {
      const resLines: Array<string> = [];
      const healthLines: Array<string> = [];

      // Resources (left column)
      if (this.config.showResources) {
        resLines.push(colorText("🔗 Resources", "yellow"));
        resLines.push(
          `   ├─ Docs: ${colorText("https://expresso-ts.com", "blue")}`,
        );
        resLines.push(
          `   ├─ GitHub: ${colorText("github.com/expressots", "blue")}`,
        );
        resLines.push(
          `   └─ Discord: ${colorText("discord.gg/PyPJfGK", "blue")}`,
        );
      }

      // System Health (right column)
      if (this.config.showHealth) {
        const memory = process.memoryUsage();
        const memoryUsagePercent = Math.round(
          (memory.heapUsed / memory.heapTotal) * 100,
        );
        const memoryColor: Color =
          memoryUsagePercent >= 80
            ? "red"
            : memoryUsagePercent >= 60
              ? "yellow"
              : "green";

        healthLines.push(colorText("💚 System Health", "yellow"));
        healthLines.push(
          `   ├─ Memory: ${colorText(`${memoryFormatted} (${memoryUsagePercent}%)`, memoryColor)}`,
        );
        healthLines.push(
          `   ├─ Heap: ${colorText(formatMemory(memory.heapTotal), "blue")}`,
        );
        healthLines.push(
          `   └─ RSS: ${colorText(formatMemory(memory.rss), "blue")}`,
        );
      }

      // Render two columns
      const rhMaxRows = Math.max(resLines.length, healthLines.length);
      for (let i = 0; i < rhMaxRows; i++) {
        const left = resLines[i] || "";
        const right = healthLines[i] || "";
        const leftVisible = left.replace(ANSI_STRIP_REGEX, "");
        const padding = colWidth - leftVisible.length;
        writeStdout(
          left + " ".repeat(Math.max(0, padding)) + separator + right + "\n",
        );
      }
      writeStdout("\n");
    }

    // ══════════════════════════════════════════════════════════════════════
    // Performance (Single line at the bottom)
    // ══════════════════════════════════════════════════════════════════════
    if (this.config.showPerformance) {
      writeStdout(
        colorText(`⏱️  Startup: ${startupTime.toFixed(0)}ms`, "yellow") +
          colorText(` | Memory: ${memoryFormatted}`, "yellow") +
          colorText(` | PID: ${process.pid}`, "yellow") +
          "\n",
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

  /**
   * Get color for middleware category.
   */
  private getCategoryColor(category: MiddlewareCategory): Color {
    switch (category) {
      case "parser":
        return "cyan";
      case "security":
        return "red";
      case "logging":
        return "yellow";
      case "validation":
        return "magenta";
      case "error":
        return "red";
      case "session":
        return "cyan";
      case "static":
        return "white";
      case "other":
      default:
        return "white";
    }
  }

  /**
   * Get color for provider scope.
   */
  private getScopeColor(scope: string): Color {
    switch (scope.toLowerCase()) {
      case "singleton":
        return "green";
      case "request":
        return "yellow";
      case "transient":
        return "cyan";
      default:
        return "magenta"; // Custom scope
    }
  }
}
