import { s } from "vitest/dist/reporters-cb94c88b";
import Compiler from "../utils/compiler";
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
	const { opinionated, sourceRoot } = await Compiler.loadConfig();

	let returnFile = "";

	if (opinionated) {
		returnFile = await opinionatedProcess(
			schematic,
			target,
			method,
			opinionated,
			sourceRoot,
		);
	} else {
		returnFile = await nonOpinionatedProcess(
			schematic,
			target,
			method,
			opinionated,
			sourceRoot,
		);
	}

	return returnFile;
};
