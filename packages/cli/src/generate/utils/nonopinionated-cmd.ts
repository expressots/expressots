import {
	anyCaseToCamelCase,
	anyCaseToKebabCase,
	anyCaseToPascalCase,
	anyCaseToUpperSnakeCase,
} from "./string-utils";
import { ExpressoConfig } from "@expressots/shared";

import { printGenerateSuccess } from "../../utils/cli-ui";
import {
	FileOutput,
	getFileNameWithoutExtension,
	getHttpMethod,
	validateAndPrepareFile,
	writeTemplate,
} from "./command-utils";

/**
 * Additional options for v4.0 schematics
 */
type V4Options = {
	event?: string;
	priority?: number;
};

/**
 * Process the non-opinionated command
 * @param schematic - The schematic
 * @param target - The target
 * @param method - The method
 * @param expressoConfig - The expresso config
 * @param v4Options - Additional options for v4.0 schematics
 */
export async function nonOpinionatedProcess(
	schematic: string,
	target: string,
	method: string,
	expressoConfig: ExpressoConfig,
	v4Options: V4Options = {},
): Promise<string> {
	let f: FileOutput = await validateAndPrepareFile({
		schematic,
		target,
		method,
		expressoConfig,
	});
	switch (schematic) {
		case "service":
			f = await validateAndPrepareFile({
				schematic: "controller",
				target,
				method,
				expressoConfig,
			});
			await generateController(
				f.outputPath,
				f.className,
				f.path,
				method,
				f.file,
				f.schematic,
			);
			await printGenerateSuccess(f.schematic, f.file);

			f = await validateAndPrepareFile({
				schematic: "usecase",
				target,
				method,
				expressoConfig,
			});
			await generateUseCase(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.fileName,
				f.schematic,
				"../templates/nonopinionated/usecase.tpl",
			);
			await printGenerateSuccess(f.schematic, f.file);

			f = await validateAndPrepareFile({
				schematic: "dto",
				target,
				method,
				expressoConfig,
			});
			await generateDTO(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.schematic,
			);
			await printGenerateSuccess(f.schematic, f.file);

			f = await validateAndPrepareFile({
				schematic: "module",
				target,
				method,
				expressoConfig,
			});
			await generateModule(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.schematic,
			);
			await printGenerateSuccess(f.schematic, f.file);
			break;
		case "usecase":
			await generateUseCase(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.fileName,
				f.schematic,
			);
			await printGenerateSuccess(f.schematic, f.file);
			break;
		case "controller":
			await generateController(
				f.outputPath,
				f.className,
				f.path,
				method,
				f.file,
				f.schematic,
			);
			await printGenerateSuccess(f.schematic, f.file);
			break;
		case "dto":
			await generateDTO(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.schematic,
			);
			await printGenerateSuccess(f.schematic, f.file);
			break;
		case "provider":
			await generateProvider(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.schematic,
			);
			await printGenerateSuccess(f.schematic, f.file);
			break;
		case "entity":
			await generateEntity(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.schematic,
			);
			await printGenerateSuccess(f.schematic, f.file);
			break;
		case "middleware":
			await generateMiddleware(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.schematic,
			);
			await printGenerateSuccess(f.schematic, f.file);
			break;
		case "module":
			await generateModule(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
				f.schematic,
			);
			await printGenerateSuccess(f.schematic, f.file);
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
	schematic: string,
	template?: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: template
				? template
				: "../templates/nonopinionated/usecase.tpl",
			data: {
				className,
				moduleName,
				path,
				fileName,
				schematic:
					schematic === "usecase"
						? "UseCase"
						: anyCaseToPascalCase(schematic),
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
	schematic: string,
): Promise<void> {
	const templateBasedMethod = "../templates/nonopinionated/controller.tpl";
	writeTemplate({
		outputPath,
		template: {
			path: templateBasedMethod,
			data: {
				className,
				fileName: getFileNameWithoutExtension(file),
				useCase: anyCaseToCamelCase(className),
				route: className
					? className.toLowerCase()
					: path.replace(/\/$/, ""),
				construct: anyCaseToKebabCase(className),
				method: getHttpMethod(method),
				schematic: anyCaseToPascalCase(schematic),
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
	schematic: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/nonopinionated/dto.tpl",
			data: {
				className,
				moduleName,
				path,
				schematic: anyCaseToPascalCase(schematic),
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
	schematic: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/nonopinionated/provider.tpl",
			data: {
				className,
				moduleName,
				path,
				schematic: anyCaseToPascalCase(schematic),
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
	schematic: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/nonopinionated/entity.tpl",
			data: {
				className,
				moduleName,
				path,
				schematic: anyCaseToPascalCase(schematic),
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
	schematic: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/nonopinionated/middleware.tpl",
			data: {
				className,
				moduleName,
				path,
				schematic: anyCaseToPascalCase(schematic),
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
	schematic: string,
): Promise<void> {
	writeTemplate({
		outputPath,
		template: {
			path: "../templates/nonopinionated/module.tpl",
			data: {
				className,
				moduleName: className
					? anyCaseToPascalCase(className)
					: anyCaseToPascalCase(moduleName),
				path,
				schematic: anyCaseToPascalCase(schematic),
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
			path: "../templates/nonopinionated/interceptor.tpl",
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
			path: "../templates/nonopinionated/event.tpl",
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
			path: "../templates/nonopinionated/handler.tpl",
			data: {
				className: anyCaseToPascalCase(className),
				eventName: anyCaseToPascalCase(eventName),
				eventPath: `./${anyCaseToKebabCase(eventName)}.event`,
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
			path: "../templates/nonopinionated/guard.tpl",
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
			path: "../templates/nonopinionated/config.tpl",
			data: {
				className: anyCaseToPascalCase(className),
				moduleName: anyCaseToCamelCase(moduleName || className),
				envPrefix: anyCaseToUpperSnakeCase(className),
			},
		},
	});
}
