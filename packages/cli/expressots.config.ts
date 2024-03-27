import { ExpressoConfig, Pattern } from "./src/types";

const config: ExpressoConfig = {
	sourceRoot: "src",
	scaffoldPattern: Pattern.CAMEL_CASE,
	opinionated: true,
};

export default config;
