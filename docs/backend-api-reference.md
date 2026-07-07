# Backend API Reference

Dokumen ini menjadi referensi API backend aktif untuk migrasi `Jurnal Saham`.

Tujuan dokumen ini:
- jadi sumber utama kontrak endpoint yang sudah benar-benar tersedia
- memudahkan frontend pindah ke backend tanpa menebak payload
- menjadi dokumen yang ikut diupdate setiap phase selesai

Status dokumen saat ini mengikuti implementasi backend aktif setelah cleanup endpoint transisional `sync`, dengan `Phase 5` tersisa pada validasi dataset legacy aktual.

## Base URL

Development lokal:

```text
http://127.0.0.1:3001/api/v1
```

Frontend memakai:

```env
VITE_API_BASE_URL=http://127.0.0.1:3001/api/v1
```

## Auth

Backend sekarang mendukung dua mode auth:
- `Authorization: Bearer <accessToken>` untuk flow auth backend baru
- `x-user-id` transisional untuk modul lama/dev helper yang belum dipotong total

Header yang bisa dipakai:

```http
Authorization: Bearer <access-token>
x-user-id: 11111111-1111-1111-1111-111111111111
x-workspace-id: <optional-workspace-id>
Content-Type: application/json
```

Catatan:
- `Authorization` direkomendasikan untuk flow auth backend baru
- `x-user-id` masih diterima oleh `DevAuthGuard` sebagai fallback transisional
- `x-workspace-id` opsional
- `workspace_id = null` berarti konteks data pribadi

## Response Format

Sukses:

```json
{
  "ok": true,
  "data": {},
  "meta": {}
}
```

Gagal:

```json
{
  "ok": false,
  "error": {
    "code": "HTTP_400",
    "message": "Pesan error",
    "details": {}
  }
}
```

## Endpoint Ringkas

### Auth

`POST /auth/register`

Payload:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

Perilaku:
- membuat user + profile
- akan ditolak jika registrasi publik sedang dinonaktifkan oleh admin
- membuat OTP verifikasi email
- response development saat ini mengembalikan `verificationCode` agar flow bisa dites tanpa mailer

`POST /auth/login`

Payload:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

Perilaku:
- hanya user dengan email terverifikasi yang bisa login
- response mengembalikan `accessToken`, `refreshToken`, expiry, dan payload `user`

`POST /auth/refresh`

Payload:

```json
{
  "refreshToken": "opaque-refresh-token"
}
```

Perilaku:
- refresh token lama langsung di-revoke
- backend mengeluarkan pasangan token baru

`POST /auth/logout`

Payload:

```json
{
  "refreshToken": "opaque-refresh-token"
}
```

Catatan:
- endpoint ini membutuhkan bearer access token aktif

`POST /auth/verify-email`

Payload:

```json
{
  "email": "user@example.com",
  "token": "123456"
}
```

`POST /auth/verify-email/resend`

Payload:

```json
{
  "email": "user@example.com"
}
```

`POST /auth/forgot-password`

Payload:

```json
{
  "email": "user@example.com"
}
```

`POST /auth/reset-password`

Payload:

```json
{
  "email": "user@example.com",
  "token": "123456",
  "newPassword": "new-secret123"
}
```

Perilaku:
- forgot password membuat token reset 6 digit
- response development saat ini mengembalikan `resetToken` agar bisa dites tanpa mailer
- reset password akan me-revoke refresh token aktif user

### Users

`GET /me`

Fungsi:
- mengambil user aktif dan profil dasarnya

### App Settings

`GET /app-settings/public-registration`

Fungsi:
- mengambil status apakah registrasi publik sedang diaktifkan
- endpoint ini bisa dibaca tanpa login agar halaman register bisa menyesuaikan state form

Contoh response:

```json
{
  "enabled": true
}
```

`PATCH /app-settings/public-registration`

Payload:

```json
{
  "enabled": false
}
```

Catatan:
- endpoint ini membutuhkan autentikasi
- saat ini hanya role global `admin` yang boleh mengubahnya
- backend juga menulis audit log `settings.registration_updated`

### Dashboard

`GET /dashboard/summary`

Fungsi:
- mengambil ringkasan dashboard relasional

Query opsional:

```text
/dashboard/summary?market=ALL&usdToIdrRate=16200&initialCapital=10000000&initialCapitalUS=1000&performanceRangeKey=ytd&profitLossRangeKey=1m&customStartDate=2026-06-01&customEndDate=2026-06-29&calendarMonth=2026-06
```

Catatan:
- endpoint ini sekarang tidak hanya mengembalikan `metrics`, tetapi juga `stats`, `balance`, `insights`, `achievements`, dan `recentTrades`
- endpoint ini juga mengembalikan dataset relasional siap pakai untuk:
  - `closedTrades`
  - `rangeSummaries`
  - `profitLossSummary`
  - `profitLossChartData`
  - `calendarMonth`
  - `calendarDays`
  - `performancePortfolioSeries`
- frontend dashboard sekarang memakai payload backend ini untuk summary cards utama, kalender performa, summary/range profit-loss, dan seri return portfolio saat API aktif
- benchmark IHSG masih digabungkan di frontend karena sumber market data-nya terpisah dari backend jurnal

### Analytics

`GET /analytics/summary`

Query opsional:

```text
/analytics/summary?usdToIdrRate=16200&initialCapital=10000000
```

Fungsi:
- mengambil ringkasan analitik berbasis tabel relasional `trades` + `trade_tags`
- mengembalikan payload siap pakai untuk tab overview, charts, dan categories di frontend

Catatan:
- endpoint ini membutuhkan autentikasi
- `usdToIdrRate` dan `initialCapital` saat ini masih boleh dikirim frontend agar hasil analitik tetap konsisten dengan setting user aktif
- fallback kalkulasi lokal di frontend masih dipertahankan sementara untuk degradasi aman bila request gagal

### Workspaces

`GET /workspaces`

Fungsi:
- mengambil daftar workspace yang dimiliki atau diikuti user aktif

`POST /workspaces`

Payload:

```json
{
  "name": "Komunitas Swing Trader"
}
```

Catatan:
- saat ini dibatasi untuk user dengan role global `admin`
- backend otomatis memastikan creator menjadi member `admin` di workspace baru

`GET /workspaces/:id/members`

Fungsi:
- mengambil daftar member workspace

`PUT /workspaces/:id/members`

Payload:

```json
{
  "userId": "uuid-user",
  "role": "trader"
}
```

Catatan:
- berlaku sebagai create/update membership
- role yang diterima: `admin | mentor | trader | viewer`

`DELETE /workspaces/members/:memberId`

Catatan:
- menghapus satu membership workspace
- owner workspace tidak bisa dihapus dari membership-nya sendiri

### Portfolios

`GET /portfolios`

`POST /portfolios`

Payload:

```json
{
  "name": "Portofolio Utama",
  "description": "Opsional",
  "isDefault": false,
  "displayOrder": 0,
  "financeAccountId": null
}
```

`PATCH /portfolios/:id`

`DELETE /portfolios/:id`

`PUT /portfolios/reorder`

Payload:

```json
{
  "orderedIds": ["uuid-1", "uuid-2"]
}
```

### Trades

`GET /trades`

`POST /trades`

Payload:

```json
{
  "portfolioId": "uuid",
  "assetType": "stock",
  "market": "ID",
  "stockCode": "BBCA",
  "dateBuy": "2026-06-24",
  "dateSell": null,
  "buyPrice": 8500,
  "sellPrice": null,
  "lots": 1,
  "buyFee": 0.15,
  "sellFee": 0.25,
  "strategy": "Breakout",
  "reasonEntry": "Opsional",
  "reasonExit": null,
  "emotion": "calm",
  "rating": 4,
  "notes": "",
  "tags": ["breakout"]
}
```

`PATCH /trades/:id`

`DELETE /trades/:id`

### Cashflows

`GET /cashflows`

`POST /cashflows`

Payload:
- `type`: `deposit | withdraw`
- `amount`
- `date`
- `notes?`
- `portfolioId?`
- `linkedFinanceTransactionId?`

`PATCH /cashflows/:id`

Payload: partial dari field `POST /cashflows`

`DELETE /cashflows/:id`

### Dividends

`GET /dividends`

`POST /dividends`

Payload:
- `stockCode`
- `amountPerShare`
- `lots`
- `totalAmount`
- `dateReceived`
- `portfolioId?`

`PATCH /dividends/:id`

Payload: partial dari field `POST /dividends`

`DELETE /dividends/:id`

### Watchlist

`GET /watchlist`

`POST /watchlist`

Payload:
- `stockCode`
- `targetPrice?`
- `targetSellPrice?`
- `reason?`
- `status`: `waiting | entered | passed`
- `priority`: `high | medium | low`
- `manualRecommendation?`: `BUY | SELL | HOLD | NEUTRAL | NONE`
- `categories?`

`PATCH /watchlist/:id`

Payload: partial dari field `POST /watchlist`

`DELETE /watchlist/:id`

### Notes

`GET /notes`

`POST /notes`

Payload:
- `title`
- `content`

`PATCH /notes/:id`

Payload: partial dari field `POST /notes`

`DELETE /notes/:id`

### Finance Accounts

`GET /finance-accounts`

`POST /finance-accounts`

Payload:
- `name`
- `institutionName`
- `type`: `bank | ewallet`
- `openingBalance`
- `isActive?`
- `notes?`

`PATCH /finance-accounts/:id`

Payload: partial dari field `POST /finance-accounts`

`DELETE /finance-accounts/:id`

### Finance Transactions

`GET /finance-transactions`

`POST /finance-transactions`

Payload:
- `accountId`
- `type`: `income | expense | transfer_in | transfer_out | adjustment`
- `amount`
- `date`
- `description`
- `counterpartyAccountId?`
- `linkedCashflowId?`
- `linkedPortfolioId?`
- `cashflowSyncMode?`: `mirror | transfer_to_portfolio | transfer_from_portfolio`
- `category?`
- `transferGroupId?`
- `tags?`

`PATCH /finance-transactions/:id`

Payload: partial dari field `POST /finance-transactions`

`DELETE /finance-transactions/:id`

`POST /finance-transactions/transfer`

Payload:

```json
{
  "fromAccountId": "uuid-a",
  "toAccountId": "uuid-b",
  "amount": 1000000,
  "date": "2026-06-24",
  "description": "Transfer internal"
}
```

Perilaku:
- backend membuat pasangan `transfer_out` dan `transfer_in`
- keduanya dibungkus dalam satu DB transaction
- response mengembalikan `transferGroupId`, `sourceTransaction`, dan `targetTransaction`

### IPO Events

`GET /ipo-events`

`POST /ipo-events`

Payload:
- `stockCode`
- `underwriter?`
- `offeringDate?`
- `ipoDate`
- `offeringPrice`
- `notes?`
- `sector?`
- `registrar?`
- `targetBoard?`
- `bookbuildingStartDate?`
- `bookbuildingEndDate?`
- `lotPoolingAmount?`
- `allotmentDate?`
- `refundDate?`
- `distributionDate?`

`PATCH /ipo-events/:id`

Payload: partial dari field `POST /ipo-events`

`DELETE /ipo-events/:id`

### IPO Accounts

`GET /ipo-accounts`

`POST /ipo-accounts`

Payload:
- `name`
- `email`
- `normalizedKey?`
- `lastUsedAt?`

`PATCH /ipo-accounts/:id`

Payload: partial dari field `POST /ipo-accounts`

`DELETE /ipo-accounts/:id`

### IPO Entries

`GET /ipo-entries`

`POST /ipo-entries`

Payload:
- `ipoEventId`
- `ipoAccountId?`
- `no?`
- `accountName`
- `email`
- `buyPrice`
- `lots`
- `sellPrice`
- `slTl`: `SL | TL | - | NONE`
- `action`: `SELL | KEEP`
- `notes?`

`PATCH /ipo-entries/:id`

Payload: partial dari field `POST /ipo-entries`

`DELETE /ipo-entries/:id`

Catatan:
- backend menyimpan `slTl = "-"` sebagai `NONE` di database, lalu mengembalikannya lagi sebagai `"-"` ke frontend

### Shared Access

`GET /shared-access`

`GET /shared-access/received`

`POST /shared-access`

Payload:

```json
{
  "granteeUserId": "uuid-user-lain",
  "accessLevel": "review",
  "expiresAt": "2026-07-24T00:00:00.000Z"
}
```

`PATCH /shared-access/:id`

Payload:

```json
{
  "accessLevel": "admin",
  "expiresAt": null
}
```

`DELETE /shared-access/:id`

Perilaku:
- owner bisa memberi akses `read`, `review`, atau `admin`
- create akan mengupdate relasi owner->grantee terbaru bila pasangan itu sudah ada
- endpoint `received` hanya mengembalikan akses yang belum expired

### Trade Reviews

`GET /trade-reviews?tradeId=<trade-id>`

`POST /trade-reviews`

Payload:

```json
{
  "tradeId": "uuid-trade",
  "comment": "Eksekusi entry sudah disiplin, exit masih terlalu cepat.",
  "disciplineScore": 8,
  "psychologyScore": 7,
  "riskScore": 8,
  "tags": ["discipline", "risk-management"]
}
```

`PATCH /trade-reviews/:id`

`DELETE /trade-reviews/:id`

Perilaku:
- list review mengharuskan current user punya akses baca ke owner trade
- create review mengharuskan current user punya akses `review` atau `admin`
- review hanya bisa diubah atau dihapus oleh owner trade atau mentor pembuat review

### Report Shares

`GET /report-shares`

`POST /report-shares`

Payload:

```json
{
  "portfolioId": "uuid-portfolio",
  "title": "Ringkasan Juni 2026",
  "shareType": "monthly_performance",
  "isPublic": true,
  "expiresAt": "2026-08-01T00:00:00.000Z"
}
```

`PATCH /report-shares/:id`

`DELETE /report-shares/:id`

`GET /report-shares/key/:shareKey`

Perilaku:
- owner bisa membuat share link dengan `shareKey` acak
- `GET /report-shares/key/:shareKey` tidak wajib auth bila share bersifat public dan belum expired
- share non-public tetap bisa dibuka owner atau user yang punya shared access aktif

### Audit Logs

`GET /audit-logs`

Query opsional:

```text
/audit-logs?limit=50&targetType=trade_review&targetId=<uuid>
```

Perilaku:
- menampilkan log yang dibuat current user atau log yang metadata-nya terkait owner user aktif
- cocok untuk melihat jejak `shared_access`, `trade_reviews`, dan `report_shares`

## Catatan Sinkronisasi

Endpoint koleksi `PUT /sync` sudah dihapus dari backend aktif.

Artinya:
- frontend dan import runtime utama sekarang memakai CRUD granular final
- migrasi legacy `journal_data` dilakukan lewat script backend, bukan lagi lewat endpoint koleksi transisional
- dokumentasi ini hanya mencatat contract yang benar-benar aktif di server sekarang

## Aturan Update Dokumen

Setiap kali endpoint baru ditambahkan atau kontrak payload berubah:
- update file ini di commit yang sama
- update [backend-migration-progress.md](/E:/FullStuck-web-developer/jurnal-saham-Copy/docs/backend-migration-progress.md) bila phase/checklist ikut berubah
- jika setup lokal ikut berubah, update juga [backend-local-setup.md](/E:/FullStuck-web-developer/jurnal-saham-Copy/docs/backend-local-setup.md)
