#!/usr/bin/env node

/**
 * Documentation Generation Script for ExpressoTS
 *
 * This script generates comprehensive documentation from:
 * 1. JSDoc comments in TypeScript source files (using TypeDoc)
 * 2. Markdown files in .docs/ folders
 * 3. Creates a unified documentation site
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT_DIR, "packages", "core", "src");
const DOCS_OUTPUT_DIR = path.join(ROOT_DIR, "docs");
const TYPEDOC_OUTPUT_DIR = path.join(DOCS_OUTPUT_DIR, "api");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[${step}] ${message}`, "cyan");
}

/**
 * Find all .docs folders in the source directory
 */
function findDocsFolders() {
  const docsFolders = [];

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === ".docs") {
          docsFolders.push(fullPath);
        } else if (
          !entry.name.includes("node_modules") &&
          !entry.name.includes(".git") &&
          !entry.name.includes("early.spec")
        ) {
          walkDir(fullPath);
        }
      }
    }
  }

  walkDir(SRC_DIR);
  return docsFolders;
}

/**
 * Copy .docs folders to documentation output
 */
function copyDocsFolders(docsFolders) {
  logStep("1", "Copying .docs folders...");

  const docsModulesDir = path.join(DOCS_OUTPUT_DIR, "modules");
  if (!fs.existsSync(docsModulesDir)) {
    fs.mkdirSync(docsModulesDir, { recursive: true });
  }

  for (const docsFolder of docsFolders) {
    // Get relative path from src directory
    const relativePath = path.relative(SRC_DIR, path.dirname(docsFolder));
    const moduleName = relativePath.split(path.sep)[0] || "root";
    const targetDir = path.join(docsModulesDir, relativePath);

    // Create target directory
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Copy .docs folder contents
    copyRecursiveSync(docsFolder, path.join(targetDir, ".docs"));
    log(`  ✓ Copied: ${relativePath}/.docs`, "green");
  }

  log(`\n  Copied ${docsFolders.length} .docs folders`, "green");
}

/**
 * Recursively copy directory
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(function (childItemName) {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

/**
 * Generate TypeDoc documentation
 */
function generateTypeDoc() {
  logStep("2", "Generating TypeDoc API documentation...");

  // Use source files for TypeDoc
  // Note: TypeDoc may only fully document modules without external dependencies
  // The comprehensive documentation is in the .docs/ markdown files
  const entryPoints = ["packages/core/src"];
  const outDir = "docs/api";
  const readmePath = "README.md";

  const typedocConfig = {
    name: "ExpressoTS Core API",
    entryPoints: entryPoints,
    entryPointStrategy: "expand",
    out: outDir,
    readme: readmePath,
    tsconfig: "tsconfig.cjs.json",
    skipErrorChecking: true,
    exclude: [
      "**/node_modules/**",
      "**/*.spec.ts",
      "**/*.test.ts",
      "**/early.spec/**",
      "**/__tests__/**",
    ],
    excludePrivate: false,
    excludeProtected: false,
    excludeInternal: false,
    includeVersion: true,
    gitRevision: "main",
    theme: "default",
    categorizeByGroup: true,
    categoryOrder: [
      "Application",
      "Authorization",
      "Console",
      "Container Module",
      "Decorator",
      "Error",
      "Lifecycle",
      "Middleware",
      "Provider",
      "*",
    ],
    sort: ["source-order"],
    kindSortOrder: [
      "Project",
      "Module",
      "Namespace",
      "Enum",
      "Class",
      "Interface",
      "TypeAlias",
      "Function",
      "Variable",
    ],
    // Register custom JSDoc tags used in ExpressoTS documentation
    // Also includes all standard JSDoc tags to prevent warnings
    blockTags: [
      // Custom ExpressoTS tags
      "@layer",
      "@audience",
      "@concept",
      "@difficulty",
      "@troubleshooting",
      "@performance",
      "@option",
      "@file",
      "@description",
      "@summary",
      "@smart-defaults",
      // Standard JSDoc tags (https://jsdoc.app/)
      "@returns",
      "@return",
      "@param",
      "@arg",
      "@argument",
      "@throws",
      "@exception",
      "@see",
      "@example",
      "@since",
      "@deprecated",
      "@todo",
      "@author",
      "@version",
      "@default",
      "@defaultvalue",
      "@type",
      "@typedef",
      "@property",
      "@prop",
      "@readonly",
      "@private",
      "@protected",
      "@public",
      "@static",
      "@abstract",
      "@virtual",
      "@override",
      "@implements",
      "@augments",
      "@extends",
      "@class",
      "@constructor",
      "@interface",
      "@module",
      "@namespace",
      "@enum",
      "@constant",
      "@const",
      "@async",
      "@generator",
      "@yields",
      "@yield",
      "@fires",
      "@emits",
      "@listens",
      "@event",
      "@global",
      "@inner",
      "@instance",
      "@member",
      "@var",
      "@memberof",
      "@exports",
      "@external",
      "@host",
      "@requires",
      "@this",
      "@access",
      "@package",
      "@ignore",
      "@hideconstructor",
      "@lends",
      "@mixes",
      "@mixin",
      "@name",
      "@alias",
      "@borrows",
      "@classdesc",
      "@constructs",
      "@copyright",
      "@function",
      "@func",
      "@method",
      "@kind",
      "@variation",
      "@inheritdoc",
    ],
    // Suppress warnings for internal references and unresolved links
    validation: {
      notExported: false,
      invalidLink: false,
      notDocumented: false,
    },
    plugin: [],
    logLevel: "Error", // Only show errors, suppress all warnings
  };

  const configPath = path.join(ROOT_DIR, "typedoc.json");
  fs.writeFileSync(configPath, JSON.stringify(typedocConfig, null, 2));

  try {
    // Run TypeDoc - it may generate docs despite some TS errors
    execSync(`npx typedoc --options ${configPath}`, {
      stdio: "inherit",
      cwd: ROOT_DIR,
    });
    log("  ✓ TypeDoc documentation generated", "green");
  } catch (error) {
    // Check if docs were still generated despite errors
    const apiIndexPath = path.join(TYPEDOC_OUTPUT_DIR, "index.html");
    if (fs.existsSync(apiIndexPath)) {
      log(
        "  ⚠ TypeDoc reported TypeScript errors but documentation was generated",
        "yellow",
      );
      log(`  Documentation available at: ${apiIndexPath}`, "blue");
      log(
        "  Note: Some TypeScript errors may need to be fixed for complete documentation",
        "yellow",
      );
    } else {
      log("  ✗ TypeDoc generation failed", "yellow");
      log(`  Error: ${error.message}`, "yellow");
      log("  Common fixes:", "yellow");
      log(
        "    1. Ensure tsconfig.typedoc.json has downlevelIteration: true",
        "yellow",
      );
      log("    2. Ensure target is ES2020 or higher", "yellow");
      log("    3. Some decorator errors may be false positives", "yellow");
    }
  }
}

/**
 * Create documentation index
 */
function createDocumentationIndex(docsFolders) {
  logStep("3", "Creating documentation index...");

  const moduleLinks = docsFolders
    .map((folder) => {
      const relativePath = path.relative(SRC_DIR, path.dirname(folder));
      const moduleName = relativePath.split(path.sep)[0] || "root";
      const modulePath = relativePath.replace(/\\/g, "/");
      return `- **[${moduleName}](./modules/${modulePath}/README.md)** - Public API, architecture, examples`;
    })
    .join("\n");

  const indexContent = `# ExpressoTS Core Documentation

Welcome to the ExpressoTS Core documentation! This documentation provides comprehensive guides for both **framework developers** and **application developers** using ExpressoTS.

## 📚 Documentation Structure

### 📖 Module Documentation (Recommended)

The most comprehensive documentation for each module, including public API guides, architecture details, examples, and diagrams:

${moduleLinks}

### 🔍 API Reference

- **[TypeDoc API Reference](./api/index.html)** - Searchable API reference (DI module)

> **Note**: The TypeDoc API reference primarily covers the Dependency Injection (DI) module. 
> For comprehensive documentation of all modules, please refer to the **Module Documentation** above.

## 🚀 Quick Start

1. **For Application Developers**: Start with the module-specific public API markdown files
2. **For Framework Developers**: Check architecture.md and decision-log.md files
3. **For Examples**: See examples/ folders in each module

## 📖 Documentation Types

Each module contains:
- **Public API docs** - User-facing API documentation with examples
- **architecture.md** - Internal architecture for framework developers
- **examples/** - Runnable code examples
- **diagrams/** - Mermaid diagrams for visual understanding

## 🔗 Related Resources

- [ExpressoTS Website](https://expresso-ts.com)
- [Official Documentation](https://doc.expresso-ts.com)
- [GitHub Repository](https://github.com/expressots/expressots)
- [Issue Tracker](https://github.com/expressots/expressots/issues)

---

*Last generated: ${new Date().toISOString()}*
`;

  const indexPath = path.join(DOCS_OUTPUT_DIR, "README.md");
  fs.writeFileSync(indexPath, indexContent);
  log("  ✓ Documentation index created", "green");
}

/**
 * Create module navigation
 */
function createModuleNavigation(docsFolders) {
  logStep("4", "Creating module navigation...");

  const modules = {};

  for (const folder of docsFolders) {
    const relativePath = path.relative(SRC_DIR, path.dirname(folder));
    const parts = relativePath.split(path.sep);
    const moduleName = parts[0] || "root";

    if (!modules[moduleName]) {
      modules[moduleName] = [];
    }

    modules[moduleName].push({
      path: relativePath.replace(/\\/g, "/"),
      name: parts[parts.length - 1] || moduleName,
    });
  }

  const navContent = `# Module Navigation

${Object.keys(modules)
  .sort()
  .map((moduleName) => {
    const moduleDocs = modules[moduleName];
    return `## ${moduleName}

${moduleDocs
  .map((doc) => {
    return `- [${doc.name}](./modules/${doc.path}/.docs/README.md)`;
  })
  .join("\n")}`;
  })
  .join("\n\n")}
`;

  const navPath = path.join(DOCS_OUTPUT_DIR, "MODULES.md");
  fs.writeFileSync(navPath, navContent);
  log("  ✓ Module navigation created", "green");
}

/**
 * Main execution
 */
function main() {
  log("\n" + "=".repeat(60), "bright");
  log("ExpressoTS Documentation Generator", "bright");
  log("=".repeat(60) + "\n", "bright");

  // Create output directory
  if (!fs.existsSync(DOCS_OUTPUT_DIR)) {
    fs.mkdirSync(DOCS_OUTPUT_DIR, { recursive: true });
  }

  // Find all .docs folders
  const docsFolders = findDocsFolders();

  if (docsFolders.length === 0) {
    log(
      "⚠ No .docs folders found. Skipping markdown documentation copy.",
      "yellow",
    );
  } else {
    log(`Found ${docsFolders.length} .docs folders`, "blue");

    // Copy .docs folders
    copyDocsFolders(docsFolders);

    // Create documentation index
    createDocumentationIndex(docsFolders);

    // Create module navigation
    createModuleNavigation(docsFolders);
  }

  // Generate TypeDoc
  generateTypeDoc();

  log("\n" + "=".repeat(60), "bright");
  log("✓ Documentation generation complete!", "green");
  log("=".repeat(60), "bright");
  log(`\nDocumentation output: ${DOCS_OUTPUT_DIR}`, "blue");
  log(`API Reference: ${TYPEDOC_OUTPUT_DIR}/index.html`, "blue");
  log("\n");
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { main };
