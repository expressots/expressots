import { Argv, CommandModule } from "yargs";
import {
	startDevContainer,
	stopDevContainer,
	attachToContainer,
	openShell,
	showStatus,
	showLogs,
} from "./form";

// eslint-disable-next-line @typescript-eslint/ban-types
type CommandModuleArgs = {};

const devContainerCommand = (): CommandModule<CommandModuleArgs, any> => {
	return {
		command: "container-dev [action]",
		describe: "Develop inside Docker containers with hot reload.",
		aliases: ["cdev", "docker-dev"],
		builder: (yargs: Argv): Argv => {
			yargs.positional("action", {
				choices: [
					"start",
					"stop",
					"attach",
					"shell",
					"status",
					"logs",
				] as const,
				describe: "Action to perform",
				type: "string",
				default: "start",
			});

			yargs.option("container", {
				describe: "Run development in Docker container",
				type: "boolean",
				alias: "c",
				default: false,
			});

			yargs.option("service", {
				describe: "Docker Compose service name",
				type: "string",
				alias: "s",
				default: "app",
			});

			yargs.option("compose-file", {
				describe: "Path to docker-compose file",
				type: "string",
				alias: "f",
				default: "docker-compose.development.yml",
			});

			yargs.option("build", {
				describe: "Rebuild container before starting",
				type: "boolean",
				alias: "b",
				default: false,
			});

			yargs.option("detach", {
				describe: "Run in background",
				type: "boolean",
				alias: "d",
				default: false,
			});

			yargs.option("port", {
				describe: "Override application port",
				type: "number",
				alias: "p",
			});

			yargs.option("debug-port", {
				describe: "Debug port for Node.js inspector",
				type: "number",
				default: 9229,
			});

			yargs.option("watch", {
				describe: "Enable file watching for hot reload",
				type: "boolean",
				alias: "w",
				default: true,
			});

			yargs.option("follow", {
				describe: "Follow logs (for logs action)",
				type: "boolean",
				default: true,
			});

			yargs.option("tail", {
				describe: "Number of log lines to show",
				type: "number",
				default: 100,
			});

			return yargs;
		},
		handler: async (argv) => {
			const {
				action,
				container,
				service,
				composeFile,
				build,
				detach,
				port,
				debugPort,
				watch,
				follow,
				tail,
			} = argv;

			const options = {
				container,
				service,
				composeFile,
				build,
				detach,
				port,
				debugPort,
				watch,
				follow,
				tail,
			};

			// If --container flag is set without action, start container dev
			if (container && action === "start") {
				await startDevContainer(options);
				return;
			}

			switch (action) {
				case "start":
					if (container) {
						await startDevContainer(options);
					} else {
						// Regular dev command (non-container) - delegate to existing
						console.log("Starting local development...");
						console.log(
							"Use --container flag to develop inside Docker.",
						);
						console.log("Or run: npm run dev");
					}
					break;
				case "stop":
					await stopDevContainer(options);
					break;
				case "attach":
					await attachToContainer(options);
					break;
				case "shell":
					await openShell(options);
					break;
				case "status":
					await showStatus(options);
					break;
				case "logs":
					await showLogs(options);
					break;
				default:
					console.log(`Unknown action: ${action}`);
			}
		},
	};
};

export { devContainerCommand };
