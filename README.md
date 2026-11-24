# Mermaid Studio Pro (Full-Stack)

Workspace visual & editor **Mermaid.js** modern bergaya **mermaid.ai** dengan seluruh fitur premium terbuka penuh, dilengkapi **autentikasi akun (Register & Login JWT)**, **Super Admin Console + API Explorer**, **database PostgreSQL**, **server-side pagination anti-lag**, serta **arsitektur Frontend & Backend terpisah** dalam Docker.

---

## Fitur Utama

### 1. Sistem Akun, Super Admin & Database PostgreSQL
- **Buat Akun (Register)** & **Masuk (Login)** dengan enkripsi password (`bcryptjs`) dan sesi JWT.
- **Super Admin Console (`role = 'super_admin'`)**:
  - Akun Super Admin default otomatis dibuat saat startup pertama (`admin@mermaid.local` / `Admin123456!`, dapat dikonfigurasi via `.env`).
  - **Statistik Platform Real-Time**: Total akun, akun aktif/suspended, total diagram, dan total folder.
  - **Manajemen User**: Buat akun User/Super Admin baru, cari & filter role, promosi/demosi role, suspend/aktifkan akun (langsung memblokir akses JWT), reset password user, dan hapus akun permanen.
  - **Manajemen Semua Diagram**: Telusuri seluruh diagram lintas akun, buka salinan ke editor (lazy-load on demand), atau hapus diagram.
  - **API Explorer & Tester**: Dashboard pengujian API interaktif langsung di dalam Super Admin Console (uji 1 klik semua endpoint admin, edit query/JSON body, toggle header JWT untuk uji `401`, salin token JWT, generator `cURL`, dan viewer respons JSON + latency).
- **Pengaturan Akun & Cloud Sync**: Ubah nama tampilan, ganti password, serta indikator sinkronisasi database real-time (`Saved` / `Saving...`) di TopBar.

### 2. Editor, Canvas Interaktif & Fitur Diagram Pro
- **Editor Kode Pro (CodeMirror 6)**: Syntax highlighting **Mermaid + YAML Frontmatter**, nomor baris, `Ctrl+F` search & replace, word wrap, auto-format, panel resizable, toggle **Auto-Update**, deteksi error + tombol **Fix** otomatis, dan drawer **Snippets**.
- **Theme Studio**: 9 preset tema + custom color variables (`primaryColor`, `primaryTextColor`, `primaryBorderColor`, `lineColor`), font family, dan font size yang tersinkron ke YAML frontmatter.
- **4 Mode Layout**: **Hierarchical** (`dagre`), **Adaptive** (`elk`), **Orthogonal** (90°), dan **Balanced**, ditambah **Crisp Vector / Hand-Drawn** serta slider spacing & curve.
- **Direction Switcher**: `Left to right`, `Top to bottom`, `Right to left`, `Bottom to top` (sinkron dengan subgraph + auto-fit canvas).
- **Placement: Auto vs Manual**:
  - **Drag & drop node** secara bebas dengan snap-to-grid opsional.
  - **Drag & drop subgraph** beserta seluruh node di dalamnya; ukuran kotak subgraph otomatis menyesuaikan (**auto-resize**) terhadap posisi & ukuran node.
  - **Ubah posisi & bentuk arrow**: klik/drag panah mana pun untuk menggeser lengkungan tengah, memindahkan sisi tempel awal/akhir di keliling border node (`top`, `right`, `bottom`, `left`), dan mengganti gaya routing per panah (`Auto`, `Curved`, `90° Ortho`, `Straight`).
- **Export Studio Tanpa Watermark**: **PNG Ultra-HD (1x/2x/4x/8x)**, **Vector SVG**, **Print PDF**, **`.mmd`**, **`.md`**, dan Copy PNG/SVG ke clipboard.
- **Kolaborasi & Presentasi**: **Version History + Diff Viewer**, **Comments & Pinned Canvas Annotations**, **Draggable Sticky Notes**, **Diagram Notes (Markdown)**, **Live Share Link (`#pako:...`)**, **Backup/Restore JSON**, dan **Presentation Fullscreen Mode + Laser Pointer**.

### 3. Pagination & Performa Anti-Lag untuk Data Besar
- **Server-Side SQL Pagination (`LIMIT/OFFSET`)** + **Index PostgreSQL** pada daftar user dan diagram Super Admin (CTE pagination sehingga `COUNT` diagram/folder hanya dihitung untuk halaman aktif).
- **Lightweight List Projection & Lazy Detail Loading**: Daftar diagram Super Admin hanya mengambil metadata + ukuran file (`KB`) tanpa memuat teks `code` besar; kode penuh hanya diambil saat tombol **Buka Salinan** diklik.
- **Lazy Per-Tab Fetching & Auth Cache**: Tab di Super Admin Console memuat data secara independen per tab (tab *Semua Diagram* hanya di-fetch saat dibuka), didukung cache status auth 10 detik di backend dengan invalidasi instan saat role/status user diubah.
- **UI Rendering Ringan (60fps)**: Backdrop modal bebas `backdrop-blur` berat di atas SVG + `contain: layout paint`, `React.memo` untuk `CanvasWorkspace` & `CodeEditorPanel`, serta conditional mount modal.
- **Pagination UI Konsisten (`PaginationBar`)** di seluruh daftar data: Super Admin Users (`10/20/50`), Super Admin Diagrams (`10/20/50`), Sidebar File (`10`/hal), Version History (`8`/hal), Comments (`8`/hal), dan Templates Gallery (`9`/hal).

---

## Arsitektur & Struktur Proyek

Proyek dipisahkan bersih menjadi 3 layanan (`db`, `backend`, `frontend`):

```text
.
├── docker-compose.yml              # Orchestration: PostgreSQL 16 + Backend API + Frontend Nginx
├── .env.example                    # Template environment variable (DB, JWT, Super Admin, Ports)
├── README.md
├── backend/                        # REST API (Express + TypeScript + PostgreSQL + JWT + RBAC)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.ts                # Entrypoint Express & auto-migrasi schema DB
│       ├── config.ts               # Konfigurasi env & kredensial Super Admin default
│       ├── db/
│       │   ├── pool.ts             # PostgreSQL connection pool + startup retry
│       │   └── init.ts             # Auto-create tabel, index performa, & seed Super Admin
│       ├── middleware/auth.ts      # Verifikasi JWT live DB (requireAuth & requireSuperAdmin)
│       ├── data/seedWorkspace.ts   # Starter diagram untuk akun baru
│       └── routes/
│           ├── auth.ts             # /api/auth/register, /login, /me, /profile
│           ├── workspace.ts        # /api/workspace CRUD folders, diagrams, preferences, import
│           └── admin.ts            # /api/admin stats, paginated users & diagrams, lazy detail
└── frontend/                       # SPA React 19 + TypeScript + Vite + Tailwind + Mermaid v11
    ├── Dockerfile                  # Multi-stage Node 22 build -> Nginx Alpine
    ├── nginx.conf                  # Serve SPA + reverse proxy /api/* -> backend:4000
    ├── package.json
    └── src/
        ├── api/client.ts           # HTTP client (authApi, workspaceApi, adminApi)
        ├── components/
        │   ├── AuthPage.tsx        # Halaman Login & Buat Akun
        │   ├── AccountModal.tsx    # Profil akun & ganti password
        │   ├── SuperAdminModal.tsx # Super Admin Console (Users, Diagrams, API Explorer)
        │   ├── AdminApiExplorer.tsx# Live API Explorer & Tester untuk Super Admin
        │   ├── PaginationBar.tsx   # Komponen pagination reusable
        │   └── ...                 # TopBar, CodeEditorPanel, CanvasWorkspace, ExportModal, dll.
        ├── store/useWorkspace.ts   # State & sinkronisasi otomatis ke Backend/PostgreSQL
        └── utils/                  # mermaidEngine, frontmatter, manualLayout, export, share
```

---

## Instalasi & Menjalankan di Lokal

### Opsi 1: Docker Compose (Direkomendasikan — Paling Cepat)

Cukup memiliki **Docker** & **Docker Compose** (tidak perlu install Node.js atau PostgreSQL manual di komputer).

1. **Siapkan file environment (opsional, default lokal sudah tersedia):**
   ```bash
   cp .env.example .env
   ```

2. **Build & jalankan seluruh stack (`db`, `backend`, `frontend`):**
   ```bash
   docker compose up -d --build
   ```

3. **Akses aplikasi:**
   - **Frontend Web**: `http://localhost:5173`
   - **Backend API Health**: `http://localhost:4000/api/health` (atau via proxy `http://localhost:5173/api/health`)
   - **PostgreSQL**: `localhost:5439` (user: `mermaid`, db: `mermaid_studio`)

4. **Login Super Admin Default:**
   - **Email**: `admin@mermaid.local`
   - **Password**: `Admin123456!`
   - Atau klik tab **Buat Akun Baru** untuk mendaftar sebagai user biasa.

5. **Perintah operasional Docker:**
   ```bash
   # Cek status 3 container
   docker compose ps

   # Lihat log backend / frontend / db
   docker compose logs -f backend

   # Rebuild setelah edit kode
   docker compose up -d --build

   # Hentikan container (data PostgreSQL tetap aman di volume)
   docker compose down

   # Hentikan & hapus volume database (reset total)
   docker compose down -v
   ```

---

### Opsi 2: Menjalankan Terpisah di Lokal (Mode Development)

**Prasyarat:** Node.js **v20+ / v22+** dan PostgreSQL **v15+ / v16+**.

1. **Jalankan PostgreSQL** (bisa gunakan service `db` dari Docker):
   ```bash
   docker compose up -d db
   ```

2. **Jalankan Backend API (Terminal 1):**
   ```bash
   cd backend
   npm install
   DATABASE_URL="postgresql://mermaid:mermaid_secret@localhost:5439/mermaid_studio" \
   JWT_SECRET="dev-secret-key" \
   SUPER_ADMIN_EMAIL="admin@mermaid.local" \
   SUPER_ADMIN_PASSWORD="Admin123456!" \
   npm run dev
   ```
   Backend berjalan di `http://localhost:4000`.

3. **Jalankan Frontend Dev Server (Terminal 2):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Frontend berjalan di `http://localhost:5173` dan otomatis mem-proxy `/api/*` ke `http://localhost:4000`.

---

## Panduan Deploy ke Production

### Opsi A: VPS / Server Linux dengan Docker Compose (Direkomendasikan)

1. **Clone repository ke server:**
   ```bash
   git clone <URL_REPO_ANDA> mermaid-studio
   cd mermaid-studio
   ```

2. **Buat `.env` production dengan kredensial yang kuat:**
   ```bash
   cp .env.example .env
   nano .env
   ```
   Pastikan mengganti nilai berikut:
   ```env
   POSTGRES_PASSWORD=password-db-yang-sangat-kuat
   JWT_SECRET=random-secret-minimal-64-karakter-acak
   CORS_ORIGIN=https://mermaid.domainanda.com
   SUPER_ADMIN_EMAIL=superadmin@domainanda.com
   SUPER_ADMIN_PASSWORD=PasswordSuperAdminKuat!2026
   SUPER_ADMIN_NAME=Super Admin
   FRONTEND_PORT=5173
   ```

3. **Build & jalankan di background:**
   ```bash
   docker compose up -d --build
   ```

4. **Pasang Reverse Proxy + HTTPS (SSL):**

   **Caddy (HTTPS otomatis):**
   ```caddy
   mermaid.domainanda.com {
       reverse_proxy localhost:5173
   }
   ```
   *(Cukup arahkan ke port frontend `5173`, karena Nginx di dalam container `frontend` sudah otomatis meneruskan `/api/*` ke container `backend`.)*

   **Atau Nginx Host + Certbot:**
   ```nginx
   server {
       listen 80;
       server_name mermaid.domainanda.com;

       client_max_body_size 20m;

       location / {
           proxy_pass http://127.0.0.1:5173;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
   ```bash
   sudo certbot --nginx -d mermaid.domainanda.com
   ```

---

### Opsi B: Deploy Terpisah (Managed DB + Backend Cloud + Frontend Static)

1. **Database**: Buat PostgreSQL managed di **Neon**, **Supabase**, **Railway**, atau **RDS**, lalu salin `DATABASE_URL`.
2. **Backend (`backend/`)**: Deploy ke **Railway**, **Render**, **Fly.io**, **Coolify**, atau **Cloud Run** menggunakan `backend/Dockerfile`, set env:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `CORS_ORIGIN=https://frontend-anda.vercel.app`
   - `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `SUPER_ADMIN_NAME`
   - `PORT=4000`
3. **Frontend (`frontend/`)**: Deploy folder `frontend/` ke **Vercel**, **Netlify**, atau **Cloudflare Pages**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variable**: `VITE_API_URL=https://api-backend-anda.com/api`

---

## Ringkasan API Endpoints

| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/health` | Publik | Cek status API & koneksi PostgreSQL |
| `POST` | `/api/auth/register` | Publik | Daftar akun baru + seed starter workspace |
| `POST` | `/api/auth/login` | Publik | Login & dapatkan JWT token |
| `GET` | `/api/auth/me` | JWT | Ambil profil & role akun yang sedang login |
| `PATCH` | `/api/auth/profile` | JWT | Ubah nama tampilan atau password |
| `GET` | `/api/workspace` | JWT | Ambil seluruh folder, diagram & preferensi |
| `PATCH` | `/api/workspace/preferences` | JWT | Simpan `darkMode` & `activeDiagramId` |
| `POST` | `/api/workspace/folders` | JWT | Buat / perbarui folder |
| `DELETE` | `/api/workspace/folders/:id` | JWT | Hapus folder |
| `PUT` | `/api/workspace/diagrams/:id` | JWT | Simpan / perbarui diagram beserta posisi manual & history |
| `DELETE` | `/api/workspace/diagrams/:id` | JWT | Hapus diagram |
| `POST` | `/api/workspace/import` | JWT | Restore workspace backup JSON ke database |
| `GET` | `/api/admin/stats` | Super Admin | Statistik total user, aktif/suspended, diagram & folder |
| `GET` | `/api/admin/users?search=&role=&page=1&limit=10` | Super Admin | Daftar user ter-paginasi (`LIMIT/OFFSET`) + jumlah diagram/folder |
| `POST` | `/api/admin/users` | Super Admin | Buat akun `user` atau `super_admin` baru |
| `PATCH` | `/api/admin/users/:id` | Super Admin | Ubah nama, role, status `isActive` (suspend/aktif), atau reset password |
| `DELETE` | `/api/admin/users/:id` | Super Admin | Hapus permanen akun user beserta datanya |
| `GET` | `/api/admin/diagrams?search=&userId=&page=1&limit=10` | Super Admin | Daftar ringan semua diagram ter-paginasi (tanpa payload `code`) |
| `GET` | `/api/admin/diagrams/:userId/:diagramId` | Super Admin | Lazy-load detail & source `code` diagram secara on-demand |
| `DELETE` | `/api/admin/diagrams/:userId/:diagramId` | Super Admin | Hapus diagram milik user tertentu |
