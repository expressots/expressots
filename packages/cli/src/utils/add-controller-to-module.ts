import fs from 'node:fs';

async function addControllerToModule(filePath: string, controllerName: string, controllerPath: string) {
  const fileContent = await fs.promises.readFile(filePath, 'utf8');

  const imports: string[] = [];
  const notImports: string[] = [];
  fileContent.split('\n').forEach((line: string) => {
    if (line.startsWith('import')) {
      imports.push(line);
    } else {
      notImports.push(line);
    }
  });

	const newImport = `import { ${controllerName} } from "${controllerPath}";`;
  
	if (imports.includes(newImport)) {
		return;
	}

  imports.push(newImport);

  const moduleDeclarationRegex = /CreateModule\(\s*\[([\s\S]*?)]/;
  const moduleDeclarationMatch = fileContent.match(moduleDeclarationRegex);

  if (!moduleDeclarationMatch) {
    return;
  }

  const controllers = moduleDeclarationMatch[1].trim().split(',').map((c) => c.trim()).filter((c) => c);

  if (controllers.includes(controllerName)) {
    return;
  }

  controllers.push(controllerName);

  const newControllers = controllers.join(', ');
  
  const newModuleDeclaration = `CreateModule([${newControllers}]`;

  const newFileContent = [...imports, ...notImports].join('\n').replace(moduleDeclarationRegex, newModuleDeclaration);

  await fs.promises.writeFile(filePath, newFileContent, 'utf8');
}

export { addControllerToModule };
