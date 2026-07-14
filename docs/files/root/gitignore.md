# `.gitignore` (root)

Source: `.gitignore`

## Purpose
Excludes dependencies, build output, secrets, caches, OS/editor cruft, and specific project files from git.

## Ignored entries (grouped as in file)
- **Dependencies**: `node_modules/`, `.pnp`, `.pnp.js`, `atrs.bundle`, `changelog_workflow.md`, `CHANGELOG.md`
- **Build output**: `dist/`, `build/`, `out/`, `.next/`, `.nuxt/`
- **Logs**: `logs`, `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `yarn-error.log*`, `pnpm-debug.log*`
- **Environment variables**: `.env`
- **Runtime app configuration** (comment: written by the Settings page; may hold deployment-specific values — use `app.config.example.json` as the template): `app.config.json`, `.env.local`, `.env.development.local`, `.env.test.local`, `.env.production.local`
- **Sensitive files / keys**: `*.pem`, `*.key`, `*.cert`, `*.crt`, `secrets/`, `private/`, `credentials.json`, `client_secret.json`
- **Cache**: `.npm`, `.eslintcache`, `.stylelintcache`, `*.tsbuildinfo`, `.parcel-cache`
- **OS generated files**: `.DS_Store`, `.DS_Store?`, `._*`, `.Spotlight-V100`, `.Trashes`, `ehthumbs.db`, `Thumbs.db`, `desktop.ini`
- **IDEs and editors**: `.vscode/`, `.idea/`, `*.suo`, `*.ntvs*`, `*.njsproj`, `*.sln`, `*.sw?`, `*.bak`, `*~`
- **Misc**: `uploads/`, `coverage/`, `.nyc_output/`, `upcoming-features.md`, `WORKFLOW.md`, `AUTH-PLAN.md`, `implementation_plan.md`
- **Claude Code local settings**: `.claude/settings.local.json`
- **Vercel**: `.vercel`
- **temp files**: `server/_tmp_truedup.ts`

## Notable
Several human-written markdown docs are git-ignored (`changelog_workflow.md`, `CHANGELOG.md`, `upcoming-features.md`, `WORKFLOW.md`, `AUTH-PLAN.md`, `implementation_plan.md`). Both `.env` and `app.config.json` are ignored (hold secrets/deployment values).
