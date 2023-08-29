import chalk from "chalk";
import inquirer from "inquirer";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { printError } from "../../utils/cli-ui";
import path from "node:path";
import { exit } from "node:process";
import Compiler from "../../utils/compiler";

const prismaProvider = async (version: string, providerVersion: string): Promise<void> => {

  const choices = [
    { name: "CockroachDB", value: "cockroachdb" },
    { name: "Microsoft SQL Server", value: "sqlserver" },
    { name: "MongoDB", value: "mongodb" },
    { name: "MySQL", value: "mysql" },
    { name: "PostgreSQL", value: "postgresql" },
    { name: "SQLite", value: "sqlite" },
  ];

  const drivers = {
    "PostgreSQL": "pg",
    "MySQL": "mysql2",
    "SQLite": "sqlite3",
    "Microsoft SQL Server": "mssql",
    "MongoDB": "mongodb",
    "CockroachDB": "pg",
  } as { [key: string]: string };

  const answerPt1 = await inquirer.prompt([
    {
      type: "input",
      name: "prismaClientVersion",
      message: "Type the prisma client version (default=latest):",
      default: "latest",
      transformer: (input: string) => {
        return chalk.yellow(chalk.bold(input));
      },
    },
    {
      type: "input",
      name: "schemaName",
      message: "Type the schema name (default=schema):",
      default: "schema",
      transformer: (input: string) => {
        return chalk.yellow(chalk.bold(input));
      },
    },
    {
      type: "input",
      name: "schemaPath",
      message: "Where do you want to save your prisma schema (default=./):",
      default: ".",
      transformer: (input: string) => {
        return chalk.yellow(chalk.bold(input));
      },
    },
    {
      type: "list",
      name: "databaseName",
      message: "Select your database:",
      choices: choices.map((choice) => choice.name),
    }]);

    const answerPt2 = await inquirer.prompt([
        {
          type: "confirm",
          name: "installDriver",
          message: `Do you want to install the latest recommended database driver for ${answerPt1.databaseName}?`,
          default: true,
        },
        {
          type: "confirm",
          name: "baseRepository",
          message: "Do you want to add BaseRepository Pattern in this project?\nthis will replace the existing BaseRepository and BaseRespositoryInterface if it exists.",
          default: true,
        },
        {
          type: "confirm",
          name: "confirm",
          message: "Do you want to add prisma provider in this project?",
          default: true,
        },
    ]);

  const answer = { ...answerPt1, ...answerPt2 };

  if (answer.confirm) {
    // Find which package manager the user has used to install the desired prisma version
    const packageManager = fs.existsSync("package-lock.json" || "yarn.lock" || "pnpm-lock.yaml")
      ? "npm"
      : fs.existsSync("yarn.lock")
      ? "yarn"
      : fs.existsSync("pnpm-lock.yaml")
      ? "pnpm"
      : null;

    if (packageManager) {
      // Install prisma in the project
      console.log(`Installing prisma with ${packageManager}...`);
      await execProcess({ commandArg: packageManager, args: ["add", `prisma@${providerVersion}`, "-D"], directory: process.cwd() });

      // Install Prisma Client
      console.log(`Installing Prisma Client with ${packageManager}...`);
      await execProcess({ commandArg: packageManager, args: ["add", `@prisma/client@${answer.prismaClientVersion}`], directory: process.cwd() });

      if (answer.installDriver) {
        // Install database driver
        console.log(`Installing the latest recommended database driver for ${answer.databaseName}: ${drivers[answer.databaseName]} ...`);
        await execProcess({ commandArg: packageManager, args: ["add", drivers[answer.databaseName]], directory: process.cwd() });
      }

      // Install @expressots/prisma in the project
      console.log(`Installing @expressots/prisma with ${packageManager}...`);
      //await execProcess({ commandArg: packageManager, args: ["add", `@expressots/prisma@${version}`], directory: process.cwd() });
    } else {
      printError(`Could not find a package manager installed in this project.\nPlease install prisma and @expressots/prisma manually.`, "prisma");
      process.exit(1);
    }

    // Map choices to find the corresponding value
    answer.databaseName = choices.find((choice) => choice.name === answer.databaseName)?.value;

    // Init prisma
    console.log(`Initializing prisma...`);
    await execProcess({ commandArg: "npx", args: ["prisma", "init", "--datasource-provider", answer.databaseName], directory: process.cwd() });

    const oldFileName = path.join(process.cwd(), '/prisma/schema.prisma');
    const newFileName = path.join(process.cwd(), `/prisma/${answer.schemaName}.prisma`);
    fs.renameSync(oldFileName, newFileName);

    // Move the folder to the destination
    const schemaPath = path.join(process.cwd(), `${answer.schemaPath}/prisma/${answer.schemaName}.prisma`);
		if (!fs.existsSync(schemaPath)) {
			fs.mkdirSync(path.join(process.cwd(), `${answer.schemaPath}/prisma`), { recursive: true });
		}
    fs.renameSync(newFileName, schemaPath);

    // Remove the source folder
		if(newFileName !== schemaPath) {
			fs.rmSync(path.join(process.cwd(), '/prisma'), { recursive: true });
		}

    // Add prisma to package.json
    prismaPackage(answer);

		if (answer.baseRepository) {
			const { opinionated, sourceRoot } = await Compiler.loadConfig();
			let folderMatch = "";
      if (opinionated) {
				folderMatch = "repositories";
      } else {
				folderMatch = "";
			}
			const repositoryDir = `${sourceRoot}/${folderMatch}`;

			console.log(`Generating BaseRepository Pattern...`);

			const baseRepositoryInterfaceTplPath = path.join(__dirname, './templates/base-repository.interface.tpl');
			const baseRepositoryTplPath = path.join(__dirname, './templates/base-repository.tpl');

			const baseRepositoryInterfaceTemplate = fs.readFileSync(baseRepositoryInterfaceTplPath, 'utf8');
			const baseRepositoryTemplate = fs.readFileSync(baseRepositoryTplPath, 'utf8');
			fs.writeFileSync(
					path.join(repositoryDir, 'base-repository.interface.ts'),
					baseRepositoryInterfaceTemplate
			);

			fs.writeFileSync(
					path.join(repositoryDir, 'base-repository.ts'),
					baseRepositoryTemplate
			);
		}

		// Install @expressots/prisma in the project
		console.log(`Mapping configurations to expressots.config...`);
		await addProviderConfigInExpressotsConfig(answer.schemaName, `${answer.schemaPath}/prisma`)

    console.log('Now configure your database connection in the project.');
    console.log(chalk.green("Prisma provider added successfully!"));
  } else {
    console.log(chalk.red("Prisma provider not added!"));
  }
};

async function execProcess({ commandArg, args, directory }: { commandArg: string; args: string[]; directory: string }) {
  return new Promise((resolve, reject) => {
    const isWindows: boolean = process.platform === "win32";
    const command: string = isWindows ? `${commandArg}.cmd` : commandArg;

    const installProcess = spawn(command, args, {
      cwd: directory,
    });

    installProcess.stdout.on('data', (data) => {
			console.log(`${data}`);
    });

    installProcess.stderr.on('data', (data) => {
      console.error(`${data}`);
    });

    installProcess.on("close", (code) => {
      if (code === 0) {
        resolve("Installation Done!");
      } else {
        reject(new Error(`Command ${command} ${args} exited with code ${code}`));
        exit(1);
      }
    });
  });
}

function prismaPackage(answer: any): void {
  // Get the absolute path of the input directory parameter
  const absDirPath = path.resolve(process.cwd());

  // Load the package.json file
  const packageJsonPath = path.join(absDirPath, "package.json");
  const fileContents = fs.readFileSync(packageJsonPath, "utf-8");
  const packageJson = JSON.parse(fileContents);

  // Add the Prisma configuration to the package.json
  packageJson.prisma = {
    schema: `${answer.schemaPath}/prisma/${answer.schemaName}.prisma`,
  };

  // Save the package.json file
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

async function addProviderConfigInExpressotsConfig(schemaName: string, schemaPath: string): Promise<void> {
  const absDirPath = path.resolve(process.cwd());

  const expressotsConfigPath = path.join(absDirPath, "expressots.config.ts");

	let fileContents = fs.readFileSync(expressotsConfigPath, "utf-8");

	const config = await Compiler.loadConfig();

	const providersObject = `opinionated: ${config.opinionated},\n\tproviders: {
		prisma: {
			schemaName: "${schemaName}",
			schemaPath: "${schemaPath}",
			entitiesPath: "entities",
			entityNamePattern: "entity",
		},
	},`;

	if (config.providers) {
		// delete the providers object until the last closing curly brace
		fileContents = fileContents.replace(/\n([\s]*?)providers: {([\s\S]*?)};/, '\n};');
	}

	const newFileContents = fileContents.replace(/opinionated: (.*)/, providersObject);

	fs.writeFileSync(expressotsConfigPath, newFileContents);
}

export { prismaProvider };
