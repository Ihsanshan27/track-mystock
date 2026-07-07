# Jurnal Saham

Aplikasi jurnal trading saham dengan struktur proyek yang sudah dipisah jelas:

- `apps/web` untuk frontend React + Vite
- `apps/api` untuk backend NestJS + Prisma

## Setup

1. Install dependency:

```bash
npm install
```

2. Buat file `.env` dari contoh:

```bash
cp .env.example .env
```

3. Isi environment frontend:

```env
VITE_API_BASE_URL=http://127.0.0.1:3001/api/v1
```

4. Jalankan PostgreSQL lokal:

```bash
docker compose -f docker-compose.backend.yml up -d
```

5. Siapkan backend database:

```bash
npm run api:prisma:generate
npm run api:prisma:migrate
```

Catatan:
- backend lokal default memakai `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/jurnal_saham?schema=public`

6. Jalankan backend lokal:

```bash
npm run api:dev
```

7. Jalankan frontend:

```bash
npm run dev
```

Lalu buka `http://127.0.0.1:5174`.

## Scripts

```bash
npm run dev
npm run api:dev
npm run api:prisma:generate
npm run api:prisma:migrate
npm run api:seed
npm run lint
npm run build
npm run preview
```

## Struktur Folder

```bash
apps/
  api/   # backend NestJS
  web/   # frontend React + Vite
docs/
scripts/
```
