# `client/src/lib/sound.ts`
**Purpose:** UI sound-effects module. Plays short cues for app events, honoring a per-user mute and an admin-controlled global config; supports either audio-file URLs or zero-asset Web Audio synthesized presets.
**Language / Size:** TypeScript / 6250 bytes

## Exports
- `SoundEvent` — type: `'success' | 'delete' | 'error' | 'notification' | 'click'`.
- `SoundConfig` — interface (see below).
- `isUserMuted(): boolean` / `setUserMute(mute: boolean)` — per-user mute in localStorage.
- `getSoundConfig(): SoundConfig` — cached-or-default config.
- `setCachedSoundConfig(config: SoundConfig)` — cache server config in localStorage.
- `playSound(event: SoundEvent)` — play the cue for an event.

## API / Signature
- `SoundConfig`: `{ enabled: boolean; successSound: string; deleteSound: string; errorSound: string; notificationSound: string; clickSound: string; volume: number /*0–1*/ }`. Each `*Sound` is a URL/path or a preset name (e.g. `'synth-success'`).

## Imports (Internal / External)
None (uses browser `localStorage`, `Audio`, and `AudioContext`/`webkitAudioContext`).

## Behavior / Implementation
- **Mute:** `isUserMuted` reads `USER_MUTE_KEY === 'true'`; `setUserMute` writes `String(mute)`.
- **Config:** `getSoundConfig` reads `GLOBAL_CONFIG_CACHE_KEY`, JSON-parses and spreads over `DEFAULT_CONFIG` (parse errors swallowed → default). `setCachedSoundConfig` writes JSON.
- **`playSound(event)`**: returns early if user-muted; loads config; returns if `!config.enabled` (admin global off); maps `event`→configured sound string; returns if empty. If the string looks like a file (`startsWith('http')` or `'/'`, or ends with `.mp3`/`.wav`/`.ogg`) it constructs `new Audio(soundType)`, sets `volume`, and `play().catch()` (autoplay-policy rejections ignored); construction errors are `console.warn`ed. Otherwise it calls `playSynthPreset(soundType, volume)`.
- **`playSynthPreset(preset, volume)`**: creates an `AudioContext` (falls back to `webkitAudioContext`; returns if neither), one `OscillatorNode`+`GainNode`, and shapes frequency/gain envelopes per preset:
  - `synth-success` — rising sine chime D5(587.33)→A5(880).
  - `synth-delete` — descending triangle 280→70 Hz whoosh.
  - `synth-error` — double sawtooth buzz at 140 Hz.
  - `synth-notification` — bright sine double chime E5(659.25)→B5(987.77).
  - `synth-click` — quick sine blip 1500→300 Hz.
  - `default` — simple 440 Hz sine beep.
  Envelopes use `setValueAtTime` / `linearRampToValueAtTime` / `exponentialRampToValueAtTime` scaled by `volume`. Errors are `console.error`ed.

## Data structures / Types / Constants
- `DEFAULT_CONFIG`: `enabled: true`, all `*Sound` set to the matching `synth-*` preset, `volume: 0.5`.
- `USER_MUTE_KEY = 'atrs_user_sound_mute'`.
- `GLOBAL_CONFIG_CACHE_KEY = 'atrs_global_sound_config_cache'`.

## Relationships
- Called throughout the app for feedback (e.g. `contexts/WpImportContext` plays `'success'`/`'error'` on preview/import outcomes; toasts, CRUD flows).
- The cached global config is populated elsewhere (settings/admin flow) via `setCachedSoundConfig` from server data.

## Edge cases & known limitations
- Two independent gates: per-user mute (client) and global `enabled` (admin) — both must allow playback.
- Autoplay policy: audio may be blocked until the user interacts with the page; such rejections are silently caught.
- Each synth cue creates a fresh `AudioContext` that isn't explicitly closed (relies on GC); may accrue contexts under heavy use.
- Type-vs-URL detection is heuristic (prefix/extension based).
