# `package.json` (root)

Source: `package.json`

## Purpose
Root manifest of the ATRS monorepo. Declares npm **workspaces** (`client`, `server`) and provides orchestration scripts that fan out to the workspaces. `"private": true` prevents accidental publish.

## Fields
| Field | Value |
|-------|-------|
| `name` | `atrs-monorepo` |
| `version` | `1.0.0` |
| `description` | `Automated Townhall Report System` |
| `private` | `true` |
| `workspaces` | `["client", "server"]` |

## Scripts (exact commands)
| Script | Command | What it does |
|--------|---------|--------------|
| `dev` | `concurrently -n server,client -c blue,green "npm run dev -w server" "npm run dev -w client"` | Runs server + client dev servers in parallel with colored labels. |
| `dev:client` | `npm run dev -w client` | Client dev server only. |
| `dev:server` | `npm run dev -w server` | Server dev server only. |
| `build` | `npm run build -w client && npm run build -w server` | Builds client then server. |
| `build:client` | `npm run build -w client` | Client build only (used by Vercel — see `vercel.json`). |
| `build:server` | `npm run build -w server` | Server build only. |
| `start` | `npm run start -w server` | Starts compiled server. |
| `lint` | `npm run lint -w client` | Lints client. |
| `test` | `npm run test -w server` | Runs server tests. |
| `test:watch` | `npm run test:watch -w server` | Server tests in watch mode. |

## Dependencies
### Runtime (`dependencies`)
| Package | Version | Role |
|---------|---------|------|
| `gif.js` | `^0.2.0` | GIF encoding (client-side media generation). |
| `gifuct-js` | `^2.1.2` | GIF decoding/parsing. |

### Dev (`devDependencies`)
| Package | Version | Role |
|---------|---------|------|
| `concurrently` | `^8.2.2` | Runs multiple npm scripts in parallel (used by `dev`). |

Note: the two runtime deps live at root (not in `client`), presumably consumed by client code via the hoisted workspace `node_modules`. Their exact import sites are not documented here.
