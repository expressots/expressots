import { ExpressoConfig, Pattern } from "./src/types";

const config: ExpressoConfig = {
	sourceRoot: "src",
	scaffoldPattern: Pattern.KEBAB_CASE,
	opinionated: true,
	scaffoldSchematics: {
		entity: "model",
		provider: "adapter",
		controller: "controller",
		usecase: "operation",
		dto: "payload",
		module: "group",
		middleware: "exjs",
	},
};

export default config;
