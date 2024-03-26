import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import * as nodePath from "node:path";
import { render } from "mustache";
import {
	anyCaseToCamelCase,
	anyCaseToKebabCase,
	anyCaseToPascalCase,
	anyCaseToLowerCase,
} from "@expressots/boost-ts";

import { printError } from "../../utils/cli-ui";
import { verifyIfFileExists } from "../../utils/verify-file-exists";
import Compiler from "../../utils/compiler";
import { Pattern } from "../../types";

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
	opinionated: boolean;
	sourceRoot: string;
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
};

/**
 * Create a template based on the schematic
 * @param fp
 * @returns the file created
 */
export async function validateAndPrepareFile(fp: FilePreparation) {
	if (fp.sourceRoot === "") {
		printError(
			"You must specify a source root in your expressots.config.ts",
			"sourceRoot",
		);
		process.exit(1);
	}

	const folderSchematic = schematicFolder(fp.schematic);
	const folderToScaffold = `${fp.sourceRoot}/${folderSchematic}`;
	const { path, file, className, moduleName, modulePath } = await splitTarget(
		{
			target: fp.target,
			schematic: fp.schematic,
		},
	);
	const outputPath = `${folderToScaffold}/${path}/${file}`;
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
}: {
	target: string;
	schematic: string;
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
		// 2. Check if the name is camelCase or kebab-case
		const camelCaseRegex = /[A-Z]/;
		const kebabCaseRegex = /[_\-\s]+/;
		const isCamelCase = camelCaseRegex.test(name);
		const isKebabCase = kebabCaseRegex.test(name);
		if (isCamelCase || isKebabCase) {
			const [wordName, ...path] = name
				?.split(isCamelCase ? /(?=[A-Z])/ : kebabCaseRegex)
				.map((word) => word.toLowerCase());

			return {
				path: `${wordName}/${pathEdgeCase(path)}${pathEdgeCase(
					remainingPath,
				)}`,
				file: `${await getNameWithScaffoldPattern(
					name,
				)}.${schematic}.ts`,
				className: anyCaseToPascalCase(name),
				moduleName: wordName,
				modulePath: pathContent[0].split("-")[1],
			};
		}

		// 3. Return the base case
		return {
			path: "",
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
 * Returns the folder where the schematic should be placed
 * @param schematic
 */
export const schematicFolder = (schematic: string): string | undefined => {
	switch (schematic) {
		case "usecase":
			return "useCases";
		case "controller":
			return "useCases";
		case "dto":
			return "useCases";
		case "service":
			return "useCases";
		case "provider":
			return "providers";
		case "entity":
			return "entities";
		case "middleware":
			return "providers/middlewares";
		case "module":
			return "useCases";
	}

	return undefined;
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
