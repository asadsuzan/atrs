# `app.config.example.json`

Source: `app.config.example.json`

## Purpose
Template for `app.config.json` (the git-ignored runtime app config). Ships safe local-development defaults.

## Structure and default values
| Section | Key | Default |
|---------|-----|---------|
| `server` | `port` | `3000` |
| `server` | `mongodbUri` | `mongodb://localhost:27017/atrs?retryWrites=true` |
| `sounds` | `enabled` | `true` |
| `sounds` | `successSound`/`deleteSound`/`errorSound`/`notificationSound`/`clickSound` | `synth-success` / `synth-delete` / `synth-error` / `synth-notification` / `synth-click` |
| `sounds` | `volume` | `0.5` |
| `navigation` | `mode` | `expanded` |
| `changelogGen` | `model` | `qwen2.5-coder` |
| `changelogGen` | `ollamaMode` | `local` |
| `changelogGen` | `ollamaCloudUrl` | `""` |
| `changelogGen` | `ollamaCloudKey` | `""` |
| `staleAlert` | `days` | `7` |
| `branding` | `companyName` | `""` |
| `branding` | `logoUrl` | `""` |
| `branding` | `accentColor` | `""` |
| `branding` | `accentDynamic` | `false` |
| `branding` | `thankYouEnabled` | `true` |
| `branding` | `thankYouTitle` | `""` |
| `branding` | `thankYouMessage` | `""` |
| `storage` | `provider` | `local` |
| `storage.r2` | `accountId`/`bucket`/`publicBaseUrl`/`accessKeyId`/`secretAccessKey` | all `""` |

## Contrast with live `app.config.json`
Example defaults to local MongoDB, `local` storage provider, `expanded` navigation, `qwen2.5-coder` local Ollama, and 7-day stale alerts — versus the live file's Atlas URI, `r2` storage, `disabled` navigation, `qwen3-coder:480b` cloud model, and 365-day stale window.
