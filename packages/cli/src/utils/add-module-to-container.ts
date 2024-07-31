import chalk from "chalk";
import { globSync } from "glob";
import fs from "node:fs";
import { printError } from "./cli-ui";
import Compiler from "./compiler";

const APP_CONTAINER = "app.container.ts";

type AppContainerType = {
	regex: RegExp;
	path: string;
	content: RegExpMatchArray;
	modules: string[];
	imports: string[];
	notImports: string[];
};

async function validateAppContainer(): Promise<AppContainerType> {
	const { sourceRoot } = await Compiler.loadConfig();
	const imports: string[] = [];
	const notImports: string[] = [];

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

	const fileContent = await fs.promises.readFile(path[0], "utf8");

	fileContent.split("\n").forEach((line: string) => {
		if (line.startsWith("import")) {
			imports.push(line);
		} else {
			notImports.push(line);
		}
	});

	// Validate the file content
	const moduleDeclarationRegex = /.create\(\s*\[([\s\S]*?)]/;
	const moduleDeclarationMatch = fileContent.match(moduleDeclarationRegex);

	if (!moduleDeclarationMatch) {
		printError("Container format incorrect!", APP_CONTAINER);
		process.exit(1);
	}

	const modules = moduleDeclarationMatch[1]
		.trim()
		.split(",")
		.filter((m) => m.trim() !== "")
		.map((m) => m.trim());

	return {
		regex: moduleDeclarationRegex,
		path: path[0],
		content: moduleDeclarationMatch,
		modules,
		imports,
		notImports,
	};
}

async function addModuleToContainer(
	name: string,
	modulePath?: string,
	path?: string,
) {
	const containerData: AppContainerType = await validateAppContainer();

	const moduleName = (name[0].toUpperCase() + name.slice(1)).trimStart();
	const { opinionated } = await Compiler.loadConfig();

	let usecaseDir: string;
	if (opinionated) {
		usecaseDir = `@useCases/`;
	} else {
		usecaseDir = `./`;
	}

	let newImport = "";
	const modulePathRegex = /^[^/]=$/;

	if (!modulePathRegex.test(modulePath)) {
		if (path.split("/").length > 1) {
			newImport = `import { ${moduleName}Module } from "${usecaseDir}${name.toLowerCase()}/${name.toLowerCase()}.module";`;
		} else {
			newImport = `import { ${moduleName}Module } from "${usecaseDir}${name.toLowerCase()}.module";`;
		}
	} else {
		newImport = `import { ${moduleName}Module } from "${usecaseDir}${name}/${name.toLowerCase()}.module";`;
	}

	if (
		containerData.imports.includes(newImport) &&
		containerData.modules.includes(`${moduleName}Module`)
	) {
		return;
	}

	containerData.imports.push(newImport);
	containerData.modules.push(`${moduleName}Module`);

	const newModule = containerData.modules.join(", ");
	const newModuleDeclaration = `.create([${newModule}]`;

	const newFileContent = [
		...containerData.imports,
		...containerData.notImports,
	]
		.join("\n")
		.replace(containerData.regex, newModuleDeclaration);

	console.log(
		" ",
		chalk.greenBright(`[container]`.padEnd(14)),
		chalk.bold.white(`${moduleName}Module added to ${APP_CONTAINER}! ✔️`),
	);

	await fs.promises.writeFile(containerData.path, newFileContent, "utf8");
}

async function addModuleToContainerNestedPath(name: string, path?: string) {
	const containerData: AppContainerType = await validateAppContainer();

	const moduleName = (name[0].toUpperCase() + name.slice(1)).trimStart();
	const { opinionated } = await Compiler.loadConfig();

	let usecaseDir: string;
	if (opinionated) {
		usecaseDir = `@useCases/`;
	} else {
		usecaseDir = `./`;
	}

	if (path.endsWith("/")) {
		path = path.slice(0, -1);
	}

	const newImport = `import { ${moduleName}Module } from "${usecaseDir}${path}.module";`;

	if (
		containerData.imports.includes(newImport) &&
		containerData.modules.includes(`${moduleName}Module`)
	) {
		return;
	}

	containerData.imports.push(newImport);
	containerData.modules.push(`${moduleName}Module`);

	const newModule = containerData.modules.join(", ");
	const newModuleDeclaration = `.create([${newModule}]`;

	const newFileContent = [
		...containerData.imports,
		...containerData.notImports,
	]
		.join("\n")
		.replace(containerData.regex, newModuleDeclaration);

	console.log(
		" ",
		chalk.greenBright(`[container]`.padEnd(14)),
		chalk.bold.white(`${moduleName}Module added to ${APP_CONTAINER}! ✔️`),
	);

	await fs.promises.writeFile(containerData.path, newFileContent, "utf8");
}

export { addModuleToContainer, addModuleToContainerNestedPath };
