# fix-dual-cjs-esm-dep

This script can help you fix errors like this one:

```
ts-cjs-repro/packages/app % pnpm build

> app@ build /Users/jhemphill/oss/ts-cjs-repro/packages/app
> tsc

index.ts:1:23 - error TS1479: The current file is a CommonJS module whose imports will produce 'require' calls; however, the referenced file is an ECMAScript module and cannot be imported with 'require'. Consider writing a dynamic 'import("lib")' call instead.
  To convert this file to an ECMAScript module, change its file extension to '.mts', or add the field `"type": "module"` to '/Users/jhemphill/oss/ts-cjs-repro/packages/app/package.json'.

1 import * as dual from "lib";
                        ~~~~~

Found 1 error in index.ts:1
```

You can try cloning https://github.com/jthemphill/ts-cjs-repro and run this on the `packages/lib` directory there to see how this script fixes the problem.

This script is intended for band-aiding your project's broken dependencies, via commands like [`pnpm patch`](https://pnpm.io/cli/patch). It shouldn't be used to publish packages. If you're a package author and would like to publish a dual ESM/CJS package, use a tool like https://github.com/isaacs/tshy instead to build your package correctly in the first place!

## Okay, why?

Most modern NPM packages support both the CommonJS and ECMAScript Module format. These packages typically export a `.js` or `.mjs` file, which you can import asynchronously, and they also export a `.cjs` file, which CJS files can `require()` synchronously.

Most modern packages also provide declaration files, in the form of `.d.ts` files, which tell TypeScript what types the exported `.cjs` and `.mjs` files correspond to.

But some packages try to make the same `.d.ts` file do double duty, representing both the contents of their exported `.cjs` and `.mjs` file. [According to the TypeScript devs](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html#notes-on-dual-emit-solutions), this is an error:

> A single TypeScript compilation (whether emitting or just type checking) assumes that each input file will only produce one output file.

See [Are the Types Wrong?/👺 Masquerading as ESM](https://github.com/arethetypeswrong/arethetypeswrong.github.io/blob/main/docs/problems/FalseESM.md) for more information.

## Building and Running

To install dependencies:

```sh
bun install
```

To run:

```sh
bun run src/main.ts /path/to/package/directory
```

To test:

```sh
bun test
```

This project was created using `bun init` in bun v1.1.43. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
