import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import * as nodePath from "node:path";
import { render } from "mustache";
import {
	anyCaseToCamelCase,
	anyCaseToKebabCase,
	anyCaseToPascalCase,
	anyCaseToLowerCase,
} from "./string-utils";

import { printError } from "../../utils/cli-ui";
import { verifyIfFileExists } from "../../utils/verify-file-exists";
import Compiler from "../../utils/compiler";
import { updateTsconfigPaths } from "../../utils/update-tsconfig-paths";
import { safeResolveWithin } from "../../utils/input-validation";
import { ExpressoConfig, Pattern } from "@expressots/shared";

/**
 * Reject generate targets that would resolve outside the project's
 * source root. We only inspect the user-supplied `rawTarget` for
 * absolute-path escape (`/etc/...`, `C:\Windows\...`); the
 * `relativePath` is built internally and may legitimately start with
 * a leading `/` when the schematic doesn't introduce its own folder.
 *
 * Aborts via `process.exit(1)` after `printError` so the caller
 * surfaces a friendly message and writes nothing.
 */
function ensureWithinSourceRoot(
	folderToScaffold: string,
	relativePath: string,
	rawTarget: string,
): void {
	if (nodePath.isAbsolute(rawTarget)) {
		printError(
			"Absolute paths are not allowed for generate targets",
			rawTarget,
		);
		process.exit(1);
	}

	// Strip leading slashes from the synthesized relative path before
	// resolution; the leading slash is a benign artifact of empty
	// `path` segments, not an escape attempt.
	const stripped = relativePath.replace(/^[\\/]+/, "");
	const baseAbs = nodePath.resolve(process.cwd(), folderToScaffold);
	const safe = safeResolveWithin(baseAbs, stripped);
	if (safe === null) {
		printError(
			`Path traversal detected. Targets must stay inside ${folderToScaffold}`,
			rawTarget,
		);
		process.exit(1);
	}
}

export const enum PathStyle {
	None = "none",
	Single = "single",
	Nested = "nested",
	Sugar = "sugar",
}

/**
 * File preparation
 * @param schematic
 * @param target
 * @param method
 * @param opinionated
 * @param sourceRoot
 * @returns the file output
 */
export type FilePreparation = {
	schematic: string;
	target: string;
	method: string;
	expressoConfig: ExpressoConfig;
};

/**
 * File output
 * @param path
 * @param file
 * @param className
 * @param moduleName
 * @param modulePath
 * @param outputPath
 * @param folderToScaffold
 */
export type FileOutput = {
	path: string;
	file: string;
	className: string;
	moduleName: string;
	modulePath: string;
	outputPath: string;
	folderToScaffold: string;
	fileName: string;
	schematic: string;
};

/**
 * Create a template based on the schematic
 * @param fp
 * @returns the file created
 */
export async function validateAndPrepareFile(fp: FilePreparation) {
	const { sourceRoot, scaffoldSchematics, opinionated } = fp.expressoConfig;
	if (sourceRoot === "") {
		printError(
			"You must specify a source root in your expressots.config.ts",
			"sourceRoot",
		);
		process.exit(1);
	}

	if (opinionated) {
		const folderSchematic = schematicFolder(
			fp.schematic,
			scaffoldSchematics,
		);

		const folderToScaffold = `${sourceRoot}/${folderSchematic}`;
		const { path, file, className, moduleName, modulePath } =
			await splitTarget({
				target: fp.target,
				schematic: fp.schematic,
				opinionated: true,
			});

		ensureWithinSourceRoot(folderToScaffold, `${path}/${file}`, fp.target);

		const outputPath = `${folderToScaffold}/${path}/${file}`;
		await verifyIfFileExists(outputPath, fp.schematic);
		mkdirSync(`${folderToScaffold}/${path}`, { recursive: true });

		// Update tsconfig paths dynamically (handles both default and custom folder names)
		if (folderSchematic) {
			await updateTsconfigPaths(folderSchematic, sourceRoot);
		}

		return {
			path,
			file,
			className,
			moduleName,
			modulePath,
			outputPath,
			folderToScaffold,
			fileName: getFileNameWithoutExtension(file),
			schematic: fp.schematic,
		};
	}

	const folderSchematic = "";

	const folderToScaffold = `${sourceRoot}/${folderSchematic}`;
	const { path, file, className, moduleName, modulePath } = await splitTarget(
		{
			target: fp.target,
			schematic: fp.schematic,
		},
	);

	const fileBaseSchema =
		scaffoldSchematics?.[fp.schematic as keyof typeof scaffoldSchematics];
	const validateFileSchema =
		fileBaseSchema !== undefined
			? file.replace(fp.schematic, fileBaseSchema)
			: file;

	ensureWithinSourceRoot(
		folderToScaffold,
		`${path}/${validateFileSchema}`,
		fp.target,
	);

	const outputPath = `${folderToScaffold}/${path}/${validateFileSchema}`;
	await verifyIfFileExists(outputPath, fp.schematic);
	mkdirSync(`${folderToScaffold}/${path}`, { recursive: true });

	return {
		path,
		file,
		className,
		moduleName,
		modulePath,
		outputPath,
		folderToScaffold,
		fileName: getFileNameWithoutExtension(file),
		schematic: fileBaseSchema !== undefined ? fileBaseSchema : fp.schematic,
	};
}

/**
 * Get the file name without the extension
 * @param filePath
 * @returns the file name
 */
export function getFileNameWithoutExtension(filePath: string) {
	return filePath.split(".")[0];
}

/**
 * Split the target into path, file, class name, module name and module path
 * @param target
 * @param schematic
 * @returns the split target
 */
export const splitTarget = async ({
	target,
	schematic,
	opinionated = false,
}: {
	target: string;
	schematic: string;
	opinionated?: boolean;
}): Promise<{
	path: string;
	file: string;
	className: string;
	moduleName: string;
	modulePath: string;
}> => {
	const pathContent: string[] = target
		.split("/")
		.filter((item) => item !== "");
	const endsWithSlash: boolean = target.endsWith("/");
	let path = "";
	let fileName = "";
	let module = "";
	let modulePath = "";

	if (
		target.includes("/") ||
		target.includes("\\") ||
		target.includes("//")
	) {
		if (schematic === "service") schematic = "controller";
		if (
			schematic === "service" ||
			(schematic === "controller" && pathContent.length > 4)
		) {
			printError("Max path depth is 4.", pathContent.join("/"));
			process.exit(1);
		}

		if (endsWithSlash) {
			fileName = pathContent[pathContent.length - 1];
			path = pathContent.join("/");
			module =
				pathContent.length == 1
					? pathContent[pathContent.length - 1]
					: pathContent[pathContent.length - 2];
			modulePath = pathContent.slice(0, -1).join("/");
		} else {
			fileName = pathContent[pathContent.length - 1];
			path = pathContent.slice(0, -1).join("/");
			module =
				pathContent.length == 2
					? pathContent[pathContent.length - 2]
					: pathContent[pathContent.length - 3];
			modulePath = pathContent.slice(0, -2).join("/");
		}

		return {
			path,
			file: `${await getNameWithScaffoldPattern(
				fileName,
			)}.${schematic}.ts`,
			className: anyCaseToPascalCase(fileName),
			moduleName: module,
			modulePath,
		};
	} else {
		if (schematic === "service") schematic = "controller";
		// 1. Extract the name (first part of the target)
		const [name, ...remainingPath] = target.split("/");
		// 2. Check if the name is camelCase or kebab-case (compound word)
		const camelCaseRegex = /[A-Z]/;
		const kebabCaseRegex = /[_\-\s]+/;
		const isCamelCase = camelCaseRegex.test(name);
		const isKebabCase = kebabCaseRegex.test(name);

		// Schematics that should create their own subfolder (grouped resources)
		const groupedSchematics = [
			"usecase",
			"controller",
			"service",
			"dto",
			"module",
		];
		const shouldCreateFolder = groupedSchematics.includes(schematic);

		if (isCamelCase || isKebabCase) {
			// Convert compound name to kebab-case for folder path (e.g., confirmLogin -> confirm-login)
			const folderName = anyCaseToKebabCase(name);
			// Extract first word for module name
			const firstWord = name
				.split(isCamelCase ? /(?=[A-Z])/ : kebabCaseRegex)[0]
				.toLowerCase();

			// Opinionated "syntactic sugar": decompose a compound name into a
			// nested feature/use-case layout so every use-case of a feature is
			// grouped under one module at the feature root. For example
			// `userLogin` -> `user/login/login.{controller,usecase,dto}.ts` with
			// the shared module at `user/user.module.ts`. A later `userLogout`
			// adds `user/logout/...` and joins the same `UserModule`.
			//
			// Only applies to grouped schematics in opinionated mode; standalone
			// schematics and non-opinionated mode keep the flat kebab folder so
			// the developer retains full control over structure.
			if (opinionated && shouldCreateFolder) {
				const words = folderName.split("-").filter(Boolean);
				if (words.length > 1) {
					const feature = words[0];
					const useCase = words.slice(1).join("-");
					return {
						path: `${feature}/${useCase}`,
						file: `${await getNameWithScaffoldPattern(
							useCase,
						)}.${schematic}.ts`,
						className: anyCaseToPascalCase(useCase),
						moduleName: feature,
						modulePath: feature,
					};
				}
			}

			// For standalone schematics (entity, provider, middleware, etc.),
			// only create folder if explicit path is provided
			const computedPath = shouldCreateFolder
				? `${folderName}${pathEdgeCase(remainingPath)}`
				: remainingPath.length > 0
					? `${folderName}${pathEdgeCase(remainingPath)}`
					: "";

			return {
				path: computedPath,
				file: `${await getNameWithScaffoldPattern(
					name,
				)}.${schematic}.ts`,
				className: anyCaseToPascalCase(name),
				moduleName: firstWord,
				modulePath: pathContent[0].split("-")[1],
			};
		}

		// 3. Return the base case
		return {
			path: shouldCreateFolder ? name : "",
			file: `${await getNameWithScaffoldPattern(name)}.${schematic}.ts`,
			className: anyCaseToPascalCase(name),
			moduleName: name,
			modulePath: "",
		};
	}
};

/**
 * Write the template based on the http method
 * @param method - the http method
 * @returns decorator - the decorator to be used
 */
export const getHttpMethod = (method: string): string => {
	switch (method) {
		case "put":
			return "Put";
		case "post":
			return "Post";
		case "patch":
			return "Patch";
		case "delete":
			return "Delete";
		default:
			return "Get";
	}
};

/**
 * Write the template based on the schematics
 * @param outputPath - the output path
 * @param template - the template to be used
 * @returns void
 */
export const writeTemplate = ({
	outputPath,
	template: { path, data },
}: {
	outputPath: string;
	template: {
		path: string;
		data: Record<string, string>;
	};
}) => {
	writeFileSync(
		outputPath,
		render(readFileSync(nodePath.join(__dirname, path), "utf8"), data),
	);
};

/**
 * Default folder mappings for opinionated scaffolding
 */
const DEFAULT_SCHEMATIC_FOLDERS: Record<string, string> = {
	usecase: "useCases",
	controller: "useCases",
	dto: "useCases",
	service: "useCases",
	provider: "providers",
	entity: "entities",
	middleware: "middleware",
	module: "useCases",
	// NEW v4.0 schematics
	interceptor: "interceptors",
	event: "events",
	handler: "events",
	guard: "guards",
	config: "config",
};

/**
 * Returns the folder where the schematic should be placed.
 * Uses scaffoldSchematics from config if defined, otherwise falls back to defaults.
 *
 * @param schematic - The schematic type (usecase, controller, etc.)
 * @param scaffoldSchematics - Custom folder mappings from expressots.config.ts
 * @returns The folder path for the schematic
 */
export const schematicFolder = (
	schematic: string,
	scaffoldSchematics?: ExpressoConfig["scaffoldSchematics"],
): string | undefined => {
	// Check if custom mapping is defined in config
	if (scaffoldSchematics) {
		const customFolder =
			scaffoldSchematics[schematic as keyof typeof scaffoldSchematics];
		if (customFolder) {
			return customFolder;
		}
	}

	// Fall back to default mappings
	return DEFAULT_SCHEMATIC_FOLDERS[schematic];
};

/**
 * Get the name with the scaffold pattern
 * @param name
 * @returns the name in the scaffold pattern
 */
export const getNameWithScaffoldPattern = async (name: string) => {
	const configObject = await Compiler.loadConfig();

	switch (configObject.scaffoldPattern) {
		case Pattern.LOWER_CASE:
			return anyCaseToLowerCase(name);
		case Pattern.KEBAB_CASE:
			return anyCaseToKebabCase(name);
		case Pattern.PASCAL_CASE:
			return anyCaseToPascalCase(name);
		case Pattern.CAMEL_CASE:
			return anyCaseToCamelCase(name);
	}
};

/**
 * Get the path edge case
 * @param path
 * @returns the path edge case from the last element of the path
 */
const pathEdgeCase = (path: string[]): string => {
	return `${path.join("/")}${path.length > 0 ? "/" : ""}`;
};

/**
 * Extract the first word from a file and convert it to the scaffold pattern
 * @param file
 * @returns the first word in the scaffold pattern
 */
export async function extractFirstWord(file: string) {
	const f = file.split(".")[0];

	const regex = /(?:-|(?<=[a-z])(?=[A-Z]))/;
	const firstWord = f.split(regex)[0];

	const config = await Compiler.loadConfig();
	switch (config.scaffoldPattern) {
		case Pattern.LOWER_CASE:
			return anyCaseToLowerCase(firstWord);
		case Pattern.KEBAB_CASE:
			return anyCaseToKebabCase(firstWord);
		case Pattern.PASCAL_CASE:
			return anyCaseToPascalCase(firstWord);
		case Pattern.CAMEL_CASE:
			return anyCaseToCamelCase(firstWord);
	}
}

/**
 * Determine the path style for a generate target.
 *
 * - `Nested`: contains an explicit separator (`billing/invoice`) → grouped
 *   under the parent folder.
 * - `Sugar`: a single segment that normalizes to more than one word
 *   (`userCreate`, `user-create`, `user_create`, `UserCreate`) → grouped under
 *   its first word as a shared module (e.g. `UserModule`). camelCase and
 *   kebab-case forms of the same name therefore produce identical output.
 * - `Single`: a true single-word target (`user`) → self-contained module in its
 *   own folder.
 *
 * @param path
 * @returns the path style
 */
export const checkPathStyle = (path: string): PathStyle => {
	const nestedPathRegex = /\/|\\/;

	if (nestedPathRegex.test(path)) {
		return PathStyle.Nested;
	}

	if (anyCaseToKebabCase(path).includes("-")) {
		return PathStyle.Sugar;
	}

	return PathStyle.Single;
};
