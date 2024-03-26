import * as nodePath from "path";
import { mkdirSync, readFileSync } from "node:fs";
import { render } from "mustache";
import { writeFileSync, existsSync } from "fs";
import chalk from "chalk";
import {
	anyCaseToCamelCase,
	anyCaseToKebabCase,
	anyCaseToPascalCase,
	anyCaseToLowerCase,
} from "@expressots/boost-ts";
import Compiler from "../utils/compiler";
import { Pattern } from "../types";
import { addControllerToModule } from "../utils/add-controller-to-module";
import { verifyIfFileExists } from "../utils/verify-file-exists";
import { addModuleToContainer } from "../utils/add-module-to-container";
import { printError, printGenerateSuccess } from "../utils/cli-ui";

/**
 * File preparation
 * @param schematic
 * @param target
 * @param method
 * @param opinionated
 * @param sourceRoot
 * @returns the file output
 */
type FilePreparation = {
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
type FileOutput = {
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
 * Create a template props
 * @param schematic
 * @param path
 * @param method
 */
type CreateTemplateProps = {
	schematic: string;
	path: string;
	method: string;
};

/**
 * Create a template based on the schematic
 * @param schematic
 * @param path
 * @param method
 * @returns the file created
 */
export const createTemplate = async ({
	schematic,
	path: target,
	method,
}: CreateTemplateProps) => {
	const { opinionated, sourceRoot } = await Compiler.loadConfig();

	let returnFile = "";

	if (opinionated) {
		returnFile = await opinionatedProcess(
			schematic,
			target,
			method,
			opinionated,
			sourceRoot,
		);
	} else {
		// pass folder = "" to avoid the creation of the module
		returnFile = await nonOpinionatedProcess();
	}

	return returnFile;
};

async function opinionatedProcess(
	schematic: string,
	target: string,
	method: string,
	opinionated: boolean,
	sourceRoot: string,
): Promise<string> {
	let f: FileOutput = await validateAndPrepareFile({
		schematic,
		target,
		method,
		opinionated,
		sourceRoot,
	});
	switch (schematic) {
		case "service":
			await generateControllerService(
				f.outputPath,
				f.className,
				f.path,
				method,
				f.file,
			);

			f = await validateAndPrepareFile({
				schematic: "usecase",
				target,
				method,
				opinionated,
				sourceRoot,
			});

			await generateUseCase(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.fileName,
				"./templates/opinionated/usecase-service.tpl",
			);

			f = await validateAndPrepareFile({
				schematic: "dto",
				target,
				method,
				opinionated,
				sourceRoot,
			});
			await generateDTO(f.outputPath, f.className, f.moduleName, f.path);

			await printGenerateSuccess("controller", f.file);
			await printGenerateSuccess("usecase", f.file);
			await printGenerateSuccess("dto", f.file);
			break;
		case "usecase":
			await generateUseCase(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.fileName,
			);
			await printGenerateSuccess(schematic, f.file);
			break;
		case "controller":
			await generateController(
				f.outputPath,
				f.className,
				f.path,
				method,
				f.file,
			);
			await printGenerateSuccess(schematic, f.file);
			break;
		case "dto":
			await generateDTO(f.outputPath, f.className, f.moduleName, f.path);
			await printGenerateSuccess(schematic, f.file);
			break;
		case "provider":
			await generateProvider(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
			);
			await printGenerateSuccess(schematic, f.file);
			break;
		case "entity":
			await generateEntity(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
			);
			await printGenerateSuccess(schematic, f.file);
			break;
		case "middleware":
			await generateMiddleware(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
			);
			await printGenerateSuccess(schematic, f.file);
			break;
		case "module":
			await generateModule(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
			);
			await printGenerateSuccess(schematic, f.file);
			break;
	}

	/* if (schematic !== "service") {
		// add to guarantee that the routing will always be the last part of the path
		const routeSchema = nodePath.basename(path);

		let templateBasedSchematic = schematic;
		if (schematic === "module") {
			templateBasedSchematic = "module-default";
		}

		writeTemplate({
			outputPath,
			template: {
				path: `./templates/${templateBasedSchematic}.tpl`,
				data: {
					className,
					moduleName: className,
					route: routeSchema,
					construct: anyCaseToKebabCase(className),
					method: getHttpMethod(method),
				},
			},
		});
	} else {
		for await (const resource of ["controller-service", "usecase", "dto"]) {
			const currentSchematic = resource.replace(
				"controller-service",
				"controller",
			);

			const schematicFile = file.replace(
				`controller.ts`,
				`${currentSchematic}.ts`,
			);

			console.log(
				" ",
				chalk.greenBright(`[${currentSchematic}]`.padEnd(14)),
				chalk.bold.white(`${schematicFile} created! ✔️`),
			);

			let templateBasedMethod = "";
			if (method) {
				if (
					resource === "controller-service" ||
					resource === "controller"
				) {
					if (method === "get")
						templateBasedMethod = `./templates/${resource}.tpl`;
					else
						templateBasedMethod = `./templates/${resource}-${method}.tpl`;
				} else {
					templateBasedMethod = `./templates/${resource}.tpl`;
				}

				if (resource === "usecase") {
					templateBasedMethod = `./templates/${resource}-op.tpl`;
				}

				if (resource === "usecase") {
					if (method === "get")
						templateBasedMethod = `./templates/${resource}.tpl`;
					if (method === "post")
						templateBasedMethod = `./templates/${resource}-${method}.tpl`;
				}
			} else {
				templateBasedMethod = `./templates/${resource}.tpl`;
			}

			// add to guarantee that the routing will always be the last part of the path
			let routeSchema = "";

			if (
				target.includes("/") ||
				target.includes("\\") ||
				target.includes("//")
			) {
				routeSchema = path.split("/").pop();
			} else {
				routeSchema = path.replace(/\/$/, "");
			}

			writeTemplate({
				outputPath,
				template: {
					path: templateBasedMethod,
					data: {
						className,
						fileName: getFileNameWithoutExtension(file),
						useCase: anyCaseToCamelCase(className),
						route: routeSchema, //path.replace(/\/$/, ''),
						construct: anyCaseToKebabCase(className),
						method: getHttpMethod(method),
					},
				},
			});
		}
	}

	// Module generation
	if (["controller", "service"].includes(schematic)) {
		let moduleExist = false;
		let moduleOutPath = "";

		if (
			target.includes("/") ||
			target.includes("\\") ||
			target.includes("//")
		) {
			if (modulePath === "") {
				moduleExist = existsSync(
					`${folderToScaffold}/${moduleName}.module.ts`,
				);
				moduleOutPath = `${folderToScaffold}/${moduleName}.module.ts`;
			} else {
				moduleExist = existsSync(
					`${folderToScaffold}/${modulePath}/${moduleName}.module.ts`,
				);
				moduleOutPath = `${folderToScaffold}/${modulePath}/${moduleName}.module.ts`;
			}
		} else {
			moduleExist = existsSync(
				`${folderToScaffold}/${moduleName}/${moduleName}.module.ts`,
			);
			if (modulePath === "") {
				moduleExist = existsSync(
					`${folderToScaffold}/${moduleName}.module.ts`,
				);
				moduleOutPath = `${folderToScaffold}/${moduleName}.module.ts`;
			} else {
				moduleExist = existsSync(
					`${folderToScaffold}/${moduleName}/${moduleName}.module.ts`,
				);
				moduleOutPath = `${folderToScaffold}/${moduleName}/${moduleName}.module.ts`;
			}
		}

		let controllerPath = "./";
		const pathCount = path.split("/").length;

		if (path === "") {
			controllerPath += `${file.slice(0, file.lastIndexOf("."))}`;
		} else if (pathCount === 1) {
			controllerPath += `${path}/${file.slice(0, file.lastIndexOf("."))}`;
		} else if (pathCount === 2) {
			controllerPath += `${path.split("/")[1]}/${file.slice(
				0,
				file.lastIndexOf("."),
			)}`;
		} else {
			const segments: string[] = path
				.split("/")
				.filter((segment) => segment !== "");
			controllerPath += `${segments[segments.length - 1]}/${file.slice(
				0,
				file.lastIndexOf("."),
			)}`;
		}

		if (moduleExist) {
			if (
				target.includes("/") ||
				target.includes("\\") ||
				target.includes("//")
			) {
				await addControllerToModule(
					`${folderToScaffold}/${modulePath}/${moduleName}.module.ts`,
					`${className}Controller`,
					controllerPath,
				);
			} else {
				if (modulePath === "") {
					await addControllerToModule(
						`${folderToScaffold}/${moduleName}.module.ts`,
						`${className}Controller`,
						controllerPath,
					);
				} else {
					await addControllerToModule(
						`${folderToScaffold}/${moduleName}/${moduleName}.module.ts`,
						`${className}Controller`,
						controllerPath,
					);
				}
			}
		} else {
			writeTemplate({
				outputPath: moduleOutPath,
				template: {
					path: `./templates/module.tpl`,
					data: {
						moduleName:
							moduleName[0].toUpperCase() + moduleName.slice(1),
						className,
						path: controllerPath,
					},
				},
			});

			console.log(
				" ",
				chalk.greenBright(`[module]`.padEnd(14)),
				chalk.bold.white(`${moduleName}.module created! ✔️`),
			);

			if (
				target.includes("/") ||
				target.includes("\\") ||
				target.includes("//")
			) {
				await addModuleToContainer(moduleName, modulePath, path);
			} else {
				await addModuleToContainer(moduleName, moduleName, path);
			}
		}
	}

	if (schematic === "service") {
		console.log(
			" ",
			chalk.greenBright(`[${schematic}]`.padEnd(14)),
			chalk.bold.yellow(`${file.split(".")[0]} created! ✔️`),
		);
	} else {
		console.log(
			" ",
			chalk.greenBright(`[${schematic}]`.padEnd(14)),
			chalk.bold.white(`${file.split(".")[0]} ${schematic} created! ✔️`),
		);
	} */
	return f.file;
}

async function nonOpinionatedProcess(): Promise<string> {
	// Non opinionated
	return "";
}

/* Generate Resource */

/**
 * Generate a controller service
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 * @param method - The method
 * @param file - The file
 */
async function generateControllerService(
	outputPath: string,
	className: string,
	path: string,
	method: string,
	file: string,
): Promise<void> {
	let templateBasedMethod = "";

	switch (method) {
		case "put":
			templateBasedMethod =
				"./templates/opinionated/controller-service-put.tpl";
			break;
		case "patch":
			templateBasedMethod =
				"./templates/opinionated/controller-service-patch.tpl";
			break;
		case "post":
			templateBasedMethod =
				"./templates/opinionated/controller-service-post.tpl";
			break;
		case "delete":
			templateBasedMethod =
				"./templates/opinionated/controller-service-delete.tpl";
			break;
		default:
			templateBasedMethod =
				"./templates/opinionated/controller-service-get.tpl";
			break;
	}

	writeTemplate({
		outputPath,
		template: {
			path: templateBasedMethod,
			data: {
				className,
				fileName: getFileNameWithoutExtension(file),
				useCase: anyCaseToCamelCase(className),
				route: path.replace(/\/$/, ""),
				construct: anyCaseToKebabCase(className),
				method: getHttpMethod(method),
			},
		},
	});
}

/**
 * Generate a use case
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 * @param template - The template
 */
async function generateUseCase(
	outputPath: string,
	className: string,
	moduleName: string,
	path: string,
	fileName: string,
	template?: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: template ? template : "./templates/usecase.tpl",
			data: {
				className,
				moduleName,
				path,
				fileName,
			},
		},
	});
}

/**
 * Generate a controller
 * @param outputPath - The output path
 * @param className - The class name
 * @param path - The path
 * @param method - The method
 * @param file - The file
 */
async function generateController(
	outputPath: string,
	className: string,
	path: string,
	method: string,
	file: string,
): Promise<void> {
	const templateBasedMethod =
		"./templates/opinionated/controller-service.tpl";

	writeTemplate({
		outputPath,
		template: {
			path: templateBasedMethod,
			data: {
				className,
				fileName: getFileNameWithoutExtension(file),
				useCase: anyCaseToCamelCase(className),
				route: path.replace(/\/$/, ""),
				construct: anyCaseToKebabCase(className),
				method: getHttpMethod(method),
			},
		},
	});
}

/**
 * Generate a DTO
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 */
async function generateDTO(
	outputPath: string,
	className: string,
	moduleName: string,
	path: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "./templates/common/dto.tpl",
			data: {
				className,
				moduleName,
				path,
			},
		},
	});
}

/**
 * Generate a provider
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 */
async function generateProvider(
	outputPath: string,
	className: string,
	moduleName: string,
	path: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "./templates/common/provider.tpl",
			data: {
				className,
				moduleName,
				path,
			},
		},
	});
}

/**
 * Generate an entity
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 */
async function generateEntity(
	outputPath: string,
	className: string,
	moduleName: string,
	path: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "./templates/opinionated/entity.tpl",
			data: {
				className,
				moduleName,
				path,
			},
		},
	});
}

/**
 * Generate a middleware
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 */
async function generateMiddleware(
	outputPath: string,
	className: string,
	moduleName: string,
	path: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "./templates/common/middleware.tpl",
			data: {
				className,
				moduleName,
				path,
			},
		},
	});
}

/**
 * Generate a module
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 */
async function generateModule(
	outputPath: string,
	className: string,
	moduleName: string,
	path: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "./templates/common/module.tpl",
			data: {
				className,
				moduleName: anyCaseToPascalCase(moduleName),
				path,
			},
		},
	});
}

/* Utility functions */
async function validateAndPrepareFile(fp: FilePreparation) {
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

function getFileNameWithoutExtension(filePath: string) {
	return filePath.split(".")[0];
}

const splitTarget = async ({
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

const getHttpMethod = (method: string): string => {
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

const writeTemplate = ({
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
const schematicFolder = (schematic: string): string | undefined => {
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

const getNameWithScaffoldPattern = async (name: string) => {
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

const pathEdgeCase = (path: string[]): string => {
	return `${path.join("/")}${path.length > 0 ? "/" : ""}`;
};
