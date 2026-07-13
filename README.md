# Jurnal Saham

Aplikasi jurnal trading saham dengan struktur proyek yang sudah dipisah jelas:

- `apps/web` untuk frontend (React + Vite)
- `apps/api` untuk backend (NestJS + Prisma + PostgreSQL)

## Prasyarat

Pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/) (versi 18 atau lebih baru)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (untuk menjalankan PostgreSQL lokal)

---

## Panduan Setup Lengkap

### 1. Install Dependencies

Buka terminal di root proyek, lalu jalankan perintah berikut untuk menginstal dependensi:

```bash
# Install dependensi frontend (root)
npm install

# Install dependensi backend
cd apps/api
npm install
cd ../..
```

### 2. Setup Environment Variables (.env)

Proyek ini menggunakan **satu file `.env` terpusat** di root proyek untuk frontend dan backend.

```bash
cp .env.example .env
```
Pastikan file `.env` di root berisi konfigurasi API, Database, dan Security. Contoh untuk local:
```env
VITE_API_BASE_URL="http://127.0.0.1:3001/api/v1"

# Database Local Connection
POSTGRES_DB="stocklife"
POSTGRES_USER="stocklife_user"
POSTGRES_PASSWORD="password_rahasia_anda"
DATABASE_URL="postgresql://stocklife_user:password_rahasia_anda@127.0.0.1:5434/stocklife?schema=public"

PORT=3001
CORS_ORIGIN="http://127.0.0.1:5174,http://localhost:5174"
```

### 3. Jalankan Database Lokal (PostgreSQL)

Jalankan container PostgreSQL menggunakan Docker dari root proyek:
```bash
docker compose up -d db
```

### 4. Setup Database & Seed Data

Setelah database berjalan, lakukan migrasi schema Prisma dan pengisian data awal (seed). Dari root proyek jalankan:

```bash
# Generate Prisma Client
npm run api:prisma:generate

# Menjalankan migrasi database
npm run api:prisma:migrate

# Mengisi database dengan akun default (Seed)
npm run api:seed
```

### 5. Akun Default (Hasil Seed)

Setelah menjalankan `npm run api:seed`, Anda bisa login ke aplikasi menggunakan salah satu akun admin berikut:

**Admin Utama:**
- **Email:** `admin@admin.com`
- **Password:** `admin123`

**Akun Developer:**
- **Email:** `dev@jurnalsaham.local`
- **Password:** `dev-seed-password`

### 6. Menjalankan Aplikasi

Aplikasi berjalan di dua service terpisah (frontend dan backend). Buka dua terminal berbeda dari root proyek:

**Terminal 1 (Backend):**
```bash
npm run api:dev
```
Backend akan berjalan di `http://127.0.0.1:3001/api/v1`

**Terminal 2 (Frontend):**
```bash
npm run dev
```
Frontend akan berjalan di `http://127.0.0.1:5174`

Silakan buka browser dan akses URL frontend tersebut untuk mulai menggunakan aplikasi!

---

## Daftar Scripts Penting

Menjalankan perintah-perintah ini dilakukan dari root proyek:

```bash
npm run dev                 # Menjalankan frontend server
npm run api:dev             # Menjalankan backend server
npm run api:prisma:generate # Generate ulang Prisma client
npm run api:prisma:migrate  # Menjalankan migrasi database
npm run api:seed            # Menjalankan script seeder database
npm run lint                # Linter kode
```

## Struktur Folder

```bash
apps/
  api/   # Backend (NestJS)
  web/   # Frontend (React + Vite)
docs/    # Dokumentasi tambahan
scripts/ # Script utilitas sistem
```
