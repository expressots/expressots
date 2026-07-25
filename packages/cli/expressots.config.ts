import { ExpressoConfig, Pattern } from "@expressots/shared";

const config: ExpressoConfig = {
	sourceRoot: "src",
	scaffoldPattern: Pattern.KEBAB_CASE,
	opinionated: false,
	env: {
		development: ".env.development",
		production: ".env.production",
	},
	/* scaffoldSchematics: {
		entity: "model",
		provider: "adapter",
		controller: "controller",
		usecase: "operation",
		dto: "payload",
		module: "group",
		middleware: "exjs",
	}, */
};

export default config;
