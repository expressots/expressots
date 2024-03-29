import Compiler from "../utils/compiler";
import { checkPathStyle } from "./utils/command-utils";
import { nonOpinionatedProcess } from "./utils/nonopininated-cmd";
import { opinionatedProcess } from "./utils/opinionated-cmd";

/**
 * Create a template props
 * @param schematic
 * @param path
 * @param method
 */
type CreateTemplateProps = {
	schematic: string;
	path: string;
	method: string;
};

/**
 * Create a template based on the schematic
 * @param schematic
 * @param path
 * @param method
 * @returns the file created
 */
export const createTemplate = async ({
	schematic,
	path: target,
	method,
}: CreateTemplateProps) => {
	const config = await Compiler.loadConfig();
	const pathStyle = checkPathStyle(target);

	let returnFile = "";
	if (config.opinionated) {
		returnFile = await opinionatedProcess(
			schematic,
			target,
			method,
			config,
			pathStyle,
		);
	} else {
		returnFile = await nonOpinionatedProcess(
			schematic,
			target,
			method,
			config,
		);
	}

	return returnFile;
};
