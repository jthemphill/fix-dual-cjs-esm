import { test, expect } from "bun:test";
import * as path from "node:path";

import { fixCommonJsTypes } from "./fix";

const PACKAGE_DIR_PATH = "/path/to/package" as const;

const PACKAGE_JSON_BROKEN = {
  version: "1.0.0",
  type: "module",
  exports: {
    ".": {
      types: "./types/index.d.ts",
      import: "./esm/index.js",
      require: "./cjs/index.cjs",
    },
  },
} as const;

const PACKAGE_JSON_FIXED = {
  version: "1.0.0",
  type: "module",
  exports: {
    ".": {
      types: "./types/index.d.ts",
      import: "./esm/index.js",
      require: {
        types: "./types/index.d.cts",
        default: "./cjs/index.cjs",
      },
    },
  },
} as const;

const SOURCE_MAP = {
  version: 3,
  file: "index.d.ts",
  sourceRoot: "",
  sources: ["../src/index.ts"],
  names: [],
  mappings: "",
} as const;

test("generates a fix", () => {
  const whitespace = "  ";
  const actions = fixCommonJsTypes(
    PACKAGE_DIR_PATH,
    JSON.stringify(PACKAGE_JSON_BROKEN, undefined, whitespace)
  );

  expect(actions.get("Copy ./types/index.d.ts to ./types/index.d.cts")).toEqual(
    {
      type: "copy-file",
      from: path.join(PACKAGE_DIR_PATH, "types/index.d.ts"),
      to: path.join(PACKAGE_DIR_PATH, "types/index.d.cts"),
    }
  );

  const writeSourceMapAction = actions.get("Write ./types/index.d.cts.map");
  expect(writeSourceMapAction).toEqual({
    type: "write-file-dynamic",
    dependencyFilePaths: [path.join(PACKAGE_DIR_PATH, "types/index.d.ts.map")],
    path: path.join(PACKAGE_DIR_PATH, "types/index.d.cts.map"),
    generateContents: expect.any(Function),
  });
  if (writeSourceMapAction?.type !== "write-file-dynamic") {
    throw new TypeError(
      `Expected 'write-file-dynamic', got '${writeSourceMapAction?.type}'`
    );
  }
  const newSourceMapContents = writeSourceMapAction.generateContents(
    new Map([
      [
        path.join(PACKAGE_DIR_PATH, "types/index.d.ts.map"),
        JSON.stringify(SOURCE_MAP, undefined, whitespace),
      ],
    ])
  );
  expect(newSourceMapContents).toBe(
    JSON.stringify(
      {
        ...SOURCE_MAP,
        file: "index.d.cts",
      },
      undefined,
      whitespace
    )
  );

  expect(
    actions.get(`Write ${path.join(PACKAGE_DIR_PATH, "package.json")}`)
  ).toEqual({
    type: "write-file-static",
    path: path.join(PACKAGE_DIR_PATH, "package.json"),
    contents: JSON.stringify(PACKAGE_JSON_FIXED, undefined, whitespace),
  });

  expect(actions.size).toBe(3);
});
