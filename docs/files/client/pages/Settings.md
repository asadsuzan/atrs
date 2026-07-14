# `client/src/pages/Settings.tsx`

**Purpose / Route:** Renders at `/settings` (per App.tsx knowledge: Settings=/settings). Multi-tab preferences and workspace/system configuration page. Some tabs/cards are admin-only (`isAdmin`).

**Language / Size:** TSX / 63765 bytes

## Exports (default component + named)
- **Default export:** `Settings()` — the page component.
- No named exports.
- Module-local (not exported): `THEMES` (const array of 7 accent themes) and `SettingCard` (helper component).

## Imports (Internal components/hooks/contexts/services / External libs)
**Internal — contexts/hooks:**
- `useTheme` from `../contexts/ThemeProvider`
- `useAuth` from `../contexts/AuthContext`
- `useConfirm` from `../contexts/ConfirmContext`

**Internal — layout/UI components:**
- `PageTransition`, `staggerContainer`, `staggerItem` from `../components/layout/PageTransition`
- shadcn UI: `Tabs, TabsList, TabsTrigger, TabsContent` (`@/components/ui/tabs`); `Button` (`@/components/ui/button`); `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` (`@/components/ui/select`); `Input` (`@/components/ui/input`); `Skeleton` (`@/components/ui/skeleton`)

**Internal — services/lib:**
- `exportAllData` from `../services/export`
- `getAppConfig, updateAppConfig, testStorageConnection`, types `NavMode`, `R2TestResult` from `../services/config`
- `getToken, setToken` from `../services/api`
- `getGithubStatus, connectGithub, disconnectGithub` from `../services/github`
- `updateMe` from `../services/auth`
- `isUserMuted, setUserMute, playSound, setCachedSoundConfig` from `../lib/sound`

**External libs:**
- `framer-motion` (`motion`)
- `lucide-react` icons: Check, Download, Database, Save, Volume2, VolumeX, Play, PanelLeft, Code2, Eraser, GitBranch, Link2, Unlink, Palette, Presentation, Server, Bell, Cloud, HardDrive
- `@tanstack/react-query` (`useQuery, useMutation, useQueryClient`)
- `react` (`useState, useEffect, useRef`)
- `sonner` (`toast`)

## Component tree & sub-components defined in file
- `SettingCard({ icon, title, description, children })` — consistent card wrapper: `<section>` with an icon chip (`Icon`), title `<h3>`, optional description, then children. Used throughout every tab.
- `Settings()` default component — renders `PageTransition > Tabs` with `TabsList` (6 triggers) and one `TabsContent` per tab. Each panel is composed of `SettingCard`s.

## State (useState/useReducer), Refs, Context consumed
**Context consumed:**
- `useTheme()` → `theme, setTheme, isDark, setIsDark, isAutoDark, setIsAutoDark`
- `useAuth()` → `isAdmin, user, refreshMe`
- `useConfirm()` → `confirm`
- `useQueryClient()` → `queryClient`

**useState:**
- `tab` (default `'appearance'`) — active tab.
- `isMuted` (init `isUserMuted()`) — per-device mute flag.
- `configForm` `{ serverPort:'5000', mongodbUri:'' }` — System config.
- `navMode: NavMode` (`'expanded'`) — sidebar nav mode.
- `changelogGenForm` `{ model:'qwen2.5-coder', ollamaMode:'local', ollamaCloudUrl:'', ollamaCloudKey:'', ollamaCloudKeySet:false }` — Git Changelog Generator AI settings.
- `staleDays` (`7`) — stale product reminder window.
- `brandingForm` `{ companyName, logoUrl, accentColor, accentDynamic, thankYouEnabled, thankYouTitle, thankYouMessage }`.
- `presenterForm` `{ name, jobTitle }`.
- `storageForm` `{ provider:'local'|'r2', accountId, bucket, publicBaseUrl, accessKeyId, secretAccessKey, secretAccessKeySet }`.
- `storageTestResult: R2TestResult | null`.
- `isRestarting` (`false`) — server-restart in progress UI.
- `githubToken` (`''`) — write-only PAT input.
- `soundsForm` `{ enabled:true, successSound:'synth-success', deleteSound:'synth-delete', errorSound:'synth-error', notificationSound:'synth-notification', clickSound:'synth-click', volume:0.5 }`.

**useRef:**
- `restartPollRef: ReturnType<typeof setInterval> | null` — holds the health-poll interval so it can be cleared on unmount.

## Hooks & Effects — for each useEffect: deps, purpose, WHY
1. `useEffect(() => () => { if (restartPollRef.current) clearInterval(...) }, [])` — deps `[]`. Cleanup-only effect. WHY: clears the restart health-poll interval if the user navigates away mid-restart, avoiding setState-after-unmount and orphaned `/api/health` requests.
2. `useEffect(..., [configData])` — deps `[configData]`. WHY: when the `appConfig` query resolves, hydrate all admin/config forms from server state — `configForm` (server.port/mongodbUri), `navMode` (navigation.mode), `changelogGenForm` (prefers `configData.changelogGen`, falls back to legacy `configData.codeTracker`), `staleDays` (staleAlert.days), `brandingForm` (branding.*), `storageForm` (storage.provider + storage.r2.*), `soundsForm` (sounds.*). Write-only secrets (`ollamaCloudKey`, `secretAccessKey`) are left blank; only `*Set` booleans are read back.
3. `useEffect(..., [user])` — deps `[user]`. WHY: loads presenter fields (`name`, `jobTitle`) from the signed-in user object.

## Data fetching (services/api endpoints; react-query keys/mutations)
**Queries:**
- `['appConfig']` → `getAppConfig` (`retry:false`, `enabled: isAdmin`). Returns `configData` with `isLoading`/`refetch`.
- `['github-status']` → `getGithubStatus` (`retry:false`). Returns `githubStatus`.

**Mutations:**
- `connectGithubMutation` → `connectGithub`. onSuccess: playSound success, toast, clear token, invalidate `['github-status']`.
- `disconnectGithubMutation` → `disconnectGithub`. onSuccess: toast, invalidate `['github-status']`.
- `saveMutation` → `updateAppConfig`. onSuccess branches by which key was in `variables` (sounds / navigation / changelogGen / branding / storage / staleAlert), each toasts and invalidates a targeted query key (`nav-settings`, `ollama-models`, `branding`, `mediaList`, `staleProducts`) and calls `refetch()` WITHOUT restarting. The fallback branch (server/db config) sets `isRestarting=true` and polls `fetch('/api/health')` every 1500ms up to 30 attempts until `res.ok`, then clears the interval and toasts "Server is back online!".
- `storageTestMutation` → `testStorageConnection`. onSuccess: sets `storageTestResult`; success/error sound + toast.
- `presenterMutation` → `updateMe`. onSuccess: playSound, toast, `await refreshMe()`.

**Direct/other data ops:**
- `exportAllData()` (handleExport) — full DB JSON export.
- `fetch('/api/health')` — raw fetch used in the restart poll loop.

## Event handlers & key functions — purpose, algorithm, side effects
- `handleExport` — awaits `exportAllData()`; success/error sound + toast.
- `handleSaveConfig(e)` — preventDefault; validates serverPort & mongodbUri present; `saveMutation.mutate({ server: { port, mongodbUri } })` (triggers restart flow).
- `handleSaveSounds(e)` — mutate `{ sounds: soundsForm }`.
- `handleSaveNav()` — mutate `{ navigation: { mode: navMode } }`.
- `handleSaveChangelogGen()` — mutate `{ changelogGen: changelogGenForm }`.
- `validateStorageForm()` — checks accountId, bucket, publicBaseUrl, accessKeyId, and secret (blank OK if `secretAccessKeySet`); requires publicBaseUrl to start with http(s)://. Returns bool, toasts missing fields.
- `storageTestMutation` / `handleTestStorage()` — validates then mutates test with trimmed R2 fields.
- `setR2Field(patch)` — patches storageForm AND resets `storageTestResult` to null (editing invalidates prior test).
- `handleSaveStorage()` — if r2, validate; mutate `{ storage: { provider, r2:{...trimmed} } }`.
- `handleSaveStale()` — clamps days to [1,365] (rounds, default 7), sets state, mutate `{ staleAlert: { days } }`.
- `handleSavePresenter()` — mutate `updateMe` with trimmed name (or undefined) and jobTitle.
- `handleSaveBranding()` — mutate `{ branding: {...trimmed strings + booleans} }`.
- `handleClearLocalData()` — `confirm(...)` dialog; preserves auth token, `localStorage.clear()` + `sessionStorage.clear()`, restores token via `setToken`, `queryClient.clear()`, toast, reload after 700ms.
- `handleToggleMute()` — flips `isMuted`, calls `setUserMute`, plays click sound when unmuting.
- `previewSound(event)` — `playSound(event)` for success/delete/error/notification/click.

## Rendered UI sections (tabs/panels) and what each does
`TabsList` triggers: Appearance, Sound, Integrations, Presentation, System (admin-only), Data.

1. **Appearance** — SettingCard "Theme mode": Auto Dark Mode toggle (`setIsAutoDark`) and Dark Mode toggle (`setIsDark`, disabled when auto). SettingCard "Your themes": grid of 7 `THEMES` accent-theme mockup cards; click → `setTheme(id)`. Config keys edited: theme, isDark, isAutoDark (via ThemeProvider — client-side, not app config).
2. **Sound** — SettingCard "Sound Effects": per-device mute toggle + preview buttons (success/delete/error/notification/click). Admin-only SettingCard "Global Sound Configuration" (form → `handleSaveSounds`): enabled toggle, volume range slider, and text inputs for successSound/deleteSound/errorSound/notificationSound/clickSound. Config keys: `sounds.{enabled, volume, successSound, deleteSound, errorSound, notificationSound, clickSound}`.
3. **Integrations** — SettingCard "GitHub Integration": if connected shows `@login`/connectedAt + Disconnect; else a PAT password form → `connectGithubMutation`. Admin-only SettingCard "Git Changelog Generator": Ollama Mode select (local/cloud), model text input, and (cloud only) Ollama Cloud URL + Cloud API Key inputs; Save → `handleSaveChangelogGen`. Config keys: `changelogGen.{model, ollamaMode, ollamaCloudUrl, ollamaCloudKey}` (github handled per-user via github service, not app config).
4. **Presentation** — SettingCard "Presenter info": Display name + Job title inputs, Save → `handleSavePresenter` (user profile via `updateMe`; keys `name`, `jobTitle`). Admin-only SettingCard "Branding": Company name, Logo URL; "Thank you" closing slide toggle + Heading + Message; Accent color mode (Fixed vs Dynamic) + color picker/text + Clear + logo preview; Save → `handleSaveBranding`. Config keys: `branding.{companyName, logoUrl, accentColor, accentDynamic, thankYouEnabled, thankYouTitle, thankYouMessage}`.
5. **System** (admin-only) — SettingCard "Navigation": select navMode (expanded/collapsed/disabled) → `handleSaveNav` (`navigation.mode`). SettingCard "Product Update Reminders": stale days number input → `handleSaveStale` (`staleAlert.days`). SettingCard "Media Storage": provider selector (local vs Cloudflare R2) + R2 fields (Account ID, Bucket, Public base URL, Access Key ID, Secret Access Key) + Test Connection + Save → `handleSaveStorage` (`storage.provider`, `storage.r2.{accountId, bucket, publicBaseUrl, accessKeyId, secretAccessKey}`). SettingCard "System Configuration": shows skeleton while loading, restart spinner while `isRestarting`, else form for Server Port + MongoDB URI → `handleSaveConfig` (`server.{port, mongodbUri}`; triggers backend restart).
6. **Data** — SettingCard "Clear local data": Clear data button → `handleClearLocalData`. Admin-only SettingCard "Full Database Export": Export Data button → `handleExport`.

## Important logic & design patterns
- **Write-only secrets:** `ollamaCloudKey` and R2 `secretAccessKey` are never returned by the API; only `*Set` booleans indicate a stored value. Inputs stay blank with a "saved — enter a new key to replace" placeholder; validation treats blank as valid when `*Set` is true.
- **Restart-vs-no-restart branching:** `saveMutation.onSuccess` distinguishes config sections; only server/db changes restart the backend and poll `/api/health`. All others invalidate a specific query key.
- **Legacy fallback:** changelog generator config reads `configData.changelogGen || configData.codeTracker` for configs saved before a rename.
- **Test-then-save for R2:** editing any R2 field clears the previous test result via `setR2Field`.
- **Admin gating:** `isAdmin` conditionally renders the System tab and several cards (Global Sound, Changelog Generator, Branding, DB Export); `appConfig` query is `enabled: isAdmin`.
- Staggered entrance animations via framer-motion `staggerContainer`/`staggerItem`.

## Relationships (services called -> backend routes; contexts used)
- `services/config` → `getAppConfig` / `updateAppConfig` / `testStorageConnection` (app config & R2 test backend routes).
- `services/github` → `getGithubStatus` / `connectGithub` / `disconnectGithub` (per-user GitHub PAT).
- `services/auth` → `updateMe` (current-user profile).
- `services/export` → `exportAllData` (DB dump).
- `services/api` → `getToken` / `setToken` (auth token persistence).
- `lib/sound` → mute state, sound playback, cached sound config.
- Raw `fetch('/api/health')` for restart polling.
- Contexts: ThemeProvider (theme/dark mode), AuthContext (isAdmin/user/refreshMe), ConfirmContext (confirm dialog).
