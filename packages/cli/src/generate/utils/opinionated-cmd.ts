import {
	anyCaseToCamelCase,
	anyCaseToKebabCase,
	anyCaseToPascalCase,
} from "@expressots/boost-ts";
import * as nodePath from "node:path";
import fs from "fs";
import { printGenerateSuccess } from "../../utils/cli-ui";
import {
	extractFirstWord,
	FileOutput,
	getFileNameWithoutExtension,
	getHttpMethod,
	validateAndPrepareFile,
	writeTemplate,
} from "./command-utils";
import { addControllerToModule } from "../../utils/add-controller-to-module";
import { addModuleToContainer } from "../../utils/add-module-to-container";

export async function opinionatedProcess(
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
				"../templates/opinionated/usecase-service.tpl",
			);

			f = await validateAndPrepareFile({
				schematic: "dto",
				target,
				method,
				opinionated,
				sourceRoot,
			});
			await generateDTO(f.outputPath, f.className, f.moduleName, f.path);

			f = await validateAndPrepareFile({
				schematic: "module",
				target,
				method,
				opinionated,
				sourceRoot,
			});
			await generateModuleService(
				f.className,
				f.moduleName,
				f.path,
				f.file,
				f.folderToScaffold,
			);

			await printGenerateSuccess("controller", f.file);
			await printGenerateSuccess("usecase", f.file);
			await printGenerateSuccess("dto", f.file);
			await printGenerateSuccess("module", f.file);
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

	return f.file;
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
				"../templates/opinionated/controller-service-put.tpl";
			break;
		case "patch":
			templateBasedMethod =
				"../templates/opinionated/controller-service-patch.tpl";
			break;
		case "post":
			templateBasedMethod =
				"../templates/opinionated/controller-service-post.tpl";
			break;
		case "delete":
			templateBasedMethod =
				"../templates/opinionated/controller-service-delete.tpl";
			break;
		default:
			templateBasedMethod =
				"../templates/opinionated/controller-service-get.tpl";
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
			path: template ? template : "../templates/usecase.tpl",
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
		"../templates/opinionated/controller-service.tpl";

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
			path: "../templates/common/dto.tpl",
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
			path: "../templates/common/provider.tpl",
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
			path: "../templates/opinionated/entity.tpl",
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
			path: "../templates/common/middleware.tpl",
			data: {
				className,
				moduleName,
				path,
			},
		},
	});
}

/**
 * Generate a module for service scaffolding
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 */
async function generateModuleService(
	className: string,
	moduleName: string,
	path: string,
	file: string,
	folderToScaffold: string,
): Promise<void> {
	const newModuleFile = await extractFirstWord(file);
	const newModulePath = nodePath
		.join(folderToScaffold, path, "..")
		.normalize();
	const newModuleName = `${newModuleFile}.module.ts`;
	const newModuleOutputPath = `${newModulePath}/${newModuleName}`;

	const controllerPathLength = path.split("/").length - 1 - 1;
	const controllerPath = path.split("/")[controllerPathLength];
	const controllerName = file
		.replace("module", "controller")
		.replace(".ts", "");
	const controllerFileName = `./${controllerPath}/${controllerName}`;
	const controllerFullPath = nodePath
		.join(folderToScaffold, path, "..", newModuleName)
		.normalize();

	if (fs.existsSync(newModuleOutputPath)) {
		await addControllerToModule(
			controllerFullPath,
			`${className}Controller`,
			controllerFileName,
		);
		return;
	}

	writeTemplate({
		outputPath: newModuleOutputPath,
		template: {
			path: "../templates/opinionated/module-service.tpl",
			data: {
				className,
				moduleName: anyCaseToPascalCase(moduleName),
				path: controllerFileName,
			},
		},
	});

	await addModuleToContainer(
		anyCaseToPascalCase(moduleName),
		`${moduleName}/${file.replace(".ts", "")}`,
		path,
	);
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
			path: "../templates/common/module.tpl",
			data: {
				className,
				moduleName: anyCaseToPascalCase(moduleName),
				path,
			},
		},
	});
}
