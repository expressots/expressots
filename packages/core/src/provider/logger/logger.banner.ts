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
      showFeatures: config?.showFeatures ?? false, // Disabled by default
      showConfig: config?.showConfig ?? true,
      showPerformance: config?.showPerformance ?? true,
      showHealth: config?.showHealth ?? true,
      showResources: config?.showResources ?? false, // Disabled by default
      showMiddlewarePipeline: config?.showMiddlewarePipeline ?? false, // Disabled by default
      showProviderRegistry: config?.showProviderRegistry ?? false, // Disabled by default
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
   * Display full banner with clean 3-column layout.
   * Default shows: Banner, Server Status, Configuration, System Health, Performance
   * Optional (user-enabled): Features, Middleware Pipeline, Provider Registry, Resources
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
    // Banner box width is ~93 chars, calculate column widths for 3 columns
    const totalWidth = 93;
    const colWidth = 29;
    const colSeparator = "  ";

    // Logo with TS in white
    writeStdout(getExpressoTSLogo());
    writeStdout("\n\n");

    // ══════════════════════════════════════════════════════════════════════
    // Version info line (matches banner width)
    // ══════════════════════════════════════════════════════════════════════
    const frameworkVersion = "4.0.0-beta.1";
    const nodeVersion = process.version;
    const platform = process.platform;
    const appName = appInfo?.appName || "App";
    const appVersion = appInfo?.appVersion || "not provided";

    // Display API versions if available
    const appInfoWithVersions = appInfo as IConsoleMessage & {
      apiVersions?: Array<string>;
    };
    const apiVersions = appInfoWithVersions?.apiVersions?.join(", ") || "";

    // Build a clean header line
    const headerLeft = `   ${colorText(`ExpressoTS v${frameworkVersion}`, "green")}`;
    const headerMid = `${colorText(`${appName} v${appVersion}`, "blue")}`;
    const headerRight = `${colorText(`Node ${nodeVersion} (${platform})`, "white")}`;

    // Calculate padding for even distribution
    const headerLeftVisible = `   ExpressoTS v${frameworkVersion}`;
    const headerMidVisible = `${appName} v${appVersion}`;
    const headerRightVisible = `Node ${nodeVersion} (${platform})`;

    const leftPad = colWidth - headerLeftVisible.length;
    const midPad =
      totalWidth -
      headerLeftVisible.length -
      headerMidVisible.length -
      headerRightVisible.length -
      leftPad;

    writeStdout(
      headerLeft +
        " ".repeat(Math.max(1, leftPad)) +
        headerMid +
        " ".repeat(Math.max(1, midPad)) +
        headerRight +
        "\n",
    );

    if (apiVersions) {
      writeStdout(`   ${colorText(`API Versions: ${apiVersions}`, "blue")}\n`);
    }

    writeStdout("\n");

    // ══════════════════════════════════════════════════════════════════════
    // Main info: 3 columns - Server Status | Configuration | System Health
    // ══════════════════════════════════════════════════════════════════════
    const col1Lines: Array<string> = []; // Server Status
    const col2Lines: Array<string> = []; // Configuration
    const col3Lines: Array<string> = []; // System Health

    // Column 1: Server Status
    col1Lines.push(colorText("⚡ Server", "yellow"));
    col1Lines.push(`  Env: ${this.colorEnvironment(environment)}`);
    col1Lines.push(`  Port: ${colorText(String(port), "cyan")}`);
    col1Lines.push(`  PID: ${colorText(String(process.pid), "cyan")}`);

    // Add metrics summary if available
    if (this.config.showMetrics && metrics) {
      col1Lines.push(``);
      col1Lines.push(colorText("📊 Metrics", "yellow"));
      col1Lines.push(`  Routes: ${colorText(String(metrics.routes), "green")}`);
      col1Lines.push(
        `  Controllers: ${colorText(String(metrics.controllers), "green")}`,
      );
      col1Lines.push(
        `  Providers: ${colorText(String(metrics.providers), "green")}`,
      );
      if (metrics.middleware > 0) {
        col1Lines.push(
          `  Middleware: ${colorText(String(metrics.middleware), "green")}`,
        );
      }
    }

    // Column 2: Configuration
    if (this.config.showConfig && config) {
      col2Lines.push(colorText("⚙️  Config", "yellow"));
      const entries = Object.entries(config);
      entries.slice(0, 6).forEach(([key, value]) => {
        // Truncate key if too long
        const displayKey = key.length > 12 ? key.slice(0, 11) + "…" : key;
        const displayVal = String(value);
        const truncatedVal =
          displayVal.length > 10 ? displayVal.slice(0, 9) + "…" : displayVal;
        col2Lines.push(`  ${displayKey}: ${colorText(truncatedVal, "cyan")}`);
      });
      if (entries.length > 6) {
        col2Lines.push(
          `  ${colorText(`+${entries.length - 6} more...`, "white")}`,
        );
      }
    }

    // Add guards/filters/interceptors info if any
    if (this.config.showMetrics && metrics) {
      const hasExtras =
        (metrics.guards ?? 0) > 0 ||
        (metrics.filters ?? 0) > 0 ||
        (metrics.interceptors ?? 0) > 0;

      if (hasExtras) {
        if (col2Lines.length > 0) col2Lines.push(``);
        col2Lines.push(colorText("🛡️  Security", "yellow"));
        if (metrics.guards && metrics.guards > 0) {
          col2Lines.push(
            `  Guards: ${colorText(String(metrics.guards), "green")}`,
          );
        }
        if (metrics.filters && metrics.filters > 0) {
          col2Lines.push(
            `  Filters: ${colorText(String(metrics.filters), "green")}`,
          );
        }
        if (metrics.interceptors && metrics.interceptors > 0) {
          col2Lines.push(
            `  Interceptors: ${colorText(String(metrics.interceptors), "green")}`,
          );
        }
      }
    }

    // Column 3: System Health
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

      col3Lines.push(colorText("💚 Health", "yellow"));
      col3Lines.push(
        `  Memory: ${colorText(`${memoryFormatted}`, memoryColor)}`,
      );
      col3Lines.push(
        `  Heap: ${colorText(`${memoryUsagePercent}%`, memoryColor)}`,
      );
      col3Lines.push(`  RSS: ${colorText(formatMemory(memory.rss), "cyan")}`);
    }

    // Add performance to column 3
    if (this.config.showPerformance) {
      if (col3Lines.length > 0) col3Lines.push(``);
      col3Lines.push(colorText("⏱️  Startup", "yellow"));
      col3Lines.push(
        `  Time: ${colorText(`${startupTime.toFixed(0)}ms`, "green")}`,
      );
      col3Lines.push(`  URL: ${colorText(`localhost:${port}`, "cyan")}`);
    }

    // Render 3 columns side by side
    const maxRows = Math.max(
      col1Lines.length,
      col2Lines.length,
      col3Lines.length,
    );
    for (let i = 0; i < maxRows; i++) {
      const c1 = col1Lines[i] || "";
      const c2 = col2Lines[i] || "";
      const c3 = col3Lines[i] || "";

      // Calculate visible lengths (strip ANSI codes for padding)
      const c1Visible = c1.replace(ANSI_STRIP_REGEX, "");
      const c2Visible = c2.replace(ANSI_STRIP_REGEX, "");

      const pad1 = colWidth - c1Visible.length;
      const pad2 = colWidth - c2Visible.length;

      writeStdout(
        c1 +
          " ".repeat(Math.max(1, pad1)) +
          colSeparator +
          c2 +
          " ".repeat(Math.max(1, pad2)) +
          colSeparator +
          c3 +
          "\n",
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // Optional sections (only shown if user enables them)
    // ══════════════════════════════════════════════════════════════════════

    // Middleware Pipeline | Provider Registry (if enabled)
    const middlewareView = bannerData?.middlewareView;
    const providerView = bannerData?.providerView;
    const showMw = this.config.showMiddlewarePipeline === true;
    const showPrv = this.config.showProviderRegistry === true;

    if ((showMw && middlewareView) || (showPrv && providerView)) {
      writeStdout("\n");
      const mwLines: Array<string> = [];
      const prvLines: Array<string> = [];

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

      if (showPrv && providerView && providerView.total > 0) {
        prvLines.push(colorText("📚 Provider Registry", "yellow"));
        providerView.entries.forEach((prv, i, arr) => {
          const isLast = i === arr.length - 1 && providerView.remaining === 0;
          const connector = isLast ? "└─" : "├─";
          const icons: Array<string> = [];
          if (prv.isEventHandler) icons.push("⚡");
          if (prv.isInterceptor) icons.push("🎭");
          if (prv.isLazyModule) icons.push("💤");
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

      const twoColWidth = 45;
      const pipelineMaxRows = Math.max(mwLines.length, prvLines.length);
      for (let i = 0; i < pipelineMaxRows; i++) {
        const left = mwLines[i] || "";
        const right = prvLines[i] || "";
        const leftVisible = left.replace(ANSI_STRIP_REGEX, "");
        const padding = twoColWidth - leftVisible.length;
        writeStdout(
          left + " ".repeat(Math.max(0, padding)) + "  " + right + "\n",
        );
      }
    }

    // Features (if enabled)
    if (this.config.showFeatures && features) {
      writeStdout("\n");
      writeStdout(colorText("📦 Features Enabled", "yellow") + "\n");
      const featureList = [
        { name: "Global Prefix", enabled: features.globalRoutePrefix },
        { name: "API Versioning", enabled: features.apiVersioning },
        { name: "Validation", enabled: features.smartValidation },
        { name: "Guards", enabled: features.authorization },
        { name: "Filters", enabled: features.exceptionFilters },
        { name: "Interceptors", enabled: features.interceptors },
        { name: "Lifecycle", enabled: features.lifecycleHooks },
        { name: "Events", enabled: features.eventSystem },
        { name: "Lazy Loading", enabled: features.lazyLoading },
      ];

      // Display in 3 columns
      const featuresPerRow = 3;
      const featureColWidth = 28;
      for (let i = 0; i < featureList.length; i += featuresPerRow) {
        let row = "   ";
        for (let j = 0; j < featuresPerRow && i + j < featureList.length; j++) {
          const feat = featureList[i + j];
          const icon = feat.enabled
            ? colorText("✓", "green")
            : colorText("✗", "red");
          const text = `${icon} ${feat.name}`;
          const textVisible = `${feat.enabled ? "✓" : "✗"} ${feat.name}`;
          const pad = featureColWidth - textVisible.length;
          row += text + " ".repeat(Math.max(1, pad));
        }
        writeStdout(row + "\n");
      }
    }

    // Resources (if enabled)
    if (this.config.showResources) {
      writeStdout("\n");
      writeStdout(colorText("🔗 Resources", "yellow") + "\n");
      writeStdout(
        `   ${colorText("Docs:", "white")} expresso-ts.com  ` +
          `${colorText("GitHub:", "white")} github.com/expressots  ` +
          `${colorText("Discord:", "white")} discord.gg/PyPJfGK\n`,
      );
    }

    writeStdout("\n");
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
