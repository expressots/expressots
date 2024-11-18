import chalk from "chalk";
import degit from "degit";
import inquirer from "inquirer";
import { centerText } from "../../utils/center-text";
import { changePackageName } from "../../utils/change-package-info";
import { printError } from "../../utils/cli-ui";

async function printInfo(providerName: string): Promise<void> {
	console.log("\n");
	console.log(
		"🐎 Provider",
		chalk.green(providerName),
		"created successfully!",
	);
	console.log("🤙 Run the following commands to start the provider:\n");

	console.log(chalk.bold.gray(`$ cd ${providerName}`));

	console.log("\n");
	console.log(chalk.bold.green(centerText("Happy coding!")));
	console.log(
		chalk.bold.gray(
			centerText("Please consider donating to support the project.\n"),
		),
	);
	console.log(
		chalk.bold.white(
			centerText("💖 Sponsor: https://github.com/sponsors/expressots"),
		),
	);
	console.log("\n");
}

interface IExternalProvider {
	providerName: string;
}

export const createExternalProvider = async (
	provider: string,
): Promise<void> => {
	return new Promise<void>(async (resolve, reject) => {
		let providerInfo: IExternalProvider = {} as IExternalProvider;
		providerInfo.providerName = provider;

		if (!provider) {
			providerInfo = await inquirer.prompt<IExternalProvider>([
				{
					type: "input",
					name: "providerName",
					message: "Provider name",
					default: "expressots-provider",
					transformer: (input: string) => {
						return chalk.yellow(chalk.bold(input));
					},
				},
			]);
		}

		try {
			const emitter = degit(`expressots/templates/provider`);
			await emitter.clone(providerInfo.providerName);

			changePackageName({
				directory: providerInfo.providerName,
				name: providerInfo.providerName,
			});

			await printInfo(providerInfo.providerName);

			resolve();
		} catch (err: any) {
			console.log("\n");
			printError("Project already exists or Folder is not empty", "");
			reject(err);
		}
	});
};
