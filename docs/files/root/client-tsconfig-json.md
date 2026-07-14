# `client/tsconfig.json`

Source: `client/tsconfig.json`

## Purpose
Root TypeScript **solution** file for the client. Contains no compiler options of its own; it is a project-references aggregator so `tsc -b` builds the two sub-projects.

## Contents
- `files`: `[]` (no direct files)
- `references`:
  - `{ "path": "./tsconfig.app.json" }` — application source.
  - `{ "path": "./tsconfig.node.json" }` — Node-context config files (e.g. `vite.config.ts`).
