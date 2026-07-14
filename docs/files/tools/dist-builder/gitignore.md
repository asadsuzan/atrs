# `tools/dist-builder/.gitignore`

**Purpose:** Git ignore rules for the dist-builder package.

**Language / Size:** Text / 24 bytes

## Entries
- `node_modules`
- `dist` (compiled TypeScript output)
- `*.zip` (produced plugin packages)

## Relationships & pipeline order
Keeps installed deps, the `tsc` build output, and generated zips out of version control.
