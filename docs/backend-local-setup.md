# Backend Local Setup

Panduan ini dipakai untuk menjalankan backend NestJS + PostgreSQL lokal selama migrasi Phase 0 dan Phase 1.

## 1. Jalankan PostgreSQL lokal

Dari root project:

```bash
docker compose -f docker-compose.backend.yml up -d
```

Database lokal default:

- host: `127.0.0.1`
- port: `5433`
- database: `jurnal_saham`
- user: `postgres`
- password: `postgres`

## 2. Siapkan environment backend

Salin `apps/api/.env.example` menjadi `apps/api/.env`, lalu sesuaikan bila perlu.

Nilai minimal yang perlu ada:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/jurnal_saham?schema=public"
PORT=3001
CORS_ORIGIN="http://127.0.0.1:5174,http://localhost:5174"
DEV_SEED_USER_ID="11111111-1111-1111-1111-111111111111"
DEV_SEED_USER_EMAIL="dev@jurnalsaham.local"
DEV_SEED_WORKSPACE_ID="22222222-2222-2222-2222-222222222222"
DEV_SEED_PORTFOLIO_ID="33333333-3333-3333-3333-333333333333"
```

## 3. Generate Prisma client dan migrate schema

```bash
cd apps/api
npm install
npm run prisma:generate
npm run prisma:migrate
```

## 4. Seed data dev minimum

Perintah ini membuat:

- 1 user dev
- 1 profile
- 1 workspace
- 1 workspace member
- 1 portfolio default

Jalankan:

```bash
cd apps/api
npm run seed:dev
```

## 5. Jalankan backend

Dari root project:

```bash
npm run api:dev
```

Catatan:
- Script `api:dev` sekarang tidak lagi memakai `tsx watch`.
- Backend dev dijalankan lewat `tsc --watch` + `node --watch dist/main.js` supaya dependency injection NestJS tetap stabil dan tidak memunculkan error seperti `Cannot read properties of undefined (reading 'login')`.

Backend aktif di:

- `http://127.0.0.1:3001/api/v1`

## 6. Sambungkan frontend ke backend

Frontend sekarang berada di `apps/web`, tetapi environment `VITE_*` tetap dibaca dari root project saat menjalankan `npm run dev`.

Di root `.env` atau `.env.local`, isi:

```env
VITE_API_BASE_URL="http://127.0.0.1:3001/api/v1"
```

Frontend kemudian akan mulai membaca domain Phase 1 dari backend untuk:

- `portfolios`
- `trades`
- `cashflows`
- `dividends`
- `watchlist`
- `notes`

## 7. Migrasi data lama dari `journal_data`

Jika tabel `journal_data` masih tersedia dan berisi data lama:

```bash
cd apps/api
npm run migrate:journal-data
npm run lock:journal-data
npm run verify:journal-data
```

Script migrasi saat ini memindahkan:

- `portfolios`
- `trades`
- `cashflows`
- `dividends`
- `watchlist`
- `notes`

## Catatan

- Backend auth saat ini masih memakai guard transisional berbasis `x-user-id`.
- Untuk development, pastikan user frontend/test memakai id yang sama dengan hasil seed atau header dev yang setara.
- ID legacy non-UUID dari data lama akan dinormalisasi saat sync API dan saat migrasi `journal_data`.
