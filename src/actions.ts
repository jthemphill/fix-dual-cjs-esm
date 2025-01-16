/**
 * Copy a static string to a file.
 */
export interface WriteFileStaticAction {
  type: "write-file-static";
  path: string;
  contents: string;
}

/**
 * Read the contents of `dependencyFilePaths` into a Map from path to contents, then run `generateContents` on that Map and write the result to `path`.
 */
export interface WriteFileDynamicAction {
  type: "write-file-dynamic";
  path: string;
  dependencyFilePaths: string[];
  generateContents: (
    dependencyFileContents: Map<string, string>
  ) => string | Error | undefined;
}

/**
 * Copy a file from one path to another.
 */
export interface CopyFileAction {
  type: "copy-file";
  from: string;
  to: string;
}

export type Action =
  | WriteFileStaticAction
  | WriteFileDynamicAction
  | CopyFileAction;
