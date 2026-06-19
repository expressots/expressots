import { globSync } from "glob";
import fs from "node:fs";
import * as nodePath from "node:path";
import { printError, printSuccess } from "./cli-ui";
import Compiler from "./compiler";
import { getPathAliasForFolder } from "./update-tsconfig-paths";

const APP_CONTAINER = "app.ts";

type AppContainerInfo = {
	path: string;
	content: string;
};

/**
 * Locate `app.ts` and read its raw content. We deliberately avoid any
 * line-based parsing here so multi-line imports and nested array literals
 * survive untouched.
 */
async function readAppContainer(): Promise<AppContainerInfo> {
	const { sourceRoot } = await Compiler.loadConfig();

	const path = globSync(`./${sourceRoot}/${APP_CONTAINER}`, {
		absolute: true,
		ignore: "**/node_modules/**",
	});

	if (!path.length) {
		printError(
			"Module not added to Container. Container file not found!",
			APP_CONTAINER,
		);
		process.exit(1);
	}

	const content = await fs.promises.readFile(path[0], "utf8");
	return { path: path[0], content };
}

/**
 * Detect the indentation (leading whitespace) of the line containing `index`.
 */
function getLineIndent(source: string, index: number): string {
	const lineStart = source.lastIndexOf("\n", index - 1) + 1;
	const match = /^[\t ]*/.exec(source.slice(lineStart));
	return match ? match[0] : "";
}

/**
 * Skip over a string literal starting at `i` (the index of the opening quote).
 * Handles `"..."`, `'...'`, and template strings ``` `...` ``` including escapes.
 * Returns the index just past the closing quote.
 */
function skipString(source: string, i: number): number {
	const quote = source[i];
	i++;
	while (i < source.length) {
		const ch = source[i];
		if (ch === "\\") {
			i += 2;
			continue;
		}
		if (ch === quote) return i + 1;
		i++;
	}
	return source.length;
}

/**
 * Skip over a `// line` or `/* block *\/` comment starting at `i`.
 * Returns the index just past the comment, or `i` unchanged if not a comment.
 */
function skipComment(source: string, i: number): number {
	if (source[i] === "/" && source[i + 1] === "/") {
		const nl = source.indexOf("\n", i);
		return nl === -1 ? source.length : nl;
	}
	if (source[i] === "/" && source[i + 1] === "*") {
		const close = source.indexOf("*/", i + 2);
		return close === -1 ? source.length : close + 2;
	}
	return i;
}

/**
 * Find the index immediately after the last top-level `import ... ;`
 * statement. Returns 0 if no imports are present. The scan is string- and
 * comment-aware so multi-line imports and quoted semicolons don't confuse it.
 */
function findLastImportEnd(source: string): number {
	let i = 0;
	let lastEnd = 0;
	while (i < source.length) {
		while (i < source.length && /\s/.test(source[i])) i++;
		const afterComment = skipComment(source, i);
		if (afterComment !== i) {
			i = afterComment;
			continue;
		}
		if (!source.startsWith("import", i)) break;

		// Walk forward until the terminating semicolon, ignoring strings/comments.
		let j = i + "import".length;
		while (j < source.length) {
			const ch = source[j];
			if (ch === '"' || ch === "'" || ch === "`") {
				j = skipString(source, j);
				continue;
			}
			const afterCmt = skipComment(source, j);
			if (afterCmt !== j) {
				j = afterCmt;
				continue;
			}
			if (ch === ";") {
				j++;
				break;
			}
			j++;
		}
		lastEnd = j;
		i = j;
	}
	return lastEnd;
}

/**
 * Locate the call expression `callName(` starting at or after `from`, then
 * return the `[start, end]` indices (inclusive of the opening `(` and matching
 * `)`) of its argument list. Returns null if not found.
 *
 * The matcher respects strings, comments, and balanced brackets so the inner
 * `CreateModule([...])` does not prematurely close the outer call.
 */
function findCallRange(
	source: string,
	callName: string,
	from = 0,
): { open: number; close: number } | null {
	const needle = `${callName}(`;
	const start = source.indexOf(needle, from);
	if (start === -1) return null;
	const open = start + needle.length - 1; // index of '('
	let depthParen = 1;
	let depthBracket = 0;
	let depthBrace = 0;
	let i = open + 1;
	while (i < source.length && depthParen > 0) {
		const ch = source[i];
		if (ch === '"' || ch === "'" || ch === "`") {
			i = skipString(source, i);
			continue;
		}
		const afterCmt = skipComment(source, i);
		if (afterCmt !== i) {
			i = afterCmt;
			continue;
		}
		if (ch === "(") depthParen++;
		else if (ch === ")") depthParen--;
		else if (ch === "[") depthBracket++;
		else if (ch === "]") depthBracket--;
		else if (ch === "{") depthBrace++;
		else if (ch === "}") depthBrace--;
		i++;
	}
	if (depthParen !== 0 || depthBracket !== 0 || depthBrace !== 0) return null;
	return { open, close: i - 1 }; // close = index of ')'
}

/**
 * Locate the first array literal `[...]` at or after `from`, returning the
 * indices of the opening `[` and matching `]`. Bracket-balanced and
 * string/comment safe.
 */
function findArrayRange(
	source: string,
	from: number,
): { open: number; close: number } | null {
	let i = from;
	while (i < source.length) {
		const ch = source[i];
		if (ch === "[") break;
		if (ch === '"' || ch === "'" || ch === "`") {
			i = skipString(source, i);
			continue;
		}
		const afterCmt = skipComment(source, i);
		if (afterCmt !== i) {
			i = afterCmt;
			continue;
		}
		i++;
	}
	if (i >= source.length || source[i] !== "[") return null;
	const open = i;
	let depth = 1;
	let j = open + 1;
	while (j < source.length && depth > 0) {
		const ch = source[j];
		if (ch === '"' || ch === "'" || ch === "`") {
			j = skipString(source, j);
			continue;
		}
		const afterCmt = skipComment(source, j);
		if (afterCmt !== j) {
			j = afterCmt;
			continue;
		}
		if (ch === "[") depth++;
		else if (ch === "]") depth--;
		j++;
	}
	if (depth !== 0) return null;
	return { open, close: j - 1 };
}

/**
 * Insert `name` as a new entry in the array literal that starts at `arrayOpen`
 * (the index of `[`) and ends at `arrayClose` (the index of the matching `]`).
 *
 * Preserves the original formatting: trailing-comma style is honoured, inline
 * arrays stay inline, and multi-line arrays receive the new entry on its own
 * line with matching indentation. If `name` is already present in the array
 * the source is returned unchanged.
 */
function insertIntoArray(
	source: string,
	arrayOpen: number,
	arrayClose: number,
	name: string,
): string {
	const inner = source.slice(arrayOpen + 1, arrayClose);

	// Skip insertion if the identifier is already a top-level token in the array.
	const tokenRegex = /\b[A-Za-z_$][\w$]*\b/g;
	let match: RegExpExecArray | null;
	while ((match = tokenRegex.exec(inner)) !== null) {
		if (match[0] === name) return source;
	}

	if (inner.trim().length === 0) {
		return source.slice(0, arrayOpen + 1) + name + source.slice(arrayClose);
	}

	// Find the last meaningful character inside the array (skip trailing
	// whitespace before `]`).
	let lastChar = arrayClose - 1;
	while (lastChar > arrayOpen && /\s/.test(source[lastChar])) lastChar--;
	const hasTrailingComma = source[lastChar] === ",";
	const isMultiLine = inner.includes("\n");

	if (!isMultiLine) {
		const insertion = hasTrailingComma ? ` ${name}` : `, ${name}`;
		return (
			source.slice(0, lastChar + 1) +
			insertion +
			source.slice(lastChar + 1)
		);
	}

	// Multi-line: match the indentation of the last item and place the new
	// entry on its own line just before the closing bracket.
	const itemIndent = getLineIndent(source, lastChar);
	const insertAt = lastChar + 1;
	const insertion = (hasTrailingComma ? "" : ",") + `\n${itemIndent}${name},`;
	return source.slice(0, insertAt) + insertion + source.slice(insertAt);
}

/**
 * Insert a new import statement after the last existing one, preserving any
 * blank line that already separates imports from code. If the import is
 * already present (textually) the file is returned unchanged.
 */
function insertImport(source: string, importLine: string): string {
	if (source.includes(importLine)) return source;

	const insertAt = findLastImportEnd(source);
	if (insertAt === 0) {
		// No existing imports: prepend at top.
		const sep = source.startsWith("\n") ? "" : "\n";
		return importLine + "\n" + sep + source;
	}

	const before = source.slice(0, insertAt);
	const after = source.slice(insertAt);
	return before + "\n" + importLine + after;
}

/**
 * Add `${moduleName}Module` to the container declaration in `app.ts`.
 *
 * Handles both layouts:
 *   - v4 wrapper:  this.configContainer([CreateModule([...]), ModuleA, ModuleB])
 *   - legacy flat: this.configContainer([ModuleA, ModuleB])
 *
 * Scaffolded modules are always inserted into the outer `configContainer([...])`
 * array as peer entries alongside `CreateModule([...])`. The inner
 * `CreateModule([...])` is reserved for orphan controllers that don't have
 * their own module file.
 */
function addModuleToContainerSource(source: string, className: string): string {
	const configCall = findCallRange(source, "this.configContainer");
	if (!configCall) {
		printError(
			"The App class does not contain a valid configContainer([]) declaration!",
			APP_CONTAINER,
		);
		process.exit(1);
	}

	const outerArray = findArrayRange(source, configCall.open + 1);
	if (!outerArray || outerArray.close > configCall.close) {
		printError(
			"configContainer must be called with an array literal argument.",
			APP_CONTAINER,
		);
		process.exit(1);
	}

	return insertIntoArray(
		source,
		outerArray.open,
		outerArray.close,
		className,
	);
}

/**
 * Build the import specifier for a scaffolded module from its real on-disk
 * location. In opinionated mode the path alias for the destination folder is
 * used (e.g. `@useCases/user-create/user.module`); otherwise a relative import
 * from the source root is produced. Deriving the specifier from the actual file
 * path guarantees the generated import always matches where the module was
 * written, independent of the path style (sugar/single/nested).
 */
async function buildModuleImportSpec(
	moduleOutputPath: string,
	folderToScaffold: string,
	folderName: string,
): Promise<string> {
	const { opinionated, sourceRoot } = await Compiler.loadConfig();
	const normalize = (p: string): string =>
		p.replace(/\\/g, "/").replace(/\.ts$/, "");

	if (opinionated) {
		const rel = normalize(
			nodePath.relative(folderToScaffold, moduleOutputPath),
		);
		return `${getPathAliasForFolder(folderName)}/${rel}`;
	}

	const rel = normalize(nodePath.relative(sourceRoot, moduleOutputPath));
	return `./${rel}`;
}

async function applyContainerEdit(
	className: string,
	importLine: string,
): Promise<void> {
	const info = await readAppContainer();
	let next = insertImport(info.content, importLine);
	next = addModuleToContainerSource(next, className);

	if (next === info.content) return;

	await fs.promises.writeFile(info.path, next, "utf8");
	printSuccess(`${className} registered in ${APP_CONTAINER}`, "container");
}

/**
 * Register a scaffolded module in `app.ts`.
 *
 * The import specifier is derived from the module file's real location
 * (`moduleOutputPath`) so it always resolves to the file on disk, regardless of
 * the path style used to scaffold it.
 *
 * @param moduleClassName - Exported module symbol, e.g. `UserModule`.
 * @param moduleOutputPath - Path to the generated `*.module.ts` file.
 * @param folderToScaffold - Destination root, e.g. `src/useCases`.
 * @param folderName - Folder basename used to resolve the path alias, e.g. `useCases`.
 */
async function addModuleToContainerByPath(
	moduleClassName: string,
	moduleOutputPath: string,
	folderToScaffold: string,
	folderName: string,
): Promise<void> {
	const importSpec = await buildModuleImportSpec(
		moduleOutputPath,
		folderToScaffold,
		folderName,
	);
	const importLine = `import { ${moduleClassName} } from "${importSpec}";`;

	await applyContainerEdit(moduleClassName, importLine);
}

export { addModuleToContainerByPath };
