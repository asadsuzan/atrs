# `client/eslint.config.js`

Source: `client/eslint.config.js`

## Purpose
ESLint **flat config** for the client. Applies recommended JS + TypeScript rules plus React Hooks and React Refresh rules.

## Structure
- Imports: `@eslint/js`, `globals`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `typescript-eslint`, and `defineConfig`/`globalIgnores` from `eslint/config`.
- `globalIgnores(['dist'])` — ignore build output.
- Rule block:
  - `files`: `['**/*.{ts,tsx}']`
  - `extends`:
    - `js.configs.recommended`
    - `tseslint.configs.recommended`
    - `reactHooks.configs.flat.recommended`
    - `reactRefresh.configs.vite`
  - `languageOptions.globals`: `globals.browser`
