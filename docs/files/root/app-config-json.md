# `app.config.json`

Source: `app.config.json` (git-ignored; runtime config written by the Settings page)

## Purpose
Runtime application configuration, distinct from `.env`. Comment in `.gitignore` states it is "written by the Settings page; may hold deployment-specific values — use `app.config.example.json` as the template". It is git-ignored and listed in `.vercelignore`. Read at runtime by the server (`server/src/utils/appConfig.ts`).

## Structure (keys and their configured values in this file)
| Section | Key | Value in file |
|---------|-----|---------------|
| `server` | `port` | `3000` |
| `server` | `mongodbUri` | MongoDB Atlas connection string (contains embedded credentials — treat as secret) |
| `sounds` | `enabled` | `true` |
| `sounds` | `successSound`/`deleteSound`/`errorSound`/`notificationSound`/`clickSound` | `synth-*` sound names |
| `sounds` | `volume` | `1` |
| `navigation` | `mode` | `disabled` |
| `changelogGen` | `model` | `qwen3-coder:480b` |
| `changelogGen` | `ollamaMode` | `cloud` |
| `changelogGen` | `ollamaCloudUrl` | `https://ollama.com/api/generate` |
| `changelogGen` | `ollamaCloudKey` | `""` (blank; falls back to env) |
| `staleAlert` | `days` | `365` |
| `branding` | `companyName` | `bPlugins` |
| `branding` | `logoUrl` | `""` |
| `branding` | `accentColor` | `#4400c2` |
| `branding` | `accentDynamic` | `false` |
| `branding` | `thankYouEnabled` | `true` |
| `branding` | `thankYouTitle` | `Thank You All` |
| `branding` | `thankYouMessage` | `Have  a nich day` |
| `storage` | `provider` | `r2` |
| `storage.r2` | `accountId` | `""` (blank; credentials come from env) |
| `storage.r2` | `bucket` | `atrs-media` |
| `storage.r2` | `publicBaseUrl` | `https://pub-c41c3c25cfd44e2795c98a2b2c1e1227.r2.dev` |
| `storage.r2` | `accessKeyId` / `secretAccessKey` | `""` (blank; from env) |

## Note
This is the live/committed-locally instance (checked out on disk). Sensitive R2 credentials are intentionally left blank here and supplied via `.env` (`R2_*`). See `app-config-example-json.md` for the template defaults.
