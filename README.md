# Mermaid Studio Pro

Workspace visual & editor **Mermaid.js** modern bergaya **mermaid.ai** dengan seluruh fitur premium terbuka penuh, berjalan 100% di browser tanpa paywall dan tanpa ketergantungan backend/AI.

---

## Fitur Utama

- **Editor Kode Pro (CodeMirror 6)**
  - Syntax highlighting khusus **Mermaid + YAML Frontmatter**, nomor baris, `Ctrl+F` search & replace, word wrap, auto-format, panel resizable, toggle **Auto-Update**, deteksi error dengan tombol **Fix** otomatis, dan drawer **Snippets**.
- **Interactive Infinite Canvas**
  - Background grid (`+` cross, dots, polos), **Light & Dark Mode**, smooth pan & zoom, `1:1`, fit-to-screen, dan **Minimap**.
- **Theme Studio (Tersinkron ke YAML Frontmatter)**
  - 9 preset tema (`Base theme`, `Mermaid Neo`, `Classic Indigo`, `Neutral Pro`, `Oceanic Blue`, `Forest Emerald`, `Rose Studio`, `Dark Slate`, `Midnight Neon`) + custom color picker (`primaryColor`, `primaryTextColor`, `primaryBorderColor`, `lineColor`), font family, dan font size.
- **4 Mode Layout**
  - **Hierarchical** (`dagre`), **Adaptive** (`elk` Network Simplex), **Orthogonal** (`elk` siku 90°), dan **Balanced** (`elk` grid seimbang), ditambah gaya **Crisp Vector** vs **Hand-Drawn** serta slider spacing & curve.
- **Direction Switcher**
  - Ubah orientasi diagram secara instan (`Left to right`, `Top to bottom`, `Right to left`, `Bottom to top`) termasuk sinkronisasi otomatis arah subgraph.
- **Placement: Auto vs Manual (Interactive Drag & Drop)**
  - **Drag & drop node** secara bebas dengan snap-to-grid opsional.
  - **Drag & drop subgraph** beserta seluruh node di dalamnya; ukuran kotak subgraph otomatis menyesuaikan (**auto-resize**) terhadap posisi & ukuran node di dalamnya.
  - **Ubah posisi & bentuk arrow**: klik atau drag panah mana pun untuk menggeser titik lengkung/siku tengah, memindahkan sisi tempel awal/akhir di keliling border node (`top`, `right`, `bottom`, `left`), dan mengganti gaya routing per panah (`Auto`, `Curved`, `90° Ortho`, `Straight`).
- **Visual Node Style Inspector**
  - Klik node mana pun di mode **Visual** untuk melompat ke baris kodenya atau mengubah warna fill, border, teks, ketebalan, dan garis putus-putus secara visual.
- **Export Studio (Tanpa Watermark)**
  - Export ke **PNG Ultra-HD (1x, 2x, 4x, 8x)**, **Vector SVG**, **Print PDF**, **`.mmd`**, dan **Markdown `.md`**, lengkap dengan pilihan background (transparan, putih, gelap, kustom), margin/padding, serta **Copy PNG / Copy SVG** ke clipboard.
- **Manajemen File, Kolaborasi & Presentasi**
  - Unlimited diagram & folder (tersimpan otomatis di `localStorage`), 16+ template siap pakai, impor `.mmd`/JSON & backup workspace JSON.
  - **Version History** (auto-snapshot + manual checkpoint + diff viewer + restore 1 klik).
  - **Comments & Pinned Canvas Annotations**, **Draggable Sticky Notes**, **Diagram Notes (Markdown)**, **Live Share Link terkompresi (`#pako:...`)**, embed `<iframe>`, **Built-in Docs**, dan **Presentation Fullscreen Mode + Laser Pointer**.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4
- **Diagram Engine**: Mermaid v11 + `@mermaid-js/layout-elk`
- **Code Editor**: CodeMirror 6
- **Export & Sharing**: `jspdf`, `pako`, `lucide-react`
- **Container**: Docker multi-stage (`node:22-alpine` → `nginx:alpine`)

---

## Struktur Proyek

```text
.
├── Dockerfile              # Multi-stage build (Node 22 -> Nginx Alpine)
├── docker-compose.yml      # Orchestration container port 5173 -> 80
├── nginx.conf              # Konfigurasi Nginx SPA + Gzip + Asset caching
├── package.json            # Dependensi & script build
├── index.html
└── src/
    ├── App.tsx             # Layout utama & state coordination
    ├── types.ts            # Definisi tipe TypeScript
    ├── store/
    │   └── useWorkspace.ts # State workspace & persistensi localStorage
    ├── utils/
    │   ├── mermaidEngine.ts # Inisialisasi Mermaid + ELK + render/format/autofix
    │   ├── frontmatter.ts   # Parser/serializer YAML frontmatter, tema, layout & arah
    │   ├── manualLayout.ts  # Engine drag node/subgraph, auto-resize & arrow handles
    │   ├── export.ts        # Engine export PNG 8x, SVG, PDF, .mmd, .md
    │   └── share.ts         # Kompresi URL share link (pako)
    ├── data/
    │   ├── templates.ts     # Diagram default & 16+ template pro
    │   └── snippets.ts      # Snippets, quick shapes, blok arsitektur & docs
    └── components/          # UI komponen (TopBar, CodeEditorPanel, CanvasWorkspace, dll.)
```

---

## Instalasi & Menjalankan di Lokal

### Opsi 1: Menggunakan Docker Compose (Direkomendasikan)

Tidak perlu menginstal Node.js di komputer lokal — cukup memiliki **Docker** & **Docker Compose**.

1. **Clone atau masuk ke folder proyek:**
   ```bash
   cd /path/to/mermaid
   ```

2. **Build dan jalankan container:**
   ```bash
   docker compose up -d --build
   ```

3. **Buka di browser:**
   ```text
   http://localhost:5173
   ```

4. **Perintah Docker yang berguna:**
   ```bash
   # Cek status container
   docker compose ps

   # Lihat log Nginx
   docker compose logs -f

   # Rebuild setelah mengubah source code
   docker compose up -d --build

   # Hentikan & hapus container
   docker compose down
   ```

> **Ingin mengganti port?** Edit bagian `ports` di `docker-compose.yml`, misalnya `"8080:80"`, lalu jalankan `docker compose up -d`.

---

### Opsi 2: Menjalankan Langsung dengan Node.js (Mode Development)

**Prasyarat:** Node.js **v20+** atau **v22+** dan npm **v10+**.

1. **Install dependensi:**
   ```bash
   npm install
   ```

2. **Jalankan development server (dengan hot-reload):**
   ```bash
   npm run dev
   ```
   Akses aplikasi di `http://localhost:5173`.

3. **Build production & preview lokal:**
   ```bash
   npm run build
   npm run preview
   ```

> **Catatan Windows + WSL2:** Jika folder proyek berada di dalam filesystem WSL (`\\wsl.localhost\...`), jalankan `npm install` dan `npm run dev` **di dalam terminal Linux WSL** (bukan PowerShell/CMD Windows) atau gunakan **Opsi 1 (Docker Compose)** agar tidak terkendala UNC path Windows.

---

## Panduan Deploy ke Production

Karena aplikasi ini adalah **100% static SPA** (seluruh rendering Mermaid, export PNG/SVG/PDF, dan penyimpanan berjalan di sisi klien/browser), Anda bisa men-deploy-nya ke VPS Docker maupun hosting statis gratis.

### Opsi A: Deploy ke VPS / Server Linux dengan Docker (Direkomendasikan)

1. **Salin kode ke server** (via `git clone` atau `scp`/`rsync`):
   ```bash
   git clone <URL_REPO_ANDA> mermaid-studio
   cd mermaid-studio
   ```

2. **Build & jalankan di background:**
   ```bash
   docker compose up -d --build
   ```
   Aplikasi otomatis berjalan di port `5173` dengan restart policy `unless-stopped`.

3. **Pasang Reverse Proxy + SSL (HTTPS):**

   **Contoh menggunakan Caddy (HTTPS otomatis):**
   ```caddy
   mermaid.domainanda.com {
       reverse_proxy localhost:5173
   }
   ```

   **Contoh menggunakan Nginx host + Certbot:**
   ```nginx
   server {
       listen 80;
       server_name mermaid.domainanda.com;

       location / {
           proxy_pass http://127.0.0.1:5173;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   Lalu aktifkan SSL gratis:
   ```bash
   sudo certbot --nginx -d mermaid.domainanda.com
   ```

---

### Opsi B: Deploy ke Docker Standalone (Tanpa Compose / Cloud Container)

Cocok untuk **Coolify**, **Portainer**, **Railway**, **Render**, **Fly.io**, atau **Google Cloud Run**:

```bash
# Build image
docker build -t mermaid-studio-pro:latest .

# Jalankan container di port 8080
docker run -d --name mermaid-studio-pro --restart unless-stopped -p 8080:80 mermaid-studio-pro:latest
```

Untuk platform seperti **Coolify / Railway / Render / Cloud Run**, cukup hubungkan repository Git dan pilih **Dockerfile** (expose port `80`).

---

### Opsi C: Deploy Gratis ke Static Hosting (Vercel / Netlify / Cloudflare Pages)

Aplikasi dapat di-deploy langsung tanpa Docker karena output build berupa file statis di folder `dist/`.

| Platform | Build Command | Output Directory | Node Version |
| :--- | :--- | :--- | :--- |
| **Vercel** | `npm run build` | `dist` | `22.x` |
| **Netlify** | `npm run build` | `dist` | `22` |
| **Cloudflare Pages** | `npm run build` | `dist` | `22` |

**Langkah singkat (Vercel CLI):**
```bash
npm i -g vercel
vercel --prod
```

---

## Catatan Penyimpanan Data

- Semua diagram, folder, versi history, komentar, sticky notes, posisi manual node/subgraph, dan penyesuaian panah tersimpan secara lokal di **`localStorage`** browser Anda.
- Gunakan tombol **Backup JSON** & **Import .mmd / JSON** pada sidebar kiri (ikon menu `☰`) untuk memindahkan atau mencadangkan seluruh workspace antar perangkat/browser.
