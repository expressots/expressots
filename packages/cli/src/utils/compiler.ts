import { existsSync } from "node:fs";
import path from "path";
import { RegisterOptions, Service } from "ts-node";
import { ExpressoConfig } from "../types";

/**
 * The path to the expressots.config.ts file
 */
const EXPRESSOTS_CONFIG: string = path.join(
	process.cwd(),
	"expressots.config.ts",
);

/**
 * The config object
 */
let globalConfigObject: any = null;

/**
 * The ts-node register options
 */
const regOpt: RegisterOptions = {
	compilerOptions: {
		module: "commonjs",
	},
	moduleTypes: {
		"**": "cjs",
	},
};

/**
 * Singleton compiler class
 */
class Compiler {
	private static instance: Compiler;

	private constructor() {}

	static get Instance(): Compiler {
		if (!Compiler.instance) {
			Compiler.instance = new Compiler();
		}
		return Compiler.instance;
	}

	async getService(): Promise<Service> {
		const tsnode = await import("ts-node");
		const compiler: Service = tsnode.register(regOpt);
		return compiler;
	}

	private static interopRequireDefault(obj: any): { default: any } {
		const module = require(obj);
		return module && module.__esModule ? module : { default: module };
	}

	private static async findConfig(dir: string): Promise<string> {
		const configPath = path.join(dir, "expressots.config.ts");
		const exists = existsSync(configPath);

		if (exists) return configPath;

		const parentDir = path.join(dir, "..");
		if (parentDir === dir) throw new Error("No config file found");

		return Compiler.findConfig(parentDir);
	}

	static async loadConfig(): Promise<ExpressoConfig> {
		const compiler: Service = await Compiler.Instance.getService();

		compiler.enabled(true);

		globalConfigObject = Compiler.interopRequireDefault(
			await Compiler.findConfig(process.cwd()),
		);

		compiler.enabled(false);

		return globalConfigObject.default;
	}
}

export default Compiler;
