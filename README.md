# run-ts

A development tool to run typescript from node modules on-the-fly.

This is useful for developing with locally linked modules, typically in a monorepo setup.

## Basic Workflow

- npm packages expected to publish with full TypeScript source code and source maps data.
- A require hook that checks the code being required for source map
- If source map exist, load it and look for source file
- If source files exist, then load and transpile them on the fly.
- Otherwise just return original code.

## Source Only Workflow

- npm package does not need to provide transpiled code
- `package.json` needs to provide configuration that tells run-ts the mapping of src dir to dist dir
- When run-ts can't find the actual required file, it will check `package.json`
  - if it finds config for it, it will map filename to original source
  - it will load the source and transform it
