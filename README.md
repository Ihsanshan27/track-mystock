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

Anda perlu menyiapkan file `.env` untuk frontend maupun backend.

**A. Frontend (.env di root proyek)**
```bash
cp .env.example .env
```
Pastikan file `.env` di root berisi konfigurasi API:
```env
VITE_API_BASE_URL="http://127.0.0.1:3001/api/v1"
```

**B. Backend (apps/api/.env)**
```bash
cd apps/api
cp .env.example .env
cd ../..
```
Pastikan file `apps/api/.env` setidaknya memiliki konfigurasi database default lokal:
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/jurnal_saham?schema=public"
PORT=3001
CORS_ORIGIN="http://127.0.0.1:5174,http://localhost:5174"
DEV_SEED_USER_ID="11111111-1111-1111-1111-111111111111"
DEV_SEED_USER_EMAIL="dev@jurnalsaham.local"
DEV_SEED_WORKSPACE_ID="22222222-2222-2222-2222-222222222222"
DEV_SEED_PORTFOLIO_ID="33333333-3333-3333-3333-333333333333"
```

### 3. Jalankan Database Lokal (PostgreSQL)

Jalankan container PostgreSQL menggunakan Docker dari root proyek:
```bash
docker compose -f docker-compose.backend.yml up -d
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
