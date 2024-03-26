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
