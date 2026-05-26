import chalk from "chalk";
import degit from "degit";
import inquirer from "inquirer";
import { BUNDLE_VERSION } from "../../cli";
import { centerText } from "../../utils/center-text";
import { changePackageName } from "../../utils/change-package-info";
import { printError } from "../../utils/cli-ui";

/**
 * Override the templates ref/tag, mirroring `EXPRESSOTS_TEMPLATE_REF` in the
 * `new` command. Lets users target a branch (e.g. `feature/v4.0`) before the
 * matching version tag has been pushed.
 */
const TEMPLATE_REF_OVERRIDE = process.env.EXPRESSOTS_TEMPLATE_REF?.trim() || "";
const PREVIEW_FALLBACK_REF = "feature/v4.0";

function isPreviewBuild(): boolean {
	return /-(?:preview|alpha|beta|rc)\b/i.test(BUNDLE_VERSION);
}

function resolveProviderRef(): string {
	if (TEMPLATE_REF_OVERRIDE) return TEMPLATE_REF_OVERRIDE;
	return `v${BUNDLE_VERSION}`;
}

async function cloneProviderTemplate(targetDir: string): Promise<void> {
	const primaryRef = resolveProviderRef();
	const primaryRepo = `expressots/templates/provider#${primaryRef}`;

	try {
		await degit(primaryRepo, { force: false }).clone(targetDir);
		return;
	} catch (err: any) {
		const isMissingRef = err?.code === "MISSING_REF";
		const canFallback =
			isMissingRef && !TEMPLATE_REF_OVERRIDE && isPreviewBuild();

		if (!canFallback) throw err;

		console.log(
			chalk.yellow(
				`\n⚠  Templates tag "${primaryRef}" not found on GitHub yet — falling back to "${PREVIEW_FALLBACK_REF}". ` +
					`Set EXPRESSOTS_TEMPLATE_REF=<branch-or-tag> to override.`,
			),
		);
		await degit(`expressots/templates/provider#${PREVIEW_FALLBACK_REF}`, {
			force: false,
		}).clone(targetDir);
	}
}

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
			// Pinned to the templates tag matching this CLI's published version,
			// same policy as `expressots new`. BUNDLE_VERSION reads from the
			// CLI's own package.json so the ref always tracks the release.
			//
			// Mirrors the preview-fallback logic in `new/form.ts`: during the
			// preview window the matching `vX.Y.Z` tag may not yet be on
			// `expressots/templates`, so we soft-fall back to the active
			// release branch and warn rather than failing opaquely.
			await cloneProviderTemplate(providerInfo.providerName);

			changePackageName({
				directory: providerInfo.providerName,
				name: providerInfo.providerName,
			});

			await printInfo(providerInfo.providerName);

			resolve();
		} catch (err: any) {
			console.log("\n");
			const msg = err?.message ? String(err.message) : String(err);
			const code = err?.code ? ` [${err.code}]` : "";
			if (
				err?.code === "DEST_NOT_EMPTY" ||
				/already exists|not empty/i.test(msg)
			) {
				printError(
					`Target folder "${providerInfo.providerName}" already exists or is not empty`,
					"",
				);
			} else {
				printError(`Failed to scaffold provider${code}: ${msg}`, "");
			}
			reject(err);
		}
	});
};
