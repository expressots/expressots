import fs from "node:fs";
import path from "node:path";

export function changePackageName({
	directory,
	name,
}: {
	directory: string;
	name: string;
}): void {
	const absDirPath = path.resolve(directory);
	const packageJsonPath = path.join(absDirPath, "package.json");
	const fileContents = fs.readFileSync(packageJsonPath, "utf-8");
	const packageJson = JSON.parse(fileContents);
	packageJson.name = name;
	fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}
