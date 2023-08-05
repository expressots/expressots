import * as nodePath from "path";
import { mkdirSync, readFileSync } from "node:fs";
import { render } from "mustache";
import { writeFileSync, existsSync } from "fs";
import chalk from "chalk";
import { anyCaseToCamelCase, anyCaseToKebabCase, anyCaseToPascalCase, anyCaseToLowerCase } from "@expressots/boost-ts";
import Compiler from "../utils/compiler";
import { Pattern } from "../types";
import { addControllerToModule } from "../utils/add-controller-to-module";
import { verifyIfFileExists } from "../utils/verify-file-exists";
import { addModuleToContainer } from "../utils/add-module-to-container";
import { printError } from "../utils/cli-ui";

function getFileNameWithoutExtension(filePath: string) {
	return filePath.split('.')[0];
}

type CreateTemplateProps = {
	schematic: string;
	path: string;
	method: string;
};

export const createTemplate = async ({
	schematic,
	path: target,
	method,
}: CreateTemplateProps) => {
	const { opinionated, sourceRoot } = await Compiler.loadConfig();

	if (sourceRoot === "") {
		printError("You must specify a source root in your expressots.config.ts","sourceRoot");
		process.exit(1);
	}

	let folderMatch = "";

	if (opinionated) {
		folderMatch = schematicFolder(schematic);
	} else {
		folderMatch = "";
	}

	const { path, file, className, moduleName, modulePath } = await splitTarget({ target, schematic });
	
	const usecaseDir = `${sourceRoot}/${folderMatch}`;
	
	await verifyIfFileExists(`${usecaseDir}/${path}/${file}`)
	
	mkdirSync(`${usecaseDir}/${path}`, { recursive: true });

	if (schematic !== "service") {

		// add to guarantee that the routing will always be the last part of the path
		let routeSchema = "";
		
		if (target.includes("/") || target.includes("\\") || target.includes("//")) {
			routeSchema = path.split("/").pop();
		} else {
			routeSchema = path.replace(/\/$/, '');
		}

		writeTemplate({
			outputPath: `${usecaseDir}/${path}/${file}`,
			template: {
				path: `./templates/${schematic}.tpl`,
				data: {
					className,
					route: routeSchema,
					construct: anyCaseToKebabCase(className),
					method: getHttpMethod(method),
				},
			},
		});
	} else {
		for await (const resource of ["controller-service", "usecase", "dto"]) {
			const currentSchematic = resource.replace("controller-service", "controller");
		
			const schematicFile = file.replace(
				`controller.ts`,
				`${currentSchematic}.ts`,
			);

			console.log(" ",chalk.greenBright(`[${currentSchematic}]`.padEnd(14)), chalk.bold.white(`${schematicFile} created! ✔️`));
			
			let templateBasedMethod = "";
			if (method) {
				if (resource === "controller-service" || resource === "controller") {
					if (method === "get") templateBasedMethod = `./templates/${resource}.tpl`;
					else templateBasedMethod = `./templates/${resource}-${method}.tpl`;
				} else {
					templateBasedMethod = `./templates/${resource}.tpl`;
				}

				if (resource === "usecase") {
					templateBasedMethod = `./templates/${resource}-op.tpl`;
				}

				if (resource === "usecase") {
					if (method === "get") templateBasedMethod = `./templates/${resource}.tpl`;
					if (method === "post") templateBasedMethod = `./templates/${resource}-${method}.tpl`;
				}

			} else {
				templateBasedMethod = `./templates/${resource}.tpl`;
			}

			// add to guarantee that the routing will always be the last part of the path
			let routeSchema = "";
			
			if (target.includes("/") || target.includes("\\") || target.includes("//")) {
				routeSchema = path.split("/").pop();
			} else {
				routeSchema = path.replace(/\/$/, '');
			}

			writeTemplate({
				outputPath: `${usecaseDir}/${path}/${schematicFile}`,
				template: {
					path: templateBasedMethod,
					data: {
						className,
						fileName: getFileNameWithoutExtension(file),
						useCase: anyCaseToCamelCase(className),
						route: routeSchema,//path.replace(/\/$/, ''),
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
		
		if (target.includes("/") || target.includes("\\") || target.includes("//")) {
			if (modulePath === "") {
				moduleExist = existsSync(`${usecaseDir}/${moduleName}.module.ts`);
				moduleOutPath = `${usecaseDir}/${moduleName}.module.ts`;
			} else {
				moduleExist = existsSync(`${usecaseDir}/${modulePath}/${moduleName}.module.ts`);
				moduleOutPath = `${usecaseDir}/${modulePath}/${moduleName}.module.ts`;
			}
		} else {
			moduleExist = existsSync(`${usecaseDir}/${moduleName}/${moduleName}.module.ts`);
			if (modulePath === "") {
				moduleExist = existsSync(`${usecaseDir}/${moduleName}.module.ts`);
				moduleOutPath = `${usecaseDir}/${moduleName}.module.ts`;
			} else {
				moduleExist = existsSync(`${usecaseDir}/${moduleName}/${moduleName}.module.ts`);
				moduleOutPath = `${usecaseDir}/${moduleName}/${moduleName}.module.ts`;
			}
		}

		let controllerPath = "./";
		const pathCount = (path.split("/")).length;
		
		if (path === "") {
			controllerPath += `${file.slice(0, file.lastIndexOf('.'))}`;
		} else if (pathCount === 1) {
			controllerPath += `${path}/${file.slice(0, file.lastIndexOf('.'))}`;
		} else if (pathCount === 2) {
			controllerPath += `${path.split("/")[1]}/${file.slice(0, file.lastIndexOf('.'))}`;
		} else {
			const segments: string[] = path.split("/").filter((segment) => segment !== "");
			controllerPath += `${segments[segments.length-1]}/${file.slice(0, file.lastIndexOf('.'))}`;
		}
		
		if (moduleExist) {
			if (target.includes("/") || target.includes("\\") || target.includes("//")) {
				await addControllerToModule(`${usecaseDir}/${modulePath}/${moduleName}.module.ts`, `${className}Controller`, controllerPath);
			} else {
				
				if (modulePath === "") {
					await addControllerToModule(`${usecaseDir}/${moduleName}.module.ts`, `${className}Controller`, controllerPath);
				} else {
					await addControllerToModule(`${usecaseDir}/${moduleName}/${moduleName}.module.ts`, `${className}Controller`, controllerPath);
				}
			}
		} else {
			writeTemplate({
				outputPath: moduleOutPath,
				template: {
					path: `./templates/module.tpl`,
					data: {
						moduleName: moduleName[0].toUpperCase() + moduleName.slice(1),
						className,
						path: controllerPath
					},
				},
			});

			console.log(" ",chalk.greenBright(`[module]`.padEnd(14)), chalk.bold.white(`${moduleName}.module created! ✔️`));

			if (target.includes("/") || target.includes("\\") || target.includes("//")) {
				await addModuleToContainer(moduleName, modulePath, path);
			} else {
				await addModuleToContainer(moduleName, moduleName, path);
			}
		}
	}
	if (schematic === "service") {
		console.log(" ",chalk.greenBright(`[${schematic}]`.padEnd(14)), chalk.bold.yellow(`${file.split(".")[0]} created! ✔️`));
	} else {
		console.log(" ",chalk.greenBright(`[${schematic}]`.padEnd(14)), chalk.bold.white(`${file.split(".")[0]} ${schematic} created! ✔️`));
	}
	return file;
};

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

	const pathContent: string[] = target.split("/").filter((item) => item !== "");
	const endsWithSlash: boolean = target.endsWith("/");
	let path = "";
	let fileName = "";
	let module = "";
	let modulePath = "";

	if (target.includes("/") || target.includes("\\") || target.includes("//")) {
		//pathContent = target.split("/").filter((item) => item !== "");
		if (schematic === "service") schematic = "controller";
		if (schematic === "service" || schematic === "controller" && pathContent.length > 4) {
			printError("Max path depth is 4.", pathContent.join("/"));
			process.exit(1);
		}
		
		if (endsWithSlash) {
			fileName = pathContent[pathContent.length-1];
			path = pathContent.join("/");
			module = (pathContent.length == 1)? pathContent[pathContent.length-1] : pathContent[pathContent.length-2];
			modulePath = pathContent.slice(0,-1).join("/");
		} else {
			fileName = pathContent[pathContent.length-1];
			path = pathContent.slice(0,-1).join("/");
			module = (pathContent.length == 2)? pathContent[pathContent.length-2] : pathContent[pathContent.length-3];
			modulePath = pathContent.slice(0,-2).join("/");
		}
		
		return {
			path,
			file: `${await getNameWithScaffoldPattern(fileName)}.${schematic}.ts`,
			className: anyCaseToPascalCase(fileName),
			moduleName: module,
			modulePath
		}
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
				path: `${wordName}/${pathEdgeCase(path)}${pathEdgeCase(remainingPath)}`,
				file: `${await getNameWithScaffoldPattern(name)}.${schematic}.ts`,
				className: anyCaseToPascalCase(name),
				moduleName: wordName,
				modulePath: (pathContent[0].split("-")[1])
			};
		}

		// 3. Return the base case
		return {
			path: "",
			file: `${await getNameWithScaffoldPattern(name)}.${schematic}.ts`,
			className: anyCaseToPascalCase(name),
			moduleName: name,
			modulePath: ""
		};
	}
	
};

const getHttpMethod = (method: string) : string => {
	switch(method) {
		case "put":
			return "httpPut";
		case "post":
			return "httpPost";
		case "patch":
			return "httpPatch";
		case "delete":
			return "httpDelete";
		default:
			return "httpGet";
	}
}

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
			return "entities"
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
