# `server/src/utils/crypto.ts`
**Purpose:** Symmetric AES-256-GCM encryption of secrets at rest (GitHub PAT, R2 secret key, Ollama Cloud key), with a "sealed" prefix convention.
**Language / Size:** TypeScript / 3178 bytes

## Exports
- `function encryptSecret(plaintext): string`
- `function decryptSecret(payload): string`
- `const SEAL_PREFIX = 'enc:v1:'`
- `function sealSecret(plaintext): string`
- `function isSealedSecret(value): boolean`
- `function unsealSecret(value): string`

## Imports (Internal / External)
- External: `crypto` (node builtin). No internal imports.

## Functions
### `getKey(): Buffer` (private)
Returns cached key if present. Reads `process.env.GITHUB_TOKEN_SECRET || process.env.JWT_SECRET`; throws if neither set. Derives a 32-byte key via `crypto.scryptSync(secret, KEY_SALT, 32)` where `KEY_SALT = 'atrs:secret-box:v1'`, caches it. WHY fallback: existing deployments work without new config; rotating the secret invalidates stored tokens (users reconnect).

### `encryptSecret(plaintext): string`
Generates 12-byte random IV (GCM nonce). `createCipheriv('aes-256-gcm', key, iv)`, updates+finalizes (utf8), gets 16-byte auth tag. Returns base64 of `iv | authTag | ciphertext` concatenated. GCM authenticates ciphertext → tamper detection.

### `decryptSecret(payload): string`
Base64-decodes; slices IV (0..12), tag (12..28), ciphertext (28..). `createDecipheriv`, `setAuthTag`, decrypt to utf8. Throws if malformed or tampered (auth tag mismatch).

### `sealSecret(plaintext): string`
Returns '' for empty input; else `SEAL_PREFIX + encryptSecret(plaintext)`.

### `isSealedSecret(value): boolean`
`value.startsWith(SEAL_PREFIX)`.

### `unsealSecret(value): string`
If not sealed, returns input unchanged (legacy plaintext / env value). If sealed, tries `decryptSecret(value without prefix)`; on failure logs "Failed to decrypt a stored secret; re-enter it in Settings." and returns '' — callers degrade gracefully instead of throwing (handles rotated key / tampered payload).

## Types / Constants
- `ALGORITHM = 'aes-256-gcm'`, `IV_LENGTH = 12`, `KEY_SALT = 'atrs:secret-box:v1'`, `SEAL_PREFIX = 'enc:v1:'`, `cachedKey`.

## Important logic & design patterns
Authenticated encryption (GCM). Key cached per-process, scrypt-derived. The `enc:v1:` prefix distinguishes sealed values from legacy plaintext or env-provided secrets, enabling gradual migration. Graceful degradation on decrypt failure.

## Environment variables / config read
- `GITHUB_TOKEN_SECRET` (preferred) or `JWT_SECRET` (fallback) — required to derive the key.

## Relationships (who uses it)
`r2Storage.ts` (aliases `sealSecret`/`isSealedSecret`/`unsealSecret` for R2 secret key), `ollama.ts` (`unsealSecret` for cloud key), `appConfig.ts` seeding logic references sealed R2 secret, and GitHub integration for storing PATs.
