import {
	anyCaseToCamelCase,
	anyCaseToKebabCase,
	anyCaseToPascalCase,
	anyCaseToUpperSnakeCase,
} from "./string-utils";
import * as nodePath from "node:path";
import fs from "fs";
import { printGenerateSuccess } from "../../utils/cli-ui";
import {
	extractFirstWord,
	FileOutput,
	getFileNameWithoutExtension,
	getHttpMethod,
	getNameWithScaffoldPattern,
	PathStyle,
	validateAndPrepareFile,
	writeTemplate,
} from "./command-utils";
import { addControllerToModule } from "../../utils/add-controller-to-module";
import { addModuleToContainerByPath } from "../../utils/add-module-to-container";
import { ExpressoConfig } from "@expressots/shared";

/**
 * Additional options for v4.0 schematics
 */
type V4Options = {
	event?: string;
	priority?: number;
};

/**
 * Process commands for opinionated service scaffolding
 * @param schematic - Resource to scaffold
 * @param target - Target path
 * @param method - HTTP method
 * @param expressoConfig - Expresso configuration [expressots.config.ts]
 * @param pathStyle - Path command style [sugar, nested, single]
 * @param v4Options - Additional options for v4.0 schematics
 * @returns
 */
export async function opinionatedProcess(
	schematic: string,
	target: string,
	method: string,
	expressoConfig: ExpressoConfig,
	pathStyle: string,
	v4Options: V4Options = {},
): Promise<string> {
	const f: FileOutput = await validateAndPrepareFile({
		schematic,
		target,
		method,
		expressoConfig,
	});
	switch (schematic) {
		case "service": {
			await generateControllerService(
				f.outputPath,
				f.className,
				f.path,
				method,
				f.file,
			);

			const u = await validateAndPrepareFile({
				schematic: "usecase",
				target,
				method,
				expressoConfig,
			});
			await generateUseCaseService(
				u.outputPath,
				u.className,
				method,
				u.moduleName,
				u.path,
				u.fileName,
			);

			const d = await validateAndPrepareFile({
				schematic: "dto",
				target,
				method,
				expressoConfig,
			});
			await generateDTO(d.outputPath, d.className, d.moduleName, d.path);

			const m = await validateAndPrepareFile({
				schematic: "module",
				target,
				method,
				expressoConfig,
			});

			let moduleFile = m.file;
			if (pathStyle === PathStyle.Sugar) {
				moduleFile = await generateModuleServiceSugarPath(
					f.outputPath,
					m.className,
					m.moduleName,
					m.path,
					m.folderToScaffold,
				);
			} else if (pathStyle === PathStyle.Nested) {
				moduleFile = await generateModuleServiceNestedPath(
					f.outputPath,
					m.className,
					m.path,
					m.folderToScaffold,
				);
			} else if (pathStyle === PathStyle.Single) {
				moduleFile = await generateModuleServiceSinglePath(
					f.outputPath,
					m.className,
					m.moduleName,
					m.path,
					m.file,
					m.folderToScaffold,
				);
			}

			await printGenerateSuccess("controller", f.file);
			await printGenerateSuccess("usecase", f.file);
			await printGenerateSuccess("dto", f.file);
			await printGenerateSuccess("module", moduleFile);
			break;
		}
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
		// NEW v4.0 schematics
		case "interceptor":
			await generateInterceptor(
				f.outputPath,
				f.className,
				v4Options.priority ?? 10,
			);
			await printGenerateSuccess("interceptor", f.file);
			break;
		case "event":
			await generateEvent(f.outputPath, f.className);
			await printGenerateSuccess("event", f.file);
			break;
		case "handler":
			await generateHandler(
				f.outputPath,
				f.className,
				v4Options.event ?? "MyEvent",
				v4Options.priority ?? 10,
			);
			await printGenerateSuccess("handler", f.file);
			break;
		case "guard":
			await generateGuard(f.outputPath, f.className);
			await printGenerateSuccess("guard", f.file);
			break;
		case "config":
			await generateConfig(f.outputPath, f.className, f.moduleName);
			await printGenerateSuccess("config", f.file);
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
async function generateUseCaseService(
	outputPath: string,
	className: string,
	method: string,
	moduleName: string,
	path: string,
	fileName: string,
): Promise<void> {
	let templateBasedMethod = "";

	switch (method) {
		case "put":
			templateBasedMethod =
				"../templates/opinionated/usecase-service.tpl";
			break;
		case "patch":
			templateBasedMethod =
				"../templates/opinionated/usecase-service.tpl";
			break;
		case "post":
			templateBasedMethod =
				"../templates/opinionated/usecase-service.tpl";
			break;
		case "delete":
			templateBasedMethod =
				"../templates/opinionated/usecase-service-delete.tpl";
			break;
		default:
			templateBasedMethod = "../templates/opinionated/usecase.tpl";
			break;
	}
	writeTemplate({
		outputPath,
		template: {
			path: templateBasedMethod,
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
 * Generate a use case
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 * @param fileName - The file name
 */
async function generateUseCase(
	outputPath: string,
	className: string,
	moduleName: string,
	path: string,
	fileName: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/opinionated/usecase.tpl",
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
			path: "../templates/opinionated/dto.tpl",
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
			path: "../templates/opinionated/provider.tpl",
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
			path: "../templates/opinionated/middleware.tpl",
			data: {
				className,
				moduleName,
				path,
			},
		},
	});
}

/**
 * Generate a module for service scaffolding with sugar path
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 */
async function generateModuleServiceSugarPath(
	outputPathController: string,
	className: string,
	moduleName: string,
	path: string,
	folderToScaffold: string,
): Promise<string> {
	// The module file is named after the feature (first word), e.g. `user`, and
	// lives at the feature root (`useCases/user/user.module.ts`), grouping all of
	// the feature's use-cases. `moduleName` already carries the feature word.
	const newModuleFile = await getNameWithScaffoldPattern(moduleName);
	const newModulePath = nodePath
		.join(folderToScaffold, path, "..")
		.normalize();
	const newModuleName = `${newModuleFile}.module.ts`;
	const newModuleOutputPath = `${newModulePath}/${newModuleName}`.replace(
		/\\/g,
		"/",
	);

	const controllerToModule = nodePath
		.relative(newModuleOutputPath, outputPathController)
		.normalize()
		.replace(/\.ts$/, "")
		.replace(/\\/g, "/")
		.replace(/\.\./g, ".");

	const controllerFullPath = nodePath
		.join(folderToScaffold, path, "..", newModuleName)
		.normalize();

	if (fs.existsSync(newModuleOutputPath)) {
		await addControllerToModule(
			controllerFullPath,
			`${className}Controller`,
			controllerToModule,
		);
		return newModuleName;
	}

	writeTemplate({
		outputPath: newModuleOutputPath,
		template: {
			path: "../templates/opinionated/module-service.tpl",
			data: {
				className,
				moduleName: anyCaseToPascalCase(moduleName),
				path: controllerToModule,
			},
		},
	});

	// Extract folder name from folderToScaffold (e.g., "src/useCases" -> "useCases")
	const folderName = nodePath.basename(folderToScaffold);
	await addModuleToContainerByPath(
		`${anyCaseToPascalCase(moduleName)}Module`,
		newModuleOutputPath,
		folderToScaffold,
		folderName,
	);

	return newModuleName;
}

/**
 * Generate a module for service scaffolding with single path
 * @param outputPath - The output path
 * @param className - The class name
 * @param moduleName - The module name
 * @param path - The path
 */
async function generateModuleServiceSinglePath(
	outputPathController: string,
	className: string,
	moduleName: string,
	path: string,
	file: string,
	folderToScaffold: string,
): Promise<string> {
	const newModuleFile = await extractFirstWord(file);
	const newModulePath = nodePath.join(folderToScaffold, path).normalize();
	const newModuleName = `${newModuleFile}.module.ts`;
	const newModuleOutputPath = `${newModulePath}/${newModuleName}`.replace(
		/\\/g,
		"/",
	);

	const controllerToModule = nodePath
		.relative(newModuleOutputPath, outputPathController)
		.normalize()
		.replace(/\.ts$/, "")
		.replace(/\\/g, "/")
		.replace(/\.\./g, ".");

	const controllerFullPath = nodePath
		.join(folderToScaffold, path, "..", newModuleName)
		.normalize();

	if (fs.existsSync(newModuleOutputPath)) {
		await addControllerToModule(
			controllerFullPath,
			`${className}Controller`,
			controllerToModule,
		);
		return newModuleName;
	}

	writeTemplate({
		outputPath: newModuleOutputPath,
		template: {
			path: "../templates/opinionated/module-service.tpl",
			data: {
				className,
				moduleName: anyCaseToPascalCase(moduleName),
				path: controllerToModule,
			},
		},
	});

	// Extract folder name from folderToScaffold (e.g., "src/useCases" -> "useCases")
	const folderName = nodePath.basename(folderToScaffold);
	await addModuleToContainerByPath(
		`${anyCaseToPascalCase(moduleName)}Module`,
		newModuleOutputPath,
		folderToScaffold,
		folderName,
	);

	return newModuleName;
}

/**
 * Generate a module for service scaffolding with nested path
 * @param outputPathController
 * @param className
 * @param path
 * @param folderToScaffold
 * @returns
 */
async function generateModuleServiceNestedPath(
	outputPathController: string,
	className: string,
	path: string,
	folderToScaffold: string,
): Promise<string> {
	const moduleFileName = nodePath.basename(path, "/");
	const newModulePath = nodePath
		.join(folderToScaffold, path, "..")
		.normalize();

	const newModuleName = `${moduleFileName}.module.ts`;
	const newModuleOutputPath = `${newModulePath}/${newModuleName}`.replace(
		/\\/g,
		"/",
	);

	const controllerToModule = nodePath
		.relative(newModuleOutputPath, outputPathController)
		.normalize()
		.replace(/\.ts$/, "")
		.replace(/\\/g, "/")
		.replace(/\.\./g, ".");

	const controllerFullPath = nodePath
		.join(folderToScaffold, path, "..", newModuleName)
		.normalize();

	if (fs.existsSync(newModuleOutputPath)) {
		await addControllerToModule(
			controllerFullPath,
			`${className}Controller`,
			controllerToModule,
		);
		return newModuleName;
	}

	writeTemplate({
		outputPath: newModuleOutputPath,
		template: {
			path: "../templates/opinionated/module-service.tpl",
			data: {
				className,
				moduleName: anyCaseToPascalCase(moduleFileName),
				path: controllerToModule,
			},
		},
	});

	// Extract folder name from folderToScaffold (e.g., "src/useCases" -> "useCases")
	const folderName = nodePath.basename(folderToScaffold);
	await addModuleToContainerByPath(
		`${anyCaseToPascalCase(moduleFileName)}Module`,
		newModuleOutputPath,
		folderToScaffold,
		folderName,
	);

	return newModuleName;
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
			path: "../templates/opinionated/module.tpl",
			data: {
				className,
				moduleName: anyCaseToPascalCase(moduleName),
				path,
			},
		},
	});
}

// NEW v4.0 Schematic Generators

/**
 * Generate an interceptor
 */
async function generateInterceptor(
	outputPath: string,
	className: string,
	priority: number,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/opinionated/interceptor.tpl",
			data: {
				className: anyCaseToPascalCase(className),
				priority: priority.toString(),
			},
		},
	});
}

/**
 * Generate an event
 */
async function generateEvent(
	outputPath: string,
	className: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/opinionated/event.tpl",
			data: {
				className: anyCaseToPascalCase(className),
			},
		},
	});
}

/**
 * Generate an event handler
 */
async function generateHandler(
	outputPath: string,
	className: string,
	eventName: string,
	priority: number,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/opinionated/handler.tpl",
			data: {
				className: anyCaseToPascalCase(className),
				eventName: anyCaseToPascalCase(eventName),
				eventPath: `@events/${anyCaseToKebabCase(eventName)}.event`,
				priority: priority.toString(),
			},
		},
	});
}

/**
 * Generate a guard
 */
async function generateGuard(
	outputPath: string,
	className: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/opinionated/guard.tpl",
			data: {
				className: anyCaseToPascalCase(className),
			},
		},
	});
}

/**
 * Generate a config module
 */
async function generateConfig(
	outputPath: string,
	className: string,
	moduleName: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/opinionated/config.tpl",
			data: {
				className: anyCaseToPascalCase(className),
				moduleName: anyCaseToCamelCase(moduleName || className),
				envPrefix: anyCaseToUpperSnakeCase(className),
			},
		},
	});
}
