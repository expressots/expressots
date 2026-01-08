import { Argv, CommandModule } from "yargs";
import {
	profileContainer,
	profileImage,
	optimizeContainer,
	showProfileReport,
} from "./form";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

const profileCommand = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "profile <action> [target]",
		describe: "Analyze and optimize container configurations.",
		aliases: ["prof", "analyze"],
		builder: (yargs: Argv): Argv => {
			yargs.positional("action", {
				choices: ["container", "image", "optimize", "report"] as const,
				describe: "Action to perform",
				type: "string",
				demandOption: true,
			});

			yargs.positional("target", {
				describe: "Target to analyze (Dockerfile path or image name)",
				type: "string",
			});

			yargs.option("dockerfile", {
				describe: "Path to Dockerfile",
				type: "string",
				alias: "f",
				default: "Dockerfile",
			});

			yargs.option("format", {
				choices: ["text", "json", "html"] as const,
				describe: "Output format",
				type: "string",
				default: "text",
			});

			yargs.option("severity", {
				choices: ["low", "medium", "high", "critical"] as const,
				describe: "Minimum severity to report",
				type: "string",
				default: "low",
			});

			yargs.option("auto-fix", {
				describe: "Automatically apply safe optimizations",
				type: "boolean",
				default: false,
			});

			yargs.option("output", {
				describe: "Output file for report",
				type: "string",
				alias: "o",
			});

			yargs.option("include-security", {
				describe: "Include security vulnerability scanning",
				type: "boolean",
				default: true,
			});

			yargs.option("include-size", {
				describe: "Include size analysis",
				type: "boolean",
				default: true,
			});

			return yargs;
		},
		handler: async (argv) => {
			const {
				action,
				target,
				dockerfile,
				format,
				severity,
				autoFix,
				output,
				includeSecurity,
				includeSize,
			} = argv;

			const options = {
				target: target as string | undefined,
				dockerfile,
				format: format as "text" | "json" | "html",
				severity: severity as "low" | "medium" | "high" | "critical",
				autoFix,
				output,
				includeSecurity,
				includeSize,
			};

			switch (action) {
				case "container":
					await profileContainer(options);
					break;
				case "image":
					await profileImage(options);
					break;
				case "optimize":
					await optimizeContainer(options);
					break;
				case "report":
					await showProfileReport(options);
					break;
				default:
					console.log(`Unknown action: ${action}`);
			}
		},
	};
};

export { profileCommand };
