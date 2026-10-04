# ZAYAKA — Family Recipe Catalogue PWA

> **ZAYAKA** is a shared family catalogue of curated YouTube/web recipe links designed specifically for iPhone use. It helps the family quickly find a recipe and send the selected recipe link to the cook through WhatsApp in seconds.

---

## 🚀 Key Features

* **Instant Search & Category Pills**: Search dishes locally with 0-delay across dish names, categories, subcategories, and tags.
* **1-Tap WhatsApp Sharing**: Tap **"Send to Cook"** to prepare a clean message (`Please prepare *Paneer Butter Masala*.\n\nRecipe: [URL]`) and launch WhatsApp.
* **Speed Recipe Adding (5–15 seconds)**: Paste a YouTube link — ZAYAKA automatically fetches the video title, sanitizes it to extract the clean dish name, detects YouTube source, and checks for duplicates.
* **Duplicate Detection**: Alerts if a similar dish already exists without blocking you from saving.
* **iPhone PWA & Offline Support**: Install to Home Screen (`apple-mobile-web-app-capable`, `viewport-fit=cover`, standalone mode). Works offline via Service Worker & IndexedDB.
* **Lightweight Dual Access Model**:
  * `ZAYAKA` — Viewer mode (Browse, search, view, open, and send to WhatsApp).
  * `BAWARCHI` — Editor mode (Add, edit, delete recipes, manage categories, mark favourites).
  * No usernames, no passwords, no recurring logins. Remembered on device.
* **Security & GitHub as Source of Truth**:
  * Source data is stored as clean JSON in `data/recipes.json` and `data/categories.json`.
  * **Zero repository secrets or Personal Access Tokens are embedded in the frontend code.**
  * Write operations support device-stored private tokens or the included zero-dependency Cloudflare Worker (`worker/sync-worker.js`).
  * Optimistic concurrency checks prevent overwriting concurrent family edits.

---

## 📱 iPhone Installation

1. Open your deployed ZAYAKA GitHub Pages URL in **Safari** on iPhone.
2. Tap the **Share** button (box with upward arrow) at the bottom.
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add**. ZAYAKA now launches full-screen like a native iPhone app!

---

## 🔑 Access Codes

| Role | Access Code | Permissions |
| :--- | :--- | :--- |
| **Viewer** | `ZAYAKA` | Browse, Search, View, Open URL, Send to Cook via WhatsApp, View Favourites |
| **Editor** | `BAWARCHI` | All Viewer permissions + Add Recipe, Edit Recipe, Delete Recipe, Manage Categories, Star Favourites |

*To switch access or reset the device, go to **Settings (⚙️) → Switch access / Sign out**.*

---

## 🗂️ Project Structure

```text
zayaka/
├── .github/workflows/
│   └── deploy.yml          # GitHub Pages automated build & deployment
├── data/
│   ├── recipes.json        # Curated family recipe catalogue
│   ├── categories.json     # Editable category & subcategory hierarchy
│   └── settings.json       # Catalogue metadata
├── public/
│   ├── favicon.svg         # Warm culinary icon
│   ├── apple-touch-icon.png# iOS Home screen icon
│   ├── icons/              # PWA manifest icons (192, 512, maskable)
│   ├── manifest.json       # PWA manifest with share_target
│   └── sw.js               # Service Worker for offline caching
├── src/
│   ├── components/         # Clean, modular React UI components
│   │   ├── Header.tsx
│   │   ├── WelcomeModal.tsx
│   │   ├── SearchBar.tsx
│   │   ├── CategoryPills.tsx
│   │   ├── RecipeCard.tsx
│   │   ├── RecipeDetailModal.tsx
│   │   ├── RecipeFormModal.tsx
│   │   ├── CategoryManagerModal.tsx
│   │   └── SettingsModal.tsx
│   ├── services/           # Storage, Auth, Sharing, YouTube oEmbed, Sync
│   │   ├── auth.ts
│   │   ├── duplicate.ts
│   │   ├── oembed.ts
│   │   ├── sharing.ts
│   │   ├── storage.ts
│   │   └── sync.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── tests/                  # Vitest unit & integration test suite
│   ├── auth.test.ts
│   ├── duplicate.test.ts
│   ├── oembed.test.ts
│   └── sync.test.ts
├── worker/
│   └── sync-worker.js      # Optional Cloudflare Worker for secret-free remote writes
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🛠️ Local Development & Testing

### 1. Install dependencies
```bash
npm install
```

### 2. Start development server
```bash
npm run dev
```

### 3. Run automated test suite
```bash
npm test
```

### 4. Build for production / GitHub Pages
```bash
npm run build
```

---

## ☁️ GitHub Pages Deployment

1. Push this repository to GitHub.
2. In your GitHub repository, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will automatically build and deploy the PWA to GitHub Pages on every push to `main`.

---

## 🔒 Write Synchronisation Options (Editor Mode)

In **Settings (⚙️)**, Editors can choose how catalogue additions/edits are synchronized back to the GitHub repository:

1. **Local Mode (Default)**:
   * Changes persist instantly in local device storage (IndexedDB).
   * Can export `recipes.json` backup at any time.
2. **Direct Device Token Mode**:
   * Editor enters a GitHub Fine-Grained Personal Access Token (`contents:write`).
   * Token is stored **strictly in the local device's `localStorage`** and is never included in the repository or code bundle.
3. **Serverless Micro-Proxy Mode**:
   * Deploy `worker/sync-worker.js` to Cloudflare Workers (free tier).
   * Configure `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` as worker secrets.
   * Enter the worker URL in Settings. The worker validates the `BAWARCHI` code and commits the changes securely.
