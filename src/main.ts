import path from "node:path";
import fs from "node:fs/promises";

import { fixCommonJsTypes } from "./fix";
import type { Action } from "./actions";

async function runAction(action: Action): Promise<void> {
  switch (action.type) {
    case "write-file-static":
      await fs.writeFile(action.path, action.contents);
      console.log(`Wrote a file to ${action.path}`);
      break;
    case "write-file-dynamic":
      const dependencyFileContents = new Map<string, string>();
      await Promise.all(
        action.dependencyFilePaths.map(async (path) => {
          try {
            const pathContents = await fs.readFile(path, "utf8");
            dependencyFileContents.set(path, pathContents);
          } catch (error) {
            console.error(`Failed to read a file from ${path}: ${error}`);
          }
        })
      );
      const contents = action.generateContents(dependencyFileContents);
      if (typeof contents === "string") {
        await fs.writeFile(action.path, contents);
        console.log(`Wrote a file to ${action.path}`);
      } else if (contents instanceof Error) {
        throw new Error(`Failed to write a file to ${action.path}`, {
          cause: contents,
        });
      } else {
        console.log(`No need to write a file to ${action.path}`);
      }
      break;
    case "copy-file":
      await fs.copyFile(action.from, action.to);
      console.log(`Copied a file from ${action.from} to ${action.to}`);
      break;
  }
}

const packageDirRelPath = process.argv[2] ?? process.cwd();
const packageJsonPath = path.join(packageDirRelPath, "package.json");
const packageJson = await fs.readFile(packageJsonPath, "utf8");

const actions = fixCommonJsTypes(packageDirRelPath, packageJson);
await Promise.all(actions.values().map(runAction));
