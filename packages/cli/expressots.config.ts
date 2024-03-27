import { ExpressoConfig, Pattern } from "./src/types";

const config: ExpressoConfig = {
	sourceRoot: "src",
	scaffoldPattern: Pattern.KEBAB_CASE,
	opinionated: false,
};

export default config;
