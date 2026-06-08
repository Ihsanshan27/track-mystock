# UI Design Skill: Premium Rounded Apple-Like Light Mode

## Tujuan Utama

Setiap hasil UI harus memiliki tampilan yang:

- clean
- modern
- premium
- rounded
- soft
- smooth
- minimalis
- nyaman dilihat
- tidak terlalu ramai
- terasa seperti produk teknologi premium

Prioritaskan kualitas visual, konsistensi, spacing, hierarchy, dan detail kecil seperti hover state, focus state, shadow, border, radius, transition, loading, empty state, dan responsive behavior.

Jangan hanya membuat UI “berfungsi”. Buat UI terasa polished dan siap digunakan di production.

---

## Prinsip Desain Utama

Gunakan pendekatan desain seperti aplikasi modern premium dengan karakter:

- Apple-like
- soft UI
- rounded rectangle
- breathable layout
- subtle shadow
- smooth interaction
- calm visual tone
- refined detail
- high-end product feel

UI tidak boleh terlihat seperti template dashboard generik yang kaku, terlalu kotak, terlalu putih kosong, atau terlalu ramai warna.

---

## Light Mode Style

Gunakan light mode yang lembut, bukan putih polos.

Rekomendasi warna:

```css
--background: #f5f5f7;
--surface: #ffffff;
--surface-soft: #fbfbfd;
--border: #e5e5ea;
--text-primary: #1d1d1f;
--text-secondary: #6e6e73;
--text-muted: #8e8e93;
--primary: #007aff;
--primary-hover: #0066d6;
--danger: #ff3b30;
--success: #34c759;
--warning: #ff9500;
```

Aturan warna:

- Background utama gunakan soft gray/off-white.
- Card gunakan putih atau off-white dengan border halus.
- Jangan gunakan terlalu banyak warna mencolok.
- Primary color hanya untuk action penting, active state, link, dan highlight.
- Gunakan warna status dalam versi soft, bukan terlalu tajam.
- Hindari background putih polos full screen tanpa struktur visual.

---

## Border Radius

Gunakan radius besar dan konsisten.

Rekomendasi:

```css
--radius-sm: 10px;
--radius-md: 14px;
--radius-lg: 18px;
--radius-xl: 24px;
--radius-2xl: 32px;
--radius-pill: 999px;
```

Aturan radius:

- Button: 12px–16px atau pill.
- Input: 14px–18px.
- Card: 20px–24px.
- Modal/dialog/sheet: 24px–32px.
- Badge/chip: pill.
- Hindari sudut tajam kecuali benar-benar diperlukan.

Jika menggunakan Tailwind:

```txt
button: rounded-xl / rounded-2xl
input: rounded-2xl
card: rounded-3xl
modal: rounded-3xl
badge: rounded-full
```

---

## Spacing dan Layout

Gunakan spacing yang lega dan konsisten.

Aturan:

- Gunakan sistem spacing 8px.
- Jangan membuat elemen terlalu dempet.
- Card harus memiliki padding lega.
- Section harus memiliki jarak visual yang jelas.
- Layout harus terasa breathable.
- Gunakan max-width pada konten agar tidak terlalu melebar.
- Gunakan whitespace sebagai bagian dari desain.

Rekomendasi:

```txt
Small gap: 8px
Medium gap: 16px
Large gap: 24px
Section gap: 32px–48px
Card padding: 20px–32px
Page padding desktop: 32px–48px
Page padding mobile: 16px–20px
```

---

## Typography

Gunakan typography yang clean, modern, dan mudah dibaca.

Aturan:

- Heading harus jelas dan kuat.
- Body text jangan terlalu kecil.
- Secondary text harus lebih soft.
- Jangan terlalu banyak variasi ukuran dan font weight.
- Gunakan line-height yang nyaman.
- Hindari teks abu-abu yang terlalu tipis sampai sulit dibaca.

Rekomendasi:

```css
--font-sans: Inter, SF Pro Display, SF Pro Text, system-ui, sans-serif;
```

Hierarchy:

```txt
Page title: 28px–36px, weight 700
Section title: 20px–24px, weight 600–700
Card title: 16px–20px, weight 600
Body: 14px–16px, weight 400–500
Small/helper: 12px–14px
```

---

## Shadow dan Border

Gunakan shadow yang lembut, tipis, dan premium.

Jangan gunakan shadow keras, gelap, atau terlalu tebal.

Rekomendasi:

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
--shadow-md: 0 8px 24px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.08);
```

Aturan:

- Card utama boleh menggunakan border + shadow halus.
- Elemen kecil cukup border.
- Modal/dropdown boleh menggunakan shadow lebih jelas tapi tetap lembut.
- Hindari shadow hitam pekat.
- Gunakan border `#E5E5EA` atau warna netral lembut.

---

## Smooth Transition

Semua interaksi harus terasa halus dan natural.

Default transition:

```css
transition: all 240ms cubic-bezier(0.22, 1, 0.36, 1);
```

Jika menggunakan Tailwind:

```txt
transition-all duration-300 ease-out
```

Aturan animasi:

- Hover state harus smooth.
- Focus state harus smooth.
- Modal open/close harus smooth.
- Dropdown open/close harus smooth.
- Sidebar expand/collapse harus smooth.
- Jangan gunakan animasi berlebihan.
- Hindari gerakan terlalu cepat atau mendadak.
- Animasi harus subtle, calm, dan refined.

Contoh interaksi:

```txt
Button hover:
- background sedikit berubah
- shadow sedikit naik
- transform scale 1.01 atau translateY(-1px)

Card hover:
- shadow lebih lembut tapi sedikit lebih terlihat
- border sedikit lebih aktif
- optional translateY(-2px)

Input focus:
- border primary soft
- ring tipis
- shadow ringan
```

---

## Komponen Wajib

Setiap komponen harus dibuat reusable dan konsisten.

Komponen utama:

- Button
- Card
- Input
- Textarea
- Select
- Badge
- Chip
- Modal/Dialog
- Dropdown
- Navbar
- Sidebar
- Page Header
- Table
- Empty State
- Loading State
- Error State
- Toast/Alert

---

## Button

Button harus terasa rounded, solid, dan premium.

Aturan:

- Gunakan padding nyaman.
- Gunakan radius besar.
- Tambahkan transition.
- Hover tidak boleh terlalu agresif.
- Disabled state harus jelas.
- Loading state harus tersedia jika aksi async.

Variant:

```txt
Primary
Secondary
Ghost
Danger
Outline
```

Style:

```txt
Primary:
- background primary
- text white
- hover primary lebih gelap
- shadow halus

Secondary:
- background putih/soft gray
- border halus
- text gelap

Ghost:
- transparent
- hover soft gray
```

---

## Card

Card adalah elemen utama untuk membuat UI terasa premium.

Aturan:

- Gunakan background putih/off-white.
- Gunakan radius 20px–24px.
- Gunakan padding 20px–32px.
- Gunakan border halus.
- Shadow sangat lembut.
- Jangan terlalu banyak card kecil yang berantakan.
- Gunakan heading, subtitle, dan action yang jelas.

Contoh feel:

```txt
soft white card
large rounded corner
light border
subtle floating shadow
comfortable inner padding
```

---

## Form dan Input

Form harus terlihat clean dan mudah digunakan.

Aturan:

- Input rounded.
- Label jelas.
- Helper text tersedia jika diperlukan.
- Error message rapi.
- Focus state halus.
- Jangan membuat input terlalu pendek.
- Gunakan spacing antar field yang nyaman.

State wajib:

```txt
default
hover
focus
error
disabled
readonly
```

---

## Table dan List

Table/list harus mudah dibaca.

Aturan:

- Header table jelas.
- Row spacing nyaman.
- Hover row soft.
- Action button tidak terlalu ramai.
- Gunakan badge untuk status.
- Gunakan empty state jika data kosong.
- Gunakan pagination/filter/search dengan layout rapi.

Hindari table yang terlalu padat dan kaku.

---

## Sidebar dan Navbar

Navigasi harus clean dan tidak berat secara visual.

Aturan:

- Active menu harus jelas tapi soft.
- Gunakan rounded item.
- Icon simple.
- Hover state halus.
- Sidebar tidak boleh terlalu ramai.
- Gunakan grouping jika menu banyak.
- Navbar/header harus memberi ruang pada title dan action utama.

---

## Modal, Dialog, dan Sheet

Modal harus terasa floating, smooth, dan premium.

Aturan:

- Radius besar 24px–32px.
- Shadow lembut.
- Overlay tidak terlalu gelap.
- Animasi open/close halus.
- Padding lega.
- Tombol action jelas.
- Jangan memenuhi layar jika kontennya sedikit.

---

## Empty, Loading, dan Error State

Jangan biarkan halaman kosong tanpa desain.

Empty state harus memiliki:

- icon/illustration sederhana
- title
- deskripsi singkat
- CTA jika perlu

Loading state:

- skeleton lebih baik daripada spinner biasa
- gunakan animasi halus
- jangan membuat layout lompat-lompat

Error state:

- tampilkan pesan jelas
- jangan terlalu teknis
- sediakan aksi retry jika memungkinkan

---

## Responsive Design

UI wajib responsif.

Aturan:

- Mobile-first.
- Desktop harus lega dan rapi.
- Tablet tetap proporsional.
- Jangan biarkan konten terlalu melebar.
- Sidebar di mobile berubah menjadi drawer/bottom nav jika perlu.
- Table di mobile bisa menjadi card list.
- Button/action penting tetap mudah dijangkau.

Breakpoint umum:

```txt
mobile: < 640px
tablet: 640px–1024px
desktop: > 1024px
```

---

## Tailwind CSS Rules

Jika project menggunakan Tailwind CSS:

- Gunakan utility class yang rapi.
- Jangan membuat class terlalu panjang dan tidak terbaca jika bisa dijadikan komponen.
- Buat komponen reusable.
- Konsisten menggunakan rounded, shadow, border, transition.
- Hindari warna random.
- Hindari spacing random.
- Hindari duplicate styling.

Contoh style direction:

```txt
Page:
bg-[#F5F5F7] text-[#1D1D1F]

Card:
bg-white/90 border border-[#E5E5EA] rounded-3xl shadow-sm

Button:
rounded-2xl px-5 py-3 transition-all duration-300 ease-out

Input:
rounded-2xl border border-[#E5E5EA] focus:ring-4 focus:ring-blue-500/10
```

---

## React Component Rules

Jika project menggunakan React:

- Buat komponen UI reusable.
- Jangan styling langsung berulang di banyak tempat.
- Pisahkan komponen layout, form, table, card, modal, dan button.
- Jangan mengubah business logic jika hanya diminta redesign UI.
- Pastikan state loading, error, empty, disabled tetap tertangani.
- Pastikan accessibility dasar tetap baik.

Komponen yang disarankan:

```txt
components/ui/Button.tsx
components/ui/Card.tsx
components/ui/Input.tsx
components/ui/Badge.tsx
components/ui/Modal.tsx
components/ui/Table.tsx
components/layout/Sidebar.tsx
components/layout/Navbar.tsx
components/layout/PageHeader.tsx
```

---

## Accessibility

UI tetap harus usable.

Aturan:

- Kontras teks harus cukup.
- Button harus punya state focus.
- Input harus punya label.
- Icon-only button harus punya aria-label.
- Jangan mengandalkan warna saja untuk status.
- Ukuran click target harus nyaman.
- Keyboard navigation tidak boleh rusak.

---

## Hal yang Harus Dihindari

Jangan membuat UI dengan ciri berikut:

- terlalu kotak
- terlalu putih polos
- terlalu ramai warna
- terlalu banyak shadow
- terlalu banyak border tebal
- spacing sempit
- typography tidak konsisten
- button terlalu kecil
- input terlalu kaku
- card terlalu padat
- hover terlalu heboh
- animasi terlalu cepat
- desain seperti template admin gratisan
- gradient berlebihan
- glassmorphism berlebihan
- warna neon mencolok
- layout tidak responsif

---

## Instruksi Saat Redesign

Saat diminta memperbaiki UI:

1. Analisis struktur halaman.
2. Pertahankan business logic.
3. Rapikan layout.
4. Buat design system konsisten.
5. Perbaiki spacing dan hierarchy.
6. Terapkan rounded style.
7. Terapkan smooth transition.
8. Perbaiki responsive behavior.
9. Tambahkan empty/loading/error state jika belum ada.
10. Pastikan hasil terlihat premium dan production-ready.

---

## Output yang Diharapkan

Setiap hasil coding UI harus:

- konsisten antar halaman
- memiliki komponen reusable
- menggunakan light mode soft
- rounded secara konsisten
- memiliki transisi smooth
- punya spacing lega
- punya typography rapi
- responsive
- tidak mengubah logic utama
- terlihat polished

---

## Prompt Internal untuk AI Coding Agent

Ketika mengerjakan UI, ikuti arahan berikut:

```txt
Redesign the UI into a premium Apple-like light mode interface with soft rounded shapes, breathable spacing, subtle shadows, refined typography, and smooth micro-interactions. Use an off-white background, white cards, light borders, large border-radius, calm colors, and consistent reusable components. Keep the business logic unchanged. Improve layout consistency, responsive behavior, accessibility, hover/focus/active states, loading states, empty states, and error states. Avoid generic admin-dashboard looks, harsh shadows, sharp corners, excessive colors, and clutter.
```

---

## Final Quality Checklist

Sebelum menyelesaikan perubahan UI, pastikan:

- [ ] Background tidak putih polos.
- [ ] Card menggunakan rounded besar.
- [ ] Button rounded dan punya hover smooth.
- [ ] Input rounded dan focus state rapi.
- [ ] Typography konsisten.
- [ ] Spacing lega.
- [ ] Border halus.
- [ ] Shadow lembut.
- [ ] Warna tidak terlalu banyak.
- [ ] Active state jelas.
- [ ] Empty state tersedia.
- [ ] Loading state rapi.
- [ ] Error state jelas.
- [ ] Mobile responsive.
- [ ] Tidak ada logic utama yang rusak.
- [ ] Tampilan terasa premium, clean, soft, dan polished.

```

```
