import fs from "fs";
import path from "path";

function hasFolder(
	rootDir: string,
	ignoreList: Array<string> = [],
): { found: boolean; path: string | null } {
	function searchDir(directory: string): string | null {
		const files = fs.readdirSync(directory);

		for (const file of files) {
			if (ignoreList.includes(file)) continue; // Skip if the file/folder is in the ignore list

			const filePath = path.join(directory, file);
			const stats = fs.statSync(filePath);

			if (stats.isDirectory()) {
				if (file === "prisma") {
					return filePath; // Return full path of the 'prisma' folder
				} else {
					const result = searchDir(filePath); // Search inside other directories recursively
					if (result) {
						return result;
					}
				}
			}
		}
		return null; // 'prisma' folder was not found in this directory
	}

	const foundPath = searchDir(rootDir);
	return {
		found: !!foundPath,
		path: foundPath,
	};
}

export { hasFolder };
