# Panduan Deployment Docker (Lokal & VPS)

Dokumen ini menjelaskan arsitektur Docker dari **StockLife** dan memberikan panduan _step-by-step_ cara menjalankannya, baik untuk simulasi di komputer lokal maupun di VPS (Production).

---

## 🏗 Konsep Arsitektur (Cara Kerjanya)

Arsitektur aplikasi StockLife menggunakan pola **Nginx Reverse Proxy**. Ini ibarat membangun sebuah restoran dengan penjagaan ketat:

1. **Ruang Brankas (Database PostgreSQL)**
   - Container: `stocklife-db`
   - Fungsi: Menyimpan seluruh data secara terisolasi.
   - Keamanan: Untuk development, port diekspos di `5434` agar tidak bentrok dengan Postgres bawaan PC Anda. Di Production, disarankan menghapus block `ports` agar database tidak bisa diakses sama sekali dari luar jaringan Docker.

2. **Dapur Restoran (Backend API NestJS)**
   - Container: `stocklife-api`
   - Fungsi: Menjalankan logika bisnis (Prisma, perhitungan trading, otentikasi).
   - Keamanan: Sama seperti database, berjalan murni di _background_ dan tidak bisa diakses langsung dari internet publik.

3. **Etalase Depan & Resepsionis (Frontend Web + Nginx)**
   - Container: `stocklife-web`
   - Fungsi: Membungkus _source code_ React menjadi _build statis_ dan melayaninya via Nginx.
   - Keamanan & Proxy: Inilah satu-satunya gerbang yang terbuka (Port 80 HTTP). Saat pengguna mengakses web, Nginx melayani file web (HTML/JS). Namun, jika kode web memanggil `/api/v1/xxx`, **Nginx otomatis meneruskannya (Proxy) ke Dapur Restoran (Backend API)**.

**Keuntungan Arsitektur Ini:**

- **Bebas Masalah CORS:** Browser pengguna mengira API dan Frontend berada di satu alamat dan port yang sama.
- **Konfigurasi Mudah:** Tidak perlu repot mencatat IP Publik atau _hardcode_ nama domain ke `.env` React Anda.
- **Sangat Aman:** Hacker dari luar hanya melihat Nginx tanpa tahu port maupun struktur backend di belakangnya.

---

## 💻 Panduan Menjalankan Docker di Lokal (Simulasi)

Gunakan langkah ini jika Anda ingin mengetes lingkungan _production_ di laptop Anda (memastikan build React dan API sukses) sebelum benar-benar _upload_ ke VPS.

### Langkah-langkah:

1. Pastikan **Docker Desktop** sudah berjalan di laptop Anda.
2. Buka terminal di folder root proyek (folder di mana file `docker-compose.yml` berada).
3. Jalankan perintah _build_ dengan menunjuk pada file `.env.production` (agar tidak merusak `.env` _development_ lokal Anda):
   ```bash
   docker compose --env-file .env.production up -d --build
   ```
4. Tunggu beberapa menit. Docker akan mengunduh _images_ dan melakukan _compile_ untuk Frontend dan Backend.
5. Setelah _containers_ berjalan, **Migrasikan Database** (karena simulasi ini menggunakan database kosong yang baru):

   ```bash
   docker exec -it stocklife-api npm run prisma:deploy
   ```

6. Buka _browser_ dan kunjungi: **`http://localhost`** (Bukan `localhost:5174` atau `3001`, cukup `localhost` karena Nginx berjalan di Port standar 80).

_Untuk mematikan:_

```bash
docker compose down
```

---

## 🚀 Panduan Deployment ke VPS (Production)

Langkah ini dilakukan di dalam server VPS Anda.

### Langkah-langkah:

1. **Login ke VPS** via SSH.
2. Pastikan `docker` dan `docker-compose-plugin` telah di-install di OS VPS Anda.
3. Kloning (_clone_ / _copy_) _source code_ proyek ini ke dalam VPS.
4. Masuk ke folder proyek: `cd /path/ke/proyek`.
5. Salin dan buat file `.env` produksi (Langkah sangat krusial!):
   ```bash
   cp .env.production .env
   nano .env
   ```
   **GANTI NILAI `POSTGRES_PASSWORD`** dengan password acak dan kuat! Lalu _save_.
6. Nyalakan aplikasi (kali ini tidak perlu `--env-file` karena kita sudah punya file `.env` asli):
   ```bash
   docker compose up -d --build
   ```
7. Jalankan migrasi database agar tabel-tabelnya siap:
   ```bash
   docker exec -it stocklife-api npm run prisma:deploy
   
   # Untuk membuat data awal (termasuk akun admin@admin.com / admin123)
   docker exec -it stocklife-api node dist/scripts/seed-dev.js
   ```
8. Selesai! Buka IP Publik VPS Anda di _browser_. Aplikasi StockLife Anda sudah _Live_!

---

## 🔄 Cara Melakukan Update Jika Ada Perubahan Kode

Jika suatu saat Anda mengubah kode (menambah fitur, memperbaiki bug) dan ingin memperbarui aplikasi di VPS, ikuti langkah ini:

1. **Perbarui Kode di VPS**: Tarik (_pull_) kode terbaru dari Git atau *copy-paste* file yang berubah ke dalam VPS Anda.
2. **Rebuild Container**: Jalankan perintah berikut agar Docker meng-compile ulang kode baru Anda dan me-_restart_ aplikasi tanpa *downtime* yang lama:
   ```bash
   docker compose up -d --build
   ```
3. **Migrasi Database (OPSIONAL)**: Jika perubahan Anda melibatkan penambahan/perubahan struktur database (mengubah file `schema.prisma`), jalankan perintah migrasi ini lagi:
   ```bash
   docker exec -it stocklife-api npm run prisma:deploy
   ```

---

## 🌐 Custom Domain & Reverse Proxy (Multi-Aplikasi di 1 VPS)

Jika VPS Anda sudah menjalankan aplikasi lain di Port `80` (misalnya web server Nginx lain), Anda akan mengalami bentrok saat menjalankan kontainer Jurnal Saham. Solusinya adalah dengan mengubah port aplikasi Jurnal Saham, lalu membuat Nginx Proxy untuk mengarahkan nama domain ke port tersebut.

### 1. Ubah Port di docker-compose.yml
1. Buka file konfigurasi: `nano docker-compose.yml`
2. Cari bagian `web:`, lalu ubah port-nya ke port yang kosong (misal `8080`):
   ```yaml
   web:
     # ... konfigurasi lain ...
     ports:
       - "8080:80"
   ```
3. Jangan lupa buka/izinkan port `8080` pada setelan Firewall (Security Group) VPS Anda.
4. Restart docker: `sudo docker compose up -d --build`.

### 2. Setup Domain Gratis (Misal: DuckDNS)
Jika Anda belum punya domain, Anda bisa mendapatkannya secara gratis:
1. Buat akun di [DuckDNS.org](https://www.duckdns.org/).
2. Buat domain (contoh: `stocklife.duckdns.org`).
3. Ganti IP-nya dengan IP Publik VPS Anda, lalu simpan.

### 3. Konfigurasi Nginx di Ubuntu (Reverse Proxy)
Beri tahu Nginx utama di VPS untuk melayani domain tersebut:
1. Buat file konfigurasi baru: 
   ```bash
   sudo nano /etc/nginx/sites-available/stocklife
   ```
2. Isikan dengan konfigurasi berikut:
   ```nginx
   server {
       listen 80;
       server_name stocklife.duckdns.org; # Ganti dengan domain Anda

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
3. Simpan, lalu aktifkan konfigurasi dan restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/stocklife /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### 4. Amankan dengan HTTPS (Gembok Hijau Gratis)
Agar web aman, pasang Sertifikat SSL Let's Encrypt menggunakan Certbot:
```bash
sudo apt-get install certbot python3-certbot-nginx -y
sudo certbot --nginx -d stocklife.duckdns.org
```
Ikuti instruksi di layar, dan web Jurnal Saham Anda akan langsung bisa diakses lewat `https://stocklife.duckdns.org`!
