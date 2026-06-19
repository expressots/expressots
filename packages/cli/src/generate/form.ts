import Compiler from "../utils/compiler";
import { checkPathStyle } from "./utils/command-utils";
import { nonOpinionatedProcess } from "./utils/nonopininated-cmd";
import { opinionatedProcess } from "./utils/opinionated-cmd";

/**
 * Create a template props
 * @param schematic
 * @param path
 * @param method
 * @param event - Event class name (for handler generation)
 * @param priority - Priority for interceptors/handlers
 */
type CreateTemplateProps = {
	schematic: string;
	path: string;
	method: string;
	event?: string;
	priority?: number;
};

/**
 * Create a template based on the schematic
 * @param schematic - the schematic to create
 * @param path - the path to create the schematic
 * @param method - the http method
 * @returns the file created
 */
export const createTemplate = async ({
	schematic,
	path: target,
	method,
	event,
	priority = 10,
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
			{ event, priority },
		);
	} else {
		returnFile = await nonOpinionatedProcess(
			schematic,
			target,
			method,
			config,
			{ event, priority },
		);
	}

	return returnFile;
};
