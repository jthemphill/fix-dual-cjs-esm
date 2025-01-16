import path from "node:path";

import { z } from "zod";

import type { Action } from "./actions";
import { ExportSchema, PackageJsonSchema } from "./schemas";

/**
 * @text The contents of a consistently-indented text file
 * @returns The whitespace string used to indent the given file
 */
function detectIndentation(text: string): string {
  const indentationMatches = text.matchAll(/^\s+/gm);
  let minIndentation = "";
  for (const match of indentationMatches) {
    const lineIndentation = match[0];
    if (
      minIndentation.length === 0 ||
      lineIndentation.length < minIndentation.length
    ) {
      minIndentation = lineIndentation;
    }
  }
  return minIndentation;
}

/**
 * @returns A newline character if the given string ends with a newline character, or an empty string otherwise
 */
function detectEndingNewline(text: string): string {
  return text.endsWith("\n") ? "\n" : "";
}

/**
 * @returns A relative path to the types file that supposedly corresponds to the CJS entrypoint, or `undefined` if no such file exists.
 */
function getExportRequireTypesRelPath(
  exports: z.infer<typeof ExportSchema>
): string | undefined {
  if (typeof exports === "string") {
    return undefined;
  }

  if (typeof exports.require === "object") {
    return exports.require.types;
  }

  return exports.types;
}

/**
 * @returns A relative path to the CJS file corresponding to the CJS entrypoint, or `undefined` if no such file exists.
 */
function getExportRequireImplRelPath(
  exports: z.infer<typeof ExportSchema>
): string | undefined {
  if (typeof exports === "string") {
    return undefined;
  }

  if (typeof exports.require === "string") {
    return exports.require;
  }

  return exports.require?.default;
}

/**
 * If a package has a CJS file with an ESM type declaration file, copy the ESM types to a CJS type declaration file.
 *
 * @param packageDirRelPath The path to the package directory, relative to the current working directory
 * @param packageJson The contents of the package.json file
 * @returns A list of Actions which, if applied, will fix the package's CJS types
 */
export function fixCommonJsTypes(
  packageDirRelPath: string,
  packageJson: string
): Map<string, Action> {
  const packageData = JSON.parse(packageJson);
  const typedPackageData = PackageJsonSchema.parse(packageData);

  const newExports = new Map<string, z.infer<typeof ExportSchema>>(
    Object.entries(typedPackageData.exports)
  );
  const actions = new Map<string, Action>();
  for (const [pathToExport, exportConfig] of Object.entries(
    typedPackageData.exports
  )) {
    if (typeof exportConfig === "string") {
      continue;
    }

    const cjsRequireImplRelPath = getExportRequireImplRelPath(exportConfig);
    if (!cjsRequireImplRelPath) {
      continue;
    }

    const requireTypesRelPath = getExportRequireTypesRelPath(exportConfig);
    if (!requireTypesRelPath) {
      continue;
    }

    // We do have CJS types for the CJS file
    if (requireTypesRelPath.endsWith(".d.cts")) {
      continue;
    }

    if (!requireTypesRelPath.endsWith(".d.ts")) {
      throw new Error(
        `Unexpected require types file in "${pathToExport}": "${requireTypesRelPath}"`
      );
    }

    const cjsRequireTypesRelPath = requireTypesRelPath.replace(
      /\.d\.ts$/,
      ".d.cts"
    );

    actions.set(`Copy ${requireTypesRelPath} to ${cjsRequireTypesRelPath}`, {
      type: "copy-file",
      from: path.join(packageDirRelPath, requireTypesRelPath),
      to: path.join(packageDirRelPath, cjsRequireTypesRelPath),
    });

    const sourceMapRelPath = requireTypesRelPath + ".map";
    const sourceMapAbsPath = path.join(packageDirRelPath, sourceMapRelPath);
    const newSourceMapRelPath = cjsRequireTypesRelPath + ".map";
    actions.set(`Write ${newSourceMapRelPath}`, {
      type: "write-file-dynamic",
      dependencyFilePaths: [sourceMapAbsPath],
      path: path.join(packageDirRelPath, newSourceMapRelPath),
      generateContents(
        dependencyFileContents: Map<string, string>
      ): string | Error | undefined {
        const sourceMapJson = dependencyFileContents.get(sourceMapAbsPath);
        if (!sourceMapJson) {
          return undefined;
        }

        const sourceMapData = JSON.parse(sourceMapJson);
        if (sourceMapData.file === path.basename(requireTypesRelPath)) {
          sourceMapData.file = path.basename(cjsRequireTypesRelPath);
        } else {
          return new Error(
            `Unexpected "file" in source map. Expected ${path.basename(
              requireTypesRelPath
            )}, got ${sourceMapData.file}`
          );
        }

        return (
          JSON.stringify(
            sourceMapData,
            undefined,
            detectIndentation(sourceMapJson)
          ) + detectEndingNewline(sourceMapJson)
        );
      },
    });

    newExports.set(pathToExport, {
      ...exportConfig,
      require: {
        types: cjsRequireTypesRelPath,
        default: cjsRequireImplRelPath,
      },
    });
  }

  const newPackageData = {
    ...packageData,
    exports: Object.fromEntries(newExports.entries()),
  };

  const packageJsonRelPath = path.join(packageDirRelPath, "/package.json");
  actions.set(`Write ${packageJsonRelPath}`, {
    type: "write-file-static",
    path: packageJsonRelPath,
    contents:
      JSON.stringify(
        newPackageData,
        undefined,
        detectIndentation(packageJson)
      ) + detectEndingNewline(packageJson),
  });

  return actions;
}
