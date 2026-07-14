# `server/src/services/AuthService.ts`
**Purpose:** Authentication and self-service account flows: register (pending approval), login (JWT issue), profile update, email check, password-reset request, and change-password (with token reissue).
**Language / Size:** TypeScript / 5918 bytes

## Exports
- `class AuthService`

## Imports (Internal / External)
Internal: `User` + `hashPassword` (../models/User), `signToken` (../middlewares/auth), `createHttpError` (../utils/httpError), `notificationManager` (./NotificationManager), `Notification` (../models/Notification).
External: `bcrypt` (bcryptjs).

Module constant: `DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing-equalization', 10)` — a precomputed hash used for timing-equalized comparison when the email is unknown (mitigates timing-based user enumeration).

## Functions / Methods

### `register(data: { name; email; password }): Promise<user JSON>`
Algorithm: normalize `email = data.email.toLowerCase().trim()`; `User.findOne({email})` → 409 `'An account with this email already exists'` if present; `passwordHash = await hashPassword(data.password)`; `User.create({ name: trimmed, email, passwordHash, role:'user', status:'pending', isRoot:false })`. Then notify all admins: `User.find({ $or:[{role:'admin'},{isRoot:true}] })`, for each build a `Notification` (type 'system', title 'New User Registration', link '/users'), save, and `notificationManager.sendToUser(admin._id, 'notification', notif)`. Returns `user.toJSON()`.
WHY: new accounts start `pending` and require admin approval.

### `login(data: { email; password }): Promise<{ token, user }>`
Algorithm: normalize email; `User.findOne({email})`; if no user → run `bcrypt.compare(data.password, DUMMY_HASH)` (spend equal time) then throw 401 `'Invalid email or password'`; else `user.comparePassword(data.password)` → 401 if false; if `status==='pending'` → 403 `'awaiting administrator approval'`; if `status==='suspended'` → 403 `'account has been disabled'`; else `signToken({ id, role, isRoot, name, email })`; returns `{ token, user: user.toJSON() }`.
Error handling: uniform 401 message for both unknown email and wrong password to prevent enumeration.

### `me(userId): Promise<user JSON>`
`User.findById(userId)`; 404 if missing; returns toJSON.

### `updateMe(userId, data: { name?; jobTitle? }): Promise<user JSON>`
Builds update: `name` set only if non-empty trimmed string; `jobTitle` set if string (trimmed, may be empty). `User.findByIdAndUpdate(userId, update, { new:true, runValidators:true })`; 404 if missing. Returns toJSON.

### `checkEmail(rawEmail): Promise<{ exists, name? }>`
Normalizes email; `User.findOne({email}).select('name isRoot')`; returns `{ exists:false }` if none, else `{ exists:true, name }`. Used by forgot-password flow.

### `requestPasswordReset(rawEmail): Promise<{ requested: true }>`
Normalize email; `User.findOne({email})`; if user AND not root: set `passwordResetRequested = true`, `passwordResetRequestedAt = new Date()`, save; `notificationManager.sendToAdmins('password-reset-request', {...})`. Always returns `{ requested: true }`.
WHY: constant response so endpoint can't probe which accounts requested a reset; root accounts excluded.

### `changePassword(userId, currentPassword, newPassword): Promise<{ success, token }>`
`User.findById` → 404 if missing; `comparePassword(currentPassword)` → 400 `'Current password is incorrect'` if false; set `passwordHash = await hashPassword(newPassword)`, `mustChangePassword = false`, `passwordChangedAt = new Date()`; save; issue fresh `signToken({...})`. Returns `{ success:true, token }`.
WHY: `passwordChangedAt` invalidates JWTs issued before now (enforced by `requireActive` middleware); a fresh token keeps the current user signed in while old tokens are rejected.

## Types / Constants
- `DUMMY_HASH` (bcrypt hash, cost 10) for timing equalization.

## Important logic (auth token/password flows)
- Password hashing via model `hashPassword`; verification via model `comparePassword` (bcrypt).
- JWT via `signToken` (middlewares/auth) with payload `{ id, role, isRoot, name, email }`.
- Timing-attack mitigation on login for unknown emails.
- `passwordChangedAt` acts as a token-invalidation cutoff; set on self change-password and (per UserService) on admin reset.
- Admin approval gate: `status` pending/suspended blocks login.

## Relationships
Called by the auth controller/routes. Uses User + Notification models, NotificationManager, and `signToken` middleware helper. Complements UserService (admin resetPassword sets mustChangePassword).

## Edge cases
- Root users cannot request password reset (silently ignored, still returns requested:true).
- Empty/whitespace name in updateMe is ignored; jobTitle may be cleared to empty string.
