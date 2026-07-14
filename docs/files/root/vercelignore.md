# `.vercelignore`

Source: `.vercelignore`

## Purpose
Excludes files from the Vercel deployment upload. File comment explains patterns are **anchored to repo root** (leading `/`) so an unanchored `tools` would not accidentally match nested paths like `client/src/components/tools`.

## Ignored entries
| Pattern | Reason |
|---------|--------|
| `/uploads` | Local uploaded media (not deployed). |
| `/tools` | Root tools directory. |
| `/atrs.bundle` | Repo bundle artifact. |
| `/app.config.json` | Runtime app config with deployment values. |
| `/.env` | Secrets. |
