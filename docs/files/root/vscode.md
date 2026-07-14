# `.vscode/`

Source: directory `.vscode/`

## Contents
Single file:

### `.vscode/settings.json`
```json
{
    "liveServer.settings.port": 5501
}
```
Sets the port for the VS Code "Live Server" extension to `5501`. Workspace-scoped editor setting only; no effect on the app build/runtime.

Note: `.vscode/` is listed in the root `.gitignore`, so this directory is normally not tracked.
