import {
	anyCaseToCamelCase,
	anyCaseToKebabCase,
	anyCaseToPascalCase,
} from "@expressots/boost-ts";

import { printGenerateSuccess } from "../../utils/cli-ui";
import {
	FileOutput,
	getFileNameWithoutExtension,
	getHttpMethod,
	validateAndPrepareFile,
	writeTemplate,
} from "./command-utils";

export async function nonOpinionatedProcess(
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
			await generateController(
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
				"../templates/nonopinionated/usecase.tpl",
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
			await generateModule(
				f.outputPath,
				f.className,
				f.moduleName,
				f.path,
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
			path: template
				? template
				: "../templates/nonopinionated/usecase.tpl",
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
			path: "../templates/nonopinionated/entity.tpl",
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
				moduleName: className
					? anyCaseToPascalCase(className)
					: anyCaseToPascalCase(moduleName),
				path,
			},
		},
	});
}
