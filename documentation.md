# ATRS — Automated Townhall Report System
## Comprehensive Documentation & User Guide

Welcome to the official documentation and user guide for **ATRS (Automated Townhall Report System)**. ATRS is a centralized portfolio management platform designed to automate and showcase product updates, manage release lifecycles, parse changelogs/marketing templates, and generate professional documents (PDF, PPTX, HTML, Word) for teams and stakeholders.

---

## 📖 Table of Contents
1. **System Overview & Purpose**
2. **System Architecture & Technical Stack**
3. **Database Models & Schema Definition**
4. **Key Features & Functionalities**
5. **The Smart Parser Engine**
6. **Granular User Guide**
7. **Theme and Personalization Settings**
8. **Audit Logging & Accountability**

---

## 1. System Overview & Purpose
In product development teams, sharing updates (new features, improvements, and bug fixes) across a large portfolio of products is often a manual, disjointed task. 

**ATRS** solves this problem by providing:
- **Centralized Registry**: A single source of truth for all products (plugins, blocks, themes, and standalone applications).
- **Automated Summary Generation**: Consolidating product timeline updates into monthly summaries and visual trends.
- **AI/Regex-Powered Marketing Ingestion**: Extracting unstructured release documents into database fields.
- **One-Click Presentation Export**: Instant compilation of release histories into PowerPoint slides, PDF briefs, or formatted changelog markdown files.
- **Security & Activity Auditing**: A complete audit trail tracking who modified what, guaranteeing accountability.

---

## 2. System Architecture & Technical Stack
ATRS is designed as a modular monorepo containing a separate client (frontend) and server (backend).

### Frontend (Client)
- **Framework**: React 19 (TypeScript) powered by Vite.
- **Routing**: `react-router-dom` with smooth animations using `framer-motion` and `lenis` smooth scroll.
- **State Management & API Querying**: React Query (`@tanstack/react-query`) for cached, reactive server state.
- **Styling**: Tailored CSS variables combined with Tailwind CSS. Includes custom preset theme palettes (Todoist Red, Moonstone Teal, Tangerine Orange, etc.).
- **Components**: Radix UI primitives (Popover, Select, Dialog, Dropdown Menu) for accessible and sleek interfaces.
- **Interactive Drag-and-Drop**: `@dnd-kit` for manual re-ordering of release timeline activities.
- **Export Engines**: `jspdf` for PDF sheets, `pptxgenjs` for slide decks, and `html2canvas` for visual screenshots.

### Backend (Server)
- **Runtime**: Node.js with Express & TypeScript.
- **Database**: MongoDB (Mongoose ORM).
- **Media Controller**: `multer` middleware for handling local image and video uploads.
- **Validation**: Strict validation schemas powered by Zod (`zod`).
- **Security**: Request limiters via `express-rate-limit` (temporarily bypassed on local dev mode), CORS configurations, and standardized global error-handling middlewares.
- **Architecture Pattern**: Controller-Repository-Service design pattern ensuring clean separation of concerns.

---

## 3. Database Models & Schema Definition
The database consists of 5 core MongoDB collections:

### 1. Product (`Product.ts`)
Represents a managed asset in the portfolio.
- `name` (String, Required): Human-readable name.
- `slug` (String, Required, Unique): URL-friendly identifier.
- `description` (String, Optional): Summary.
- `category` (Enum: `'plugin' | 'block' | 'theme' | 'standalone'`, Required).
- `status` (Enum: `'active' | 'inactive'`, Default: `'active'`).
- `icon` (String, Optional): Icon URL path.
- `banner` (String, Optional): Banner image URL.
- `githubUrl` (String, Required): Link to source code repo.
- `wpOrgSlug` (String, Optional): WordPress.org slug to pull public repository stats.

### 2. Activity (`Activity.ts`)
Logs an individual product event/timeline change.
- `productId` (ObjectId -> Product, Required).
- `type` (Enum: `'feature' | 'improvement' | 'bug-fix'`, Required).
- `title` (String, Required).
- `shortDescription` (String, Required).
- `tier` (Enum: `'free' | 'pro'`, Default: `'free'`).
- `priority` (Enum: `'low' | 'medium' | 'high' | 'critical'`, Default: `'medium'`).
- `referenceUrl` (String, Optional).
- `versionId` (ObjectId -> Version, Optional).
- `mediaType` (Enum: `'image' | 'gif' | 'video'`, Optional).
- `mediaUrl` (String, Optional): Primary media asset path.
- `mediaUrls` (Array of Strings): Additional uploads.
- `displayOrder` (Number, Default: `0`): Drag-and-drop sort rank.
- `tags` (Array of Strings): Tags like `released` or `unreleased`.
- `items` (Array of Sub-objects): Nested checklist updates containing `title`, `description`, `mediaType`, `mediaUrl`, and `mediaUrls`.
- `activityDate` (Date, Required): Date when the update occurred.

### 3. Version (`Version.ts`)
Tracks product releases.
- `productId` (ObjectId -> Product, Required).
- `name` (String, Required): E.g., `v2.4.1`.
- `releasedAt` (Date, Optional).
- `releaseNotes` (String, Optional).

### 4. ProductMarketing (`ProductMarketing.ts`)
Maintains landing page copy, assets, and FAQs.
- `productId` (ObjectId -> Product, Required).
- `pluginName` (String).
- `trailerVideo` (String).
- `tutorialVideo` (String).
- `wpOrgUrl` (String).
- `docsUrl` (String).
- `heroDescription` (String).
- `thumbnailImage` (String).
- `problemList` (Array of Strings).
- `smarterWayList` (Array of Strings).
- `keyFeatures` (Array of objects: `title`, `description`, `list`, `mediaUrl`).
- `allFeatures` (Array of objects: `title`, `description`, `list`).
- `demos` (Array of objects: `title`, `description`, `url`, `icon`).
- `topRatingLink` (String).
- `screenshots` (Array of objects: `title`, `url`).
- `faqs` (Array of objects: `question`, `answer`).

### 5. AuditLog (`AuditLog.ts`)
Records all user actions for accountability.
- `action` (Enum: `'CREATE' | 'UPDATE' | 'DELETE'`).
- `entityType` (Enum: `'PRODUCT' | 'ACTIVITY' | 'VERSION' | 'MARKETING'`).
- `entityId` (String).
- `entityName` (String).
- `details` (String).
- `createdAt` (Date).

---

## 4. Key Features & Functionalities

### 1. Command Center Dashboard
- **Aggregate Summaries**: Quickly view active products, features delivered, and bugs resolved during the current month.
- **Activity Feed**: Real-time view of recent updates across the entire team, linked back to the specific product update card.
- **Landscape Stats**: Circular distribution graphs showing the proportion of features vs. bugs vs. improvements.

### 2. Product Management (Landscape)
- Register products with screenshots, code URLs, icons, and status flags.
- Deleting a product automatically triggers a cascade deletion of all associated activities, versions, media files on disk, and marketing hubs to prevent database bloat.
- Public metadata pull directly from the WordPress.org API if a `wpOrgSlug` is defined.

### 3. Timeline Draggable Editor
- Group updates into *Features*, *Improvements*, or *Bug Fixes*.
- Click on an item to view nested media embeds (carousels supporting images/videos).
- **Manual Sorting**: Drag-and-drop cards dynamically updates sorting orders in the database.
- Mark items as `released` or `unreleased`.
- Export a standardized Markdown changelog file directly from the product page.

### 4. Marketing Hub
- Standardize all sales copies, trailer assets, problem/solution grids, screenshots, and FAQs.
- Multi-format exports: Export copy grids into JSON, Plaintext templates, HTML, MS Word, PDFs, or PowerPoint decks.

---

## 5. The Smart Parser Engine
The **Smart Parser Engine** is a signature feature of ATRS. It resides in [SmartParser.ts](file:///c:/Users/suzan/Desktop/ATRS/client/src/components/marketing/SmartParser.ts) and parses unstructured text inputs using specialized regex rules.

When landing page copy or changelog blocks are pasted into the **Smart Import** modal, the parser automatically identifies key identifiers:
- `Plugin Name: <Name>`
- `Trailer video: {<URL>}`
- `Why Choose...` headings trigger extraction of `problemList` and `smarterWayList`.
- Numbers prefixed with emojis (e.g. `1️⃣`, `Title:`) split the block into key feature blocks containing bullet lists.
- Javascript Array representations inside `Demos [...]` are dynamically evaluated using a clean sandbox function parser.
- Screenshots are extracted via `Title - {URL}` patterns.
- Questions block prefixing `Q: <Text>` and `A: <Answer>` extracts complete FAQ loops.

This saves product managers from copying and pasting individual field strings manually.

---

## 6. Granular User Guide

### A. Registering a Product
1. Navigate to **Products** via the sidebar.
2. Click **Create Product**.
3. Fill out the **Name**, **GitHub URL**, and select a **Category** (e.g. Plugin).
4. Upload an icon or banner image via the interactive **Media Uploader**.
5. Save the product. It will now appear in your Landscape.

### B. Logging a Product Update (Activity)
1. Go to **Activities**.
2. Click **Add Activity**.
3. Select the associated product, specify the type (e.g. Feature), and provide a title/description.
4. Set the **Activity Date** using the custom **DatePicker** popover calendar.
5. In the **Media Upload** field, drop or paste images/videos.
6. (Optional) Add nested items if this is a large update containing smaller releases.
7. Click **Create Activity**.

### C. Reordering Activities
1. Open the specific product via **Products -> View Details**.
2. Hover over any activity card in the **Activity Timeline** tab.
3. Grab the drag icon (three dots) in the top-right corner of the card and drop it to sort. The system automatically recalculates and saves the layout order.

### D. Using Smart Import in Marketing Hub
1. Navigate to the product detail page and click **Marketing Hub**.
2. Click **Smart Import** in the header.
3. Paste the copy document block and hit **Auto-Parse & Fill**.
4. Review the parsed values in the fields.
5. Click **Save Hub**.

### E. Exporting Assets
- Click **Export** on the Marketing Hub page.
- Choose your desired format:
  - **HTML Webpage**: Generates structured markup of features and FAQs.
  - **PowerPoint**: Creates title slide, feature bullet slide, and demo layout slide deck.
  - **PDF Document**: Generates a standard readable brief document.
  - **Word / Raw Template**: Downloads document assets formatted for copywriters.

---

## 7. Theme and Personalization Settings
Configure your workspace settings by clicking the **Settings** cog.
- **Theme Palette Selection**: Swap between tailored HSL palettes:
  - `Todoist`: Classic graphite and red accents.
  - `Moonstone`: Sleek teal.
  - `Tangerine`: Warm orange.
  - `Kale`: Deep foliage green.
  - `Blueberry`: Clean blue.
  - `Lavender`: Subtle purple.
  - `Raspberry`: Energetic red.
- **Auto Dark Mode**: Toggle automatic dark mode syncing that matches the system browser's dark/light preferences.

---

## 8. Audit Logging & Accountability
Every update, creation, or deletion on products, versions, or activities is tracked.
- Go to the **Audit Logs** tab on the sidebar.
- Filter logs by action type (`CREATE`, `UPDATE`, `DELETE`), entity type, or narrow down dates using the custom **DatePicker** range selectors (*From* and *To*).
- Click on any audit log to jump directly to the modified product details page.
