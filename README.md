# ATRS — Activity Tracking & Reporting System

ATRS is a full-stack platform for tracking software products and their development activity, with deep **WordPress.org integration**, **AI-assisted code tracking**, and multi-format **report generation**. It's built for plugin/theme/block authors who want to turn raw development work into structured changelogs, release records, marketing content, and shareable reports.

It is organized as an **npm-workspaces monorepo**: a React 19 + Vite client and an Express 5 + MongoDB API.

## ✨ Features

- **Product management** — Track plugins, blocks, themes, and standalone apps with metadata, icons/banners, GitHub links, and active/inactive status.
- **Changelog & activity logging** — Record features, improvements, and bug fixes with tier (Free/Pro), priority, tags (e.g. *released*/*unreleased*), nested sub-items, and per-item media (images/GIFs/videos).
- **WordPress.org import** — Import an author's plugins (or specific slugs) directly from WordPress.org. Pulls version tags, release dates, and authors from SVN (WebDAV), fetches `readme.txt`, and parses the changelog into activities with de-duplication on re-import.
- **Git Changelog Generator** — Point at a product's local Git repo (via `repoPath`) and a range (working tree, tags, commits, or dates); an **Ollama** model summarizes the diff into a developer changelog, user release notes, GitHub release notes, and a QA checklist. Runs against a local or cloud Ollama endpoint (switchable in Settings) with deterministic sampling for reproducible output.
- **Reports & export** — Generate monthly, annual, and 6-month trend reports, and export to **PDF, PPTX, CSV, and JSON**.
- **Marketing Hub** — Maintain per-product marketing data (hero copy, key/all features, demos, screenshots, FAQs, tutorial/trailer videos) for landing pages and store listings.
- **Readme Tools** — Preview `readme.txt` with the embedded [wpreadme.com](https://wpreadme.com/) viewer and validate it with the official [WordPress.org readme validator](https://wordpress.org/plugins/developers/readme-validator/) (served through a same-origin reverse proxy so it can be embedded).
- **Media library** — Upload and manage images/videos, detect orphaned files, and bulk-purge with live progress.
- **Real-time streaming** — Long operations (imports, bulk deletes, media purges) stream progress over Server-Sent Events with a minimizable live console; clients can cancel mid-run.
- **Audit trail** — Every create/update/delete on products, activities, versions, and marketing data is logged with user attribution.
- **Auth & roles** — JWT auth with `admin` / `user` roles and a root admin. Accounts move through pending → active → suspended; includes self-registration with admin approval and an admin-driven password-reset flow.
- **UX** — Command palette (⌘K), interactive onboarding tour, light/dark themes, and optional UI sound effects.

## 🛠 Tech Stack

**Client** — React 19, Vite, TypeScript, Tailwind CSS + Radix UI (shadcn-style), TanStack Query, React Router, React Hook Form + Zod, Framer Motion, Recharts, jsPDF + html2canvas, pptxgenjs, Axios, Sonner, Lucide.

**Server** — Node.js, Express 5, TypeScript, MongoDB + Mongoose, Zod, JWT + bcrypt, Helmet, CORS, express-rate-limit, Multer, Chokidar.

## 📦 Project Structure

```text
ATRS/                      # npm-workspaces monorepo root
├── client/                # React + Vite frontend (workspace)
│   └── src/
│       ├── components/     # UI + feature components
│       ├── pages/          # Routed pages (Dashboard, Products, Reports, …)
│       ├── services/       # API client layer (Axios)
│       ├── contexts/       # Auth, theme, notifications, import, jobs
│       ├── hooks/          # Custom hooks
│       └── lib/            # Helpers
├── server/                # Express + MongoDB API (workspace)
│   └── src/
│       ├── controllers/    # Thin request handlers
│       ├── services/       # Business logic
│       ├── routes/         # Express routers
│       ├── models/         # Mongoose schemas
│       ├── schemas/        # Zod validation
│       ├── middlewares/    # Auth, logging, validation, errors
│       └── utils/          # SSE streaming, file utils, parsers
├── uploads/                # Uploaded media (git-ignored)
├── .env                    # Environment config (git-ignored)
├── app.config.json         # Runtime app config
└── package.json            # Workspace root + scripts
```

## 📋 Prerequisites

- **Node.js** 18+ (developed on Node 22)
- **MongoDB** (local instance or Atlas)
- **Ollama** *(optional)* — only needed for the Git Changelog Generator (local daemon or a cloud endpoint)

## ⚙️ Setup

```bash
# 1. Clone
git clone <repository-url>
cd ATRS

# 2. Install all workspaces from the root (single hoisted node_modules)
npm install

# 3. Configure environment
cp .env.example .env   # then edit values (see below)
```

### Environment variables (`.env`)

```env
PORT=5000                                   # API port
MONGODB_URI=mongodb://127.0.0.1:27017/atrs
CLIENT_ORIGIN=http://localhost:5173,http://127.0.0.1:5173  # CORS allow-list
JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d
ROOT_ADMIN_EMAIL=admin@example.com          # seeded on first boot
ROOT_ADMIN_PASSWORD=change-me-strong-password
ROOT_ADMIN_NAME=Root Admin
```

Runtime options (sounds, navigation mode, and the changelog generator's Ollama model/endpoint) live in `app.config.json` and are editable from the in-app admin Settings page.

## 💻 Running

```bash
npm run dev          # client + server together (concurrently)
npm run dev:client   # client only  → http://localhost:5173
npm run dev:server   # server only  → http://localhost:5000 (or PORT)
```

The Vite dev server proxies `/api` and `/uploads` to the API, so the client talks to the backend with no extra config.

## 🏗 Build & Production

```bash
npm run build          # build both workspaces
npm run build:client   # tsc + vite build → client/dist
npm run build:server   # tsc → server/dist
npm run start          # run the compiled API (server/dist/index.js)
```

Serve `client/dist` as static files (e.g. via Nginx, Vercel, or any static host) and point its `/api` and `/uploads` at the running API.

## 🧪 Testing

```bash
npm run test         # run server tests once (Vitest)
npm run test:watch   # watch mode
```

## 🔌 Adding dependencies

Because this is a workspace, install into a specific package from the root:

```bash
npm install <pkg> -w client
npm install <pkg> -w server
```

## 📄 License

Distributed under the MIT License.
