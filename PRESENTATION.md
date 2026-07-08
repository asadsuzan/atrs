# ATRS — Activity Tracking & Reporting System

### A Complete Presentation & Feature Algorithm Guide

> **One platform to track products, log development activity, generate AI-powered changelogs, and turn raw work into beautiful reports & presentations.**

**Stack:** React 19 + Vite + TypeScript · Express 5 + MongoDB · Ollama (AI) · Cloudflare R2 (optional media storage) · npm-workspaces monorepo

---

## 📖 Agenda

1. The Problem & The Solution
2. System Architecture
3. Data Model at a Glance
4. Feature Tour (what it does)
5. **Feature Algorithms** (how each works, step by step)
6. Security & Accountability
7. UX Highlights
8. Closing Summary

---

## 1. The Problem

Product teams that ship many plugins/themes/apps struggle with:

- ❌ Updates scattered across repos, changelogs, and chat threads
- ❌ Manual, error-prone monthly reporting to stakeholders
- ❌ Changelogs written by hand from memory of git commits
- ❌ Marketing copy living in unstructured docs
- ❌ No accountability trail for who changed what

## The Solution — ATRS

- ✅ **Central registry** of every product (plugins, blocks, themes, standalone apps)
- ✅ **One-click import** from WordPress.org (versions + changelog history)
- ✅ **AI-generated changelogs** straight from your Git repositories
- ✅ **AI writing assist** inside every form
- ✅ **Monthly / annual reports** exported to PDF, PPTX, CSV, JSON — plus a live Presentation Mode
- ✅ **Full audit trail** + role-based access + public-facing pages

---

## 2. System Architecture

```
┌────────────────────────── Monorepo (npm workspaces) ──────────────────────────┐
│                                                                               │
│  CLIENT (React 19 + Vite)                 SERVER (Express 5 + TypeScript)     │
│  ├─ Pages (Dashboard, Products,           ├─ Routes  → thin Controllers      │
│  │   Reports, Review, Explore…)           ├─ Services (business logic)       │
│  ├─ TanStack Query (server state)         ├─ Repositories / Mongoose models  │
│  ├─ Radix UI + Tailwind (shadcn-style)    ├─ Zod validation schemas          │
│  ├─ Export engines: jsPDF, pptxgenjs,     ├─ Middlewares: JWT auth, roles,   │
│  │   html2canvas                          │   rate-limit, audit, errors      │
│  └─ SSE listeners (live progress)         └─ SSE streaming for long jobs     │
│                                                                               │
│         MongoDB ◄── Mongoose        Ollama (local or cloud) ◄── AI features   │
│         uploads/ or Cloudflare R2 ◄── media    WP.org API + SVN ◄── imports   │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Design pattern:** Controller → Service → Repository, with Zod validation at the edge and ownership checks in every service.

---

## 3. Data Model at a Glance

| Collection | Purpose | Key fields |
|---|---|---|
| **Product** | A managed asset | name, slug, category (plugin/block/theme/standalone), icon, banner, githubUrl, wpOrgSlug, repoPath, ownerId |
| **Activity** | One changelog entry / timeline event | type (feature/improvement/bug-fix), title, tier (free/pro), priority, tags (released/unreleased), nested items, media, versionId, **needsReview** |
| **Version** | A product release | label (v2.4.1), status, releasedAt, notes, author |
| **Issue** | Bug/issue record | status, severity, source (internal/public), assignees, needsReview |
| **ProductMarketing** | Landing-page copy | hero, key/all features, demos, screenshots, FAQs, videos |
| **AuditLog** | Accountability trail | action, entityType, entityId, actor, details |
| **User / Notification** | Auth & messaging | role, status (pending/active/suspended), isRoot |

**Everything is owner-scoped:** regular users see only their own data; admins see all.

---

## 4. Feature Tour

| # | Feature | What it gives you |
|---|---|---|
| 1 | **Product Management** | Register products with metadata, icons, banners, GitHub links, live WP.org stats |
| 2 | **Changelog / Activity Timeline** | Drag-and-drop entries with type, tier, priority, tags, nested sub-items, media carousels |
| 3 | **WordPress.org Import** | Pull an author's whole catalog: versions from SVN + parsed readme changelog |
| 4 | **Git Changelog Generator** | AI summarizes a repo diff into 4 report formats |
| 5 | **AI Writing Assist** | Suggest titles & generate descriptions inside every form |
| 6 | **Reports Engine** | Monthly / annual / 6-month trend reports → PDF, PPTX, CSV, JSON |
| 7 | **Presentation Mode** | Full-screen branded slide deck generated live from a report |
| 8 | **Marketing Hub + Smart Parser** | Paste unstructured marketing docs → structured fields |
| 9 | **Review Queue** | One inbox to triage AI drafts, uncertain imports, and public issue reports |
| 10 | **Issue Tracker + Public Site** | Internal tracking plus public changelog / known-issues / report-an-issue pages |
| 11 | **Media Library** | Uploads on local disk **or Cloudflare R2**, orphan detection, streaming bulk purge |
| 12 | **Pluggable Media Storage** | Switch new uploads to a Cloudflare R2 bucket at runtime — with a real connection test before saving |
| 13 | **Live Job Streaming** | Long jobs stream progress over SSE with cancel support |
| 14 | **Auth, Roles & Audit** | JWT, pending→active→suspended lifecycle, root admin, full audit trail |

---

# 5. Feature Algorithms 🧠

*How each feature actually works — simplified into presentable steps.*

---

## 5.1 WordPress.org Import

**Goal:** type an author name (or slugs) → get products, versions, and a fully parsed changelog history.

```
Author name ──► WP.org API ──► pick plugins ──► for each plugin:
                                                  ├─ SVN tags  ──► Versions
                                                  ├─ readme.txt ─► parse changelog ──► Activities
                                                  └─ de-duplicate + flag uncertain items
```

**Algorithm:**

1. **Discover plugins** — call the WordPress.org `query_plugins` API by author (or `plugin_information` per slug); guess category (`block` vs `plugin`) from tags.
2. **For each plugin (checking "cancelled?" between each):** fetch two things in parallel —
   - **Version history** via SVN over *WebDAV*: a `PROPFIND` on `/tags/` lists every release tag with its author and creation date (WebDAV is used because it bypasses the WAF that blocks Trac pages). Commit messages are batch-fetched as release notes.
   - **`readme.txt`** raw from trunk.
3. **Upsert the Product** — update if it already exists (matched by owner + slug), otherwise create.
4. **Sync Versions** — new SVN tags become Version records; existing "unreleased" versions that now appear on WP.org are flipped to **released** (and their activities' tags are updated too).
5. **Parse the changelog** — find the `== Changelog ==` section, detect version headings like `= 2.1.0 - 4 June 2026 =`, and split each version block into bullet lines.
6. **Classify each line** with keyword rules:
   - *feature* ← "new / add / introduce" · *bug-fix* ← "fix / patch / resolve" · *improvement* ← "update / improve / tweak" (also the default)
   - Confidence: **high** (explicit `Fix:` prefix) → **medium** (keyword is first word) → **low** (no keyword).
7. **De-duplicate** — every imported line carries a stable `importSourceKey` (`version|normalized-title`). On re-import, lines already present are skipped — so **user edits are never overwritten**.
8. **Flag uncertainty** — anything below high confidence gets `needsReview: true` and lands in the **Review Queue**.
9. **Cancel = rollback** — cancelling mid-import cascade-deletes products *created* during this session; pre-existing ones are kept.

*Key files: `server/src/services/ProductService.ts`, `server/src/utils/readmeChangelog.ts`*

---

## 5.2 Git Changelog Generator (AI)

**Goal:** point at a product's local Git repo → get 4 polished documents.

```
Git repo ──► diff ──► chunk ──► AI summarize each chunk ──► AI writes 4 reports
   │                                                          ├─ Developer changelog
   range: working tree | tags | commits | dates               ├─ User release notes
                                                              ├─ GitHub release notes
                                                              └─ QA checklist
```

**Algorithm (5-stage pipeline, streamed live over SSE):**

1. **Analyze Git** — run `git diff --name-status` + `git log` for the chosen range (working tree, tag→tag, commit→commit, or date→date). Drop noise files (lockfiles, `.min`, `node_modules`) and tag each file with a category (frontend / backend / config / test / docs…).
2. **Chunk the diffs** — each file's diff is split into ≤3,500-character chunks (split on `@@` hunk headers so chunks stay meaningful).
3. **Summarize every chunk with AI** — each chunk goes to Ollama asking for structured JSON: `{title, type, summary, impact, breakingChange}`.
   - Sampling is **deterministic** (temperature 0, seed 42) → the same diff always produces the same output. Reproducible reports!
4. **Synthesize 4 reports** — all chunk summaries + commit messages are fed into 4 separate AI calls, each with its own system prompt (developer changelog · user release notes · GitHub notes · QA checklist). One format failing doesn't break the others.
5. **Create review drafts** (optional) — one draft changelog entry per commit is upserted into the database with `needsReview: true` and tag `ai-generated`. Re-runs *refresh* pending drafts instead of duplicating; entries you already confirmed are never touched.
6. **Endpoint switching** — local Ollama daemon or a cloud endpoint (Bearer key), switchable in Settings; same model, same deterministic output either way.

*Key files: `server/src/services/ChangelogGenService.ts`, `server/src/utils/ollama.ts`, `client/src/pages/ChangelogGenerator.tsx`*

---

## 5.3 AI Writing Assist

**Goal:** never stare at an empty title or description field again.

**Algorithm:**

1. Two reusable buttons drop into any form: **Suggest Title** (returns 3–5 options in a popover) and **Generate Description** (fills the field with one paragraph).
2. On click, the button captures the **live form state** (product name, type, tags, current text…) as a context object.
3. Client POSTs to `POST /api/ai/suggest` with `{task, entity, context}` — validated by Zod, behind auth.
4. The prompt embeds the context as JSON (capped at 4,000 chars) with a hard rule: *"base output strictly on this context — do not invent facts."*
5. The same Ollama endpoint as the changelog generator answers in JSON format.
   - **Contrast:** here sampling is *deliberately non-deterministic* (temperature 0.6, no seed) → every "Regenerate" click gives fresh options. The changelog pipeline is the opposite (seed 42) because reports must be reproducible.
6. Responses are cleaned (trim quotes, cap length) and returned; provider failures surface as a friendly toast, never a crash.
7. Wired into 5 forms: Activity, Product, Issue, Quick Issue, and Marketing hero.

*Key files: `server/src/services/ai/AiService.ts`, `server/src/services/ai/prompts.ts`, `client/src/components/ai/AiAssist.tsx`*

---

## 5.4 Smart Parser Engine (Marketing Ingestion)

**Goal:** paste one big unstructured marketing document → get every field of the Marketing Hub filled.

**Algorithm:**

1. **Labeled fields** — regexes match lines like `Plugin Name:`, `Trailer video:`, `Docs URL:` and pull the values.
2. **Section blocks** — lookahead-bounded regexes capture the text *between* known headings: Hero description, "❌ The Problem" list, "✅ A Smarter Way" list.
3. **Key Features** — split the block on `Title:` or numbered emoji (1️⃣–4️⃣); extract title, `Des:` description, and `List:` items; falls back to line-pairing heuristics for older formats.
4. **Demos** — the JSON-ish `Demos [ … ]` block is *repaired* into valid JSON (single→double quotes, quote bare keys, strip trailing commas) and safely `JSON.parse`d — never `eval`.
5. **Screenshots** — lines split on `–` into `{title, url}` pairs.
6. **FAQs** — split on `Q:` markers; answers found via `A:` or heuristics ("Yes,…" / "No,…" / next line).
7. Everything is wrapped in try/catch — a malformed section is skipped, and whatever *did* parse is returned.

*Key file: `client/src/components/marketing/SmartParser.ts`*

---

## 5.5 Reports Engine

**Goal:** "What did we ship this month / this year?" answered in one query, exported in any format.

**Algorithm:**

1. **Monthly report** — resolve the date window → apply the ownership filter → fetch all activities in the window (with product + version populated) → group into a per-product map, counting features / improvements / bug-fixes → return `{summary, products[]}`.
2. **Trend & annual reports** — a single MongoDB aggregation groups by `{year, month, type}` in **one DB round-trip**; the service then walks the months and fills gaps with zeros (6-month trend or Jan–Dec annual).
3. **Client-side version filter** — the UI can narrow the report to one version label and recomputes all counts locally.
4. **Exports:**
   - **PDF** — expand all cards → `html2canvas` snapshot at 2× scale → embed into `jsPDF` (pixel-perfect, looks exactly like the screen).
   - **PPTX** — `pptxgenjs`: a title/summary slide + one slide per product with up to 12 activity bullets.
   - **CSV** — flatten every activity to a row, HTML stripped to plain text, safely quoted.
   - **JSON** — pretty-printed dump of the displayed report.

*Key files: `server/src/services/ReportService.ts`, `client/src/pages/Reports.tsx`*

---

## 5.6 Presentation Mode 🎤

**Goal:** turn a monthly report into a live, branded, full-screen slide deck — no PowerPoint needed.

**Algorithm:**

1. **Build the deck** from report data: `[Summary slide] + [one slide per product] + [optional Thank-You slide]`.
2. **Branding** — company name, logo, and accent color come from Settings; with *dynamic accent* on, each product slide's accent color is extracted from that product's icon/banner.
3. **Summary slide** — animated count-up stats (products, features, improvements, bug fixes) + "Prepared by {presenter}".
4. **Product slides** — activities grouped by type into card grids, with cleaned descriptions, media carousels, click-to-zoom lightbox, and nested sub-items.
5. **Navigation** — arrow keys / space / progress dots / `F` fullscreen / `Esc` exit; `[` and `]` jump to the previous/next **month** and reset to the summary slide.
6. **Smart scrolling** — a tall slide scrolls to its edge first, then "arms," then the next wheel tick advances the slide (with a cooldown to absorb trackpad inertia).
7. Framer Motion slide/blur transitions + a top progress bar `(current / total)`.

*Key file: `client/src/components/reports/PresentationMode.tsx`*

---

## 5.7 Review Queue (Human-in-the-Loop)

**Goal:** nothing uncertain or untrusted goes live without a human click.

**Three sources feed one inbox:**

| Source | Why flagged |
|---|---|
| WP.org import | Changelog line type was *guessed* below high confidence |
| AI changelog drafts | Machine-generated — needs human confirmation |
| Public issue reports | Untrusted anonymous input |

**Algorithm:**

1. Every uncertain record is stored normally but stamped `needsReview: true` + a `reviewReason` (e.g. `uncertain-type`, `ai-generated`).
2. Flagged records are **excluded** from public changelogs and release assembly until confirmed.
3. The `/review` page groups pending items by product, with a confidence chip explaining *why* each is flagged.
4. Reviewer actions: fix the type and confirm · confirm as-is · bulk-apply a type · bulk confirm · delete. Public issues: **Approve** (goes live) or **Reject** (deleted).
5. Confirming simply clears the flag — the record instantly joins the changelog / public site.

*Key files: `client/src/pages/Review.tsx`, `server/src/services/IssueService.ts`*

---

## 5.8 Live Job Streaming (SSE)

**Goal:** long jobs (imports, purges, AI pipelines) show live progress and can be cancelled — no frozen spinners.

**Algorithm:**

1. The endpoint opens a **Server-Sent Events** stream (with anti-buffering headers so proxies don't hold events back).
2. A random **session id** is registered in an in-memory map (scoped to the user) and sent as the first event.
3. The job runs with an `emit()` callback → every step streams `progress` events (`step, message, itemIndex / totalItems`) that drive the progress bar and live console.
4. **Cancellation is cooperative:** the loop checks `isCancelled()` between items; `POST /api/jobs/cancel {sessionId}` (or simply closing the tab) flips the flag.
5. On finish: a `complete` event with the result, or an `error` event; the session is cleaned up either way.
6. The client's **Job Dock** lets you minimize a running job and keep working while it streams.

*Key files: `server/src/utils/sseStream.ts`, `server/src/services/ImportSessionManager.ts`*

---

## 5.9 Media Library — Orphan Detection & Purge

**Algorithm:**

1. **Two sources, one library** — read every file in `uploads/` (size + modified date) **and**, when R2 is active, list every object in the Cloudflare bucket. Each entry carries a `storage: local | r2` badge.
2. Load **every media-referencing field** across Products (icon, banner), Marketing (thumbnails, videos, screenshots, feature media), and Activities (media + nested item media) — in parallel.
3. For each file, build a reference list by exact URL match (`/uploads/…` for local, `<publicBaseUrl>/<key>` for R2): *which entity, which field, uses this file* → shown in the UI.
4. `references.length === 0` → **orphan**.
5. Single delete re-verifies zero references (unless forced), then removes the file from whichever backend holds it — with a path-traversal guard for local files.
6. **Bulk purge** streams over SSE: deletes orphans one-by-one — disk unlink or R2 delete per file — with live progress and cancel support; per-file errors don't abort the batch.
7. **Graceful degradation** — if the R2 listing fails (bad credentials, network), the library still shows local files instead of erroring out.

*Key files: `server/src/services/MediaService.ts`, `server/src/utils/r2Storage.ts`*

---

## 5.10 Pluggable Media Storage — Local ⇄ Cloudflare R2

**Goal:** keep uploads on the server's disk, or serve them from a globally distributed R2 bucket — switchable in Settings, no restart needed.

```
Upload ──► isR2Active()? ──► no  ──► Multer disk storage ──► /uploads/<name>
                        └──► yes ──► Multer memory buffer ──► S3 PutObject ──► https://<public-base>/<name>
```

**Algorithm:**

1. **Backend resolved per request** — every upload checks `isR2Active()`: provider is `r2` *and* all five settings (account ID, bucket, public base URL, access key, secret) are present. Settings UI values win; blank fields fall back to `R2_*` env vars. Flipping the backend applies to the very next upload.
2. **Local path** — Multer disk storage writes `<timestamp>-<random>.<ext>` into `uploads/` (unchanged behavior).
3. **R2 path** — Multer buffers the file in memory, then streams it to the bucket via the S3-compatible API with `Cache-Control: public, max-age=1y, immutable`; the stored URL is `<publicBaseUrl>/<key>`. An R2 failure returns a clear 502 — never a half-saved record.
4. **Write-only secret** — the R2 Secret Access Key is encrypted at rest (AES-256-GCM, same secret box as GitHub tokens) inside `app.config.json` and **never sent back to the browser** — the client only learns *whether* one is stored. Legacy plaintext values are sealed on the next save.
5. **Test before save** — the Settings page's "Test connection" does a real **write → head → delete** round-trip on the bucket with the candidate credentials, mapping failures to human answers: bucket not found / auth failed / account unreachable.
6. **URL-aware deletion** — when an entity is deleted, the shared cleanup helper recognizes R2 URLs by the configured public base URL, extracts the object key (rejecting anything path-like), and deletes from the bucket; `/uploads/…` URLs unlink from disk. The two backends coexist — existing files stay where they were uploaded.

*Key files: `server/src/utils/r2Storage.ts`, `server/src/routes/uploadRoutes.ts`, `server/src/controllers/ConfigController.ts`*

---

## 5.11 Auth, Roles & Ownership

**Account lifecycle:**

```
Register ──► PENDING ──(admin approves)──► ACTIVE ──(admin)──► SUSPENDED
                │                            │
                └── can't log in             └── admin resets password → temp password
                                                 → forced SetPassword screen → back to normal
```

**Algorithm:**

1. **Register** → account created as `pending`; every admin gets a persistent notification **and** a live SSE ping.
2. **Login** → password verified (bcrypt) → JWT signed with `{sub, role, isRoot}` (7-day default). Pending/suspended users are rejected with clear messages.
3. **Every request:** `requireAuth` verifies the token; `requireActive` **re-loads the user from DB** — so an admin suspending you or changing your role takes effect immediately, without waiting for token expiry.
4. **Three tiers:** user → admin → root admin. The root account is protected: any attempt to modify it throws 403. Root admins also get a live feed of everyone's actions.
5. **Password reset is admin-driven:** user requests → admins get an SSE alert → admin sets a temp password with `mustChangePassword` → user is forced through the Set Password screen on next login.
6. **Ownership scoping everywhere:**
   - `scopeFilter(user)` — normal users' queries silently gain `ownerId: me`; admins are unrestricted.
   - `assertOwner(doc, user)` — non-owners get a **404, not 403** → outsiders can't even probe whether an id exists.

*Key files: `server/src/services/AuthService.ts`, `server/src/middlewares/auth.ts`, `server/src/utils/ownership.ts`*

---

## 5.12 Audit Trail & Notifications

**Audit algorithm:**

1. Every service mutation (create/update/delete on products, activities, versions, marketing, issues) writes an AuditLog entry: *who, what, which entity, human-readable details*.
2. Logging failures are swallowed — auditing can never break the actual operation.
3. Non-root actions are additionally pushed **live** to root admins (real-time oversight feed).
4. Logs are viewable with filters (entity, action, date, text search) — users see their own; admins see everything.

**Notifications — two channels:**

1. **Persistent** — DB-stored notifications (e.g. "new user awaiting approval") with read/unread state.
2. **Real-time** — an SSE hub holds all connected clients (30s heartbeat) and targets events: `sendToUser`, `sendToAdmins`, `sendToRootAdmins`, `broadcast`.
3. The client merges both feeds, dedupes, plays a sound, and toasts; an `access-change` event instantly refreshes the user's session (role/status changes apply live).

*Key files: `server/src/services/AuditLogService.ts`, `server/src/services/NotificationManager.ts`*

---

## 5.13 Issue Tracker & Public Site

**Internal issues:** `open → in-progress → resolved → closed`, with severity, assignees, media, and AI-assisted title/description. `resolvedAt` auto-stamps on close and clears on reopen. Every change is audit-logged.

**Public pages (no login):**

- 🌐 **Explore** — directory of opted-in products
- 📜 **Public changelog** — hosted per-product release history
- 🐛 **Known issues + "Report an issue"**

**Public report algorithm (safe by design):**

1. Rate-limited to 10 reports/hour per IP (on top of the global API limiter).
2. Product must have public issues *enabled* — otherwise 404 (indistinguishable from "doesn't exist").
3. All input is HTML-escaped and length-capped.
4. Created as `source: public, needsReview: true` → **invisible** until the owner approves it in the Review Queue.
5. Owner gets a live "issue reported" notification.

*Key files: `server/src/services/IssueService.ts`, `server/src/routes/publicRoutes.ts`*

---

## 6. Security & Accountability Summary

| Layer | Mechanism |
|---|---|
| Authentication | JWT (bcrypt-hashed passwords), boot fails fast on weak secret |
| Authorization | Role middleware + per-document ownership (`404` on foreign ids — no probing) |
| Account control | pending → active → suspended lifecycle, protected root admin |
| Input safety | Zod validation on every route, HTML escaping on public input, path-traversal guards on file ops |
| Secrets at rest | GitHub tokens & the R2 secret key encrypted with AES-256-GCM; the R2 secret is write-only — never returned to the browser |
| Abuse control | Global rate limiting + stricter limits on register & public reports |
| Trust gate | `needsReview` — AI output & anonymous input never go live without human approval |
| Accountability | Full audit trail + real-time root-admin activity feed |

---

## 7. UX Highlights

- ⌘K **Command palette** — jump anywhere
- 🧭 **Interactive onboarding tour**
- 🌗 **Light/dark themes** + preset accent palettes + optional UI sounds
- 🖱️ **Drag-and-drop** timeline ordering (dnd-kit)
- 📟 **Job Dock** — minimize long-running jobs, keep working
- 📱 Responsive, native-feeling app shell
- 🔔 Live toasts + notification bell fed by SSE

---

## 8. Closing Summary

**ATRS turns raw development work into polished, shareable output:**

```
 Git commits ─┐
 WP.org data ─┼──►  ATRS  ──►  Changelogs · Reports · Slides · Marketing copy · Public pages
 Manual logs ─┘      │
                     └── with AI acceleration + human review + full audit trail
```

Three ideas run through every feature:

1. **Automate the tedious** — imports, changelog writing, report building.
2. **Trust but verify** — everything AI-generated or externally submitted passes through the Review Queue.
3. **Own your data** — strict ownership scoping, full auditability, exports in every format.

---

*Built with React 19, Express 5, MongoDB, and Ollama · MIT License*
