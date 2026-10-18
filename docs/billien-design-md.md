# Spesifikasi Desain Antarmuka "Billien" (Design System & UI Blueprint)

Dokumen ini dibuat berdasarkan ekstraksi visual antarmuka dasbor modern untuk standar pengembangan sistem desain dan implementasi frontend proyek **Billien**.

---

## 1. Ringkasan Layar & Konteks

- **Nama Layar**: Billien Dashboard & Vocab Tracking Management
- **Tipe Antarmuka**: Web Desktop Dashboard (Single Page Application)
- **Deskripsi Singkat**: Antarmuka dasbor manajemen pelacakan kosa kata/tugas "Billien" dengan gaya visual bersih, modern, dan terstruktur. Menggunakan tata letak dua kolom (sidebar navigasi + area kerja utama) dengan sistem pengelompokan tabel terukur (To Do, In Progress, Done).

---

## 2. Toko Warna & Tema (Color Palette)

### Primary / Accent

- **Primary Dark (Action / Buttons)**: `#0F172A` / `#18181B` (Digunakan untuk tombol utama seperti `+ Create New`, teks aktif, dan header utama).
- **Workspace Accent (Active Brand)**: `#7C3AED` / `#9333EA` (Warna ungu aksen pada ikon proyek/workspace aktif).

### Secondary / Neutral

- **Main Background**: `#FFFFFF` (Area konten tabel utama).
- **Sidebar Background**: `#FAFAFA` / `#F8FAFC` (Latar belakang sidebar kiri).
- **Borders & Dividers**: `#E4E4E7` / `#F1F5F9` (Garis pembatas tabel dan komponen, 1px solid).
- **Group Header Background**: `#F9FAFB` / `#F8FAFC` (Latar belakang baris pengelompokan seperti _To do_, _In Progress_).

### Text Colors

- **Primary Text**: `#09090B` / `#111827` (Judul halaman, nama tugas/kata).
- **Secondary Text**: `#64748B` / `#6B7280` (Deskripsi, breadcrumbs, tanggal, label sidebar).
- **Muted Text**: `#94A3B8` / `#A1A1AA` (Placeholder, judul seksi sidebar, ikon pudar).

### Feedback / Priority State Colors (Soft Badges)

- **High / Hard Priority**:
  - Background: `#FEE2E2` (Soft Red)
  - Text: `#DC2626` / `#EF4444`
- **Medium Priority**:
  - Background: `#FEF3C7` (Soft Yellow/Orange)
  - Text: `#D97706`
- **Easy / Low Priority**:
  - Background: `#DCFCE7` (Soft Green)
  - Text: `#16A34A`
- **Type Indicator Dots**: `#3B82F6` (Testing/Blue), `#0EA5E9` (Implementation/Cyan), `#6366F1` (Documentation/Indigo).

---

## 3. Tipografi (Typography)

- **Font Family**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`

### Skala Hierarki:

1. **Display / H1 (Title)**:
   - Ukuran: `20px` - `22px`
   - Ketebalan: `600` (SemiBold) / `700` (Bold)
   - Line Height: `1.2`
2. **Section Header / H2 (Group Row)**:
   - Ukuran: `14px`
   - Ketebalan: `600` (SemiBold)
   - Line Height: `1.4`
3. **Table Header & Column Labels**:
   - Ukuran: `12px`
   - Ketebalan: `500` (Medium)
   - Color: Muted Gray (`#64748B`)
4. **Body Text (Task/Word Name)**:
   - Ukuran: `13px` - `14px`
   - Ketebalan: `600` (SemiBold) untuk Judul, `400` (Regular) untuk Deskripsi
5. **Caption & Badges**:
   - Ukuran: `11px` - `12px`
   - Ketebalan: `500` (Medium)

---

## 4. Tata Letak & Spasi (Layout & Spacing)

- **Grid & Container**:
  - **Sidebar**: Lebar tetap `240px` - `260px`, opsi _fixed_ di sisi kiri.
  - **Main Content Area**: `flex-1` (Mengisi sisa area layar dengan padding luar `24px`-`32px`).
- **Sistem Spasi**: Berbasis kelipatan 4px / 8px (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`).
- **Border Radius**:
  - **Buttons & Badges**: `rounded-md` (`6px`) hingga `rounded-lg` (`8px`).
  - **Pill Badges (Priority)**: `rounded-full` (`9999px`).
  - **Sidebar Items**: `rounded-lg` (`8px`).
- **Shadow & Depth**:
  - Menggunakan pendekatan _Flat Minimalist_ dengan batas garis tipis (`1px border`) tanpa _heavy box-shadow_.
  - Shadow mikro pada avatar stack & tombol aksi utama (`shadow-sm`).

### Breakpoint & Perilaku Responsif

- `lg` (`1024px`) adalah batas antara **desktop** dan **mobile**.
- **Desktop** (`>= lg`): dua kartu header (judul + menu view, streak + menu akun) dan dua kolom (daftar + detail).
- **Mobile** (`< lg`): _app shell_ dengan **app bar** tetap di atas dan **bottom navigation** tetap di bawah; konten satu kolom dan di-scroll normal.
- **Routing**: Discovery dan Remembered adalah **dua halaman terpisah** (`/` dan `/remembered`), bukan satu halaman dengan toggle state. Perpindahan view memakai `<Link>`, dan status aktif diturunkan dari `usePathname()`. Chrome (header, bottom nav, dialog akun) dibagi lewat satu layout route group.
- **Safe area**: bottom bar wajib memberi `env(safe-area-inset-bottom)` agar tidak tertutup home indicator iOS; konten diberi padding bawah `calc(5rem + env(safe-area-inset-bottom))` dan padding atas `4.5rem` (tinggi app bar + jarak).
- **Touch target**: setiap kontrol interaktif minimal `40×40px` (idealnya `44×44px`), termasuk tombol ikon dan chip filter.
- **Input**: ukuran font minimal `16px` di mobile agar iOS tidak melakukan auto-zoom saat fokus; desktop tetap `13px`.

---

## 5. Rincian Komponen (Component Breakdown)

### A. Left Navigation Sidebar

- **Brand Logo**: Ikon merek ("Taskque" / "Billien") + nama aplikasi di bagian paling atas.
- **Navigation Sections**:
  - **MAIN MENU**: Dashboard (state aktif dengan background abu-abu terang `#F1F5F9`), My Tasks, Project, Calendar.
  - **WORKSPACES**: Daftar ruang kerja dengan indikator ikon berwarna & tombol aksi `+` untuk membuat workspace baru.
  - **GENERAL**: Account Settings, Security, Help & Support.

### B. Top Header & Control Bar

- **Berlaku pada desktop** (`>= lg`). Di mobile digantikan oleh **App Bar** (lihat E.1).
- **Breadcrumb Navigation**: Menampilkan jalur lokasi (`Workspaces / UIGO Studio / Resarc AI Research`).
- **Utility Actions (Kanan Atas)**:
  - Tombol Pencarian (Ikon Kaca Pembesar).
  - Tombol Notifikasi (Ikon Lonceng dengan badge status).
  - Profil Pengguna (Avatar).
- **Page Header**:
  - Judul Halaman Utama & Deskripsi/Sub-judul.
  - Avatar Stack Anggota Tim (+Indikator jumlah anggota tersisa).
  - Tombol Aksi Anggota `+` & Primary CTA Button (`+ Create New`).

### C. Sub-Navigation / Tab Bar

- **View Switcher Tabs**: Overview, Board, **List** (Aktif - dengan garis bawah hitam), Table, Timeline.
- **Secondary Actions**: Tombol Share (Ikon Bagikan) dan Filter (Ikon Corong Filter).

### D. Grouped Table View (Main Content)

- **Group Accordion Header**:
  - Panah _Collapse/Expand_, Nama Status (_To do_, _In Progress_, _Done_), dan Counter Badge (jumlah item).
  - Aksi Kelompok (Ikon Urutkan, Filter, Tambah Baru `+`, dan Menu More `...`).
- **Table Columns**:
  1. **Checkbox & Task Name**: Kotak centang + Judul Teks Tebal.
  2. **Descriptions**: Deskripsi ringkas 1-2 baris.
  3. **People**: Avatar bertumpuk penanggung jawab.
  4. **Type**: Badge indikator tipe tugas/kata dengan titik warna.
  5. **Timeline Date**: Format tanggal (`Oct 10, 2025`).
  6. **Priority**: Badge berbentuk _pill_ lembut (`Hard`, `Medium`, `Easy`).

### E. Mobile App Shell (App Bar & Bottom Navigation)

Dirancang agar terasa seperti aplikasi native, bukan halaman web yang diperkecil.
Dua batang tetap (fixed) membingkai konten: app bar di atas, bottom navigation di bawah.

#### E.1 App Bar (atas, tinggi `56px`)

- Posisi `fixed` di tepi atas, latar `#FFFFFF`, garis bawah `1px` `#E4E4E7`, `z-index` 40.
- **Kiri** (brand, boleh `truncate`):
  - Judul `Billien` — 15px / `600` / `#09090B`.
  - Deskripsi `Lexical Mastery Platform` — 10px / `500` / `#64748B`.
- **Kanan**:
  - **Guest** → tombol `Sign in`: ikon `LogIn` 15px + label 13px/`600`, tinggi `40px`, `rounded-lg`, `border` `#E4E4E7`, latar putih.
  - **Signed in** → pill streak saja (ikon `Flame` 13px + angka 12px/`600`, `bg #FEF3C7`, `text #D97706`, `rounded-full`, tinggi `40px`). **Tidak ada tombol 3 titik / menu akun di app bar mobile**: menu `Profile` sudah tersedia di bottom navigation, dan `Sign out` dipindahkan ke halaman Profile agar bar tetap ringkas dan tidak ada dua jalur ke aksi yang sama.
  - **Session pending** → satu placeholder `animate-pulse` untuk pill streak.

* Menu akun (dropdown `w-56` berisi identitas, `Profile`, dan `Sign out`) hanya ada di header desktop.

- **Tidak ada segmented menu di app bar**; perpindahan view milik bottom navigation.

#### E.2 Bottom Navigation (bawah, tinggi `56px` + safe area)

- Posisi `fixed` di tepi bawah, latar `#FFFFFF`, garis atas `1px` `#E4E4E7`, `z-index` 40, `aria-label="Navigasi utama"`.
- Item sejajar rata (`flex-1`), tiap item terdiri dari:
  - Ikon 18px di dalam pill `rounded-full` (`h-7`, `min-w-12`).
  - Label 10px / `500` di bawah ikon.
- **State aktif**: pill `bg #F5F3FF`, ikon `#7C3AED`, label `#7C3AED`, plus `aria-current="page"`.
- **State non-aktif**: ikon `#94A3B8`, label `#64748B`.
- **State fokus**: `outline` 2px `#7C3AED` di dalam batas item (offset negatif) agar tidak terpotong layar.
- Item standar: `Discovery` (`/`) dan `Remembered` (`/remembered`), berupa `<Link>` dengan `aria-current="page"` pada halaman aktif; lalu slot kontekstual:
  - **Signed in** → `Profile` (tautan ke `/profile`).
  - **Guest** → `Sign in` (membuka modal autentikasi).
- Maksimal **5 item**. Jika menu bertambah, sisanya dipindahkan ke halaman `More`, bukan mengecilkan ikon.
- Bottom bar tidak ditampilkan pada halaman `/profile` (halaman itu punya tautan kembali sendiri).

#### E.3 Aturan Konten Mobile

- Satu kolom, lebar penuh, padding horizontal `16px`.
- Panel **Detail Words** terbuka sebagai **dialog (bottom-sheet style modal)** di atas daftar, bukan didorong ke bawah daftar. Alasannya: daftar tetap di tempatnya, navigasi kembali cukup satu tap, dan kata berikutnya tidak perlu scroll jauh.
  - Panel: `rounded-xl` `bg #FFFFFF`, `max-w-lg`, `max-height: 100%` dari area overlay, disusun sebagai flex column.
  - **Header panel fixed**: judul, badge `Already memorised`, dan tombol tutup `X` berada **di luar** area scroll, sehingga tombol tutup selalu terlihat berapa pun jauh isi di-scroll. Hanya badan detail yang men-scroll (`min-h-0 flex-1 overflow-y-auto overscroll-contain`).
  - **Jarak dari bottom navigation**: overlay memakai `padding: 16px` dengan tambahan bawah `calc(5rem + env(safe-area-inset-bottom))`, yaitu tinggi bottom bar + celah. Panel tidak boleh menempel atau tertutup bottom bar.
  - Overlay: `bg-black/50`, klik overlay atau `Escape` menutup dialog, fokus kembali ke pemicu, dan scroll halaman dikunci selama dialog terbuka.
  - Tombol tutup: ikon `X` 16px dalam target `36×36`, `aria-label="Close detail"`.
  - Dialog memakai `role="dialog"` + `aria-modal="true"` + `aria-label="Detail Words"`.
  - Pada `lg` ke atas, panel tetap menjadi kolom kanan (bukan dialog) dan header-nya ikut scroll bersama isi.
- Deskripsi pada baris daftar dibatasi **maksimal 2 baris** dengan ellipsis. Baris tersimpan menampilkan terjemahan 1 baris + definisi Inggris 1 baris; baris tanpa terjemahan menampilkan definisi maksimal 2 baris. Jangan menambahkan `block` pada elemen ber-`line-clamp` karena `display` akan menimpa `-webkit-box` dan clamp berhenti bekerja.
- Scroll memakai halaman (bukan scroll ganda di dalam kartu); `overflow` internal hanya aktif di desktop.
- Tombol hapus pada baris selalu terlihat di mobile (tidak bergantung hover).
- Modal (auth, onboarding bahasa) memakai `max-w` dengan margin `16px` dan boleh di-scroll bila melebihi tinggi layar.

#### E.4 Search Field (tanpa tombol submit)

Satu field pencarian dipakai kedua view. Tidak ada tombol submit dan **tidak perlu menekan Enter**.

- **Bentuk**: `rounded-lg`, ikon `Search` 16px di kiri, tinggi `40px` di mobile / `36px` di desktop, `bg-subtle` → `bg-surface` saat fokus dengan `border-accent`.
- **Font**: `16px` di mobile (mencegah auto-zoom iOS), `13px` di desktop.
- **Tombol clear**: ikon `X` 14px dalam bulatan `24px`, hanya muncul saat field berisi; `aria-label="Clear search"`.
- **Debounce**: `450ms` setelah ketikan terakhir.
- **Validasi**: minimal `2` karakter dan hanya `[a-z'-]`; input lain tidak dikirim ke API.
- **Discovery**: hasil pencarian tampil sebagai **satu baris** di daftar; panel detail tetap tertutup sampai baris diklik.
- **Remembered**: pencarian memfilter daftar secara lokal dan **instan** (tanpa debounce) karena tidak ada request jaringan.
- **State yang wajib ada**:
  1. _Idle_ — belum ada ketikan: petunjuk singkat, tanpa skeleton.
  2. _Terlalu pendek / karakter tidak valid_ — petunjuk validasi, tanpa request.
  3. _Loading_ — skeleton baris selama debounce + fetch.
  4. _Tidak ditemukan_ — pesan netral + saran periksa ejaan.
  5. _Gagal jaringan_ — `role="alert"` + tombol **Try again**.

Tidak ada chip filter (All / Verbs / Adjectives / Nouns). Filter POS dihapus agar daftar tetap fokus pada pencarian; pengurutan hanya tersedia di Remembered.

#### E.5 Ilustrasi State Kosong & Dialog

Tiga ilustrasi 3D tersedia di `public/assets` dan dipakai lewat `components/ui/empty-state.tsx` (atau `next/image` langsung di dalam dialog). Semuanya ber-alpha, jadi boleh diletakkan langsung di atas `bg-surface` maupun `bg-subtle` tanpa kotak pembungkus.

| Aset               | Dipakai di                                                             | Tinggi render               |
| ------------------ | ---------------------------------------------------------------------- | --------------------------- |
| `empty.png`        | Discovery idle, kata tidak ditemukan, filter kosong, Remembered kosong | `h-28` (112px)              |
| `hello.webp`       | Modal sign-in, prompt sign-in di Remembered                            | `h-32` / `h-36` (128–144px) |
| `preferences.webp` | Modal onboarding bahasa, modal pemilih bahasa di profile               | `h-20` – `h-28` (80–112px)  |

Aturan:

- Ilustrasi bersifat **dekoratif**: `alt=""` + `aria-hidden="true"`, makna dibawa oleh judul dan deskripsi.
- Komposisi state kosong: ilustrasi → judul 14px/`600` `#09090B` → deskripsi 12px `#64748B` maksimal `max-w-xs` → aksi opsional, semuanya rata tengah.
- Komposisi dialog: ilustrasi di tengah, lalu judul dan deskripsi juga rata tengah, sedangkan daftar pilihan dan tombol tetap rata kiri/penuh.
- Selalu gunakan `next/image` dengan `sizes` sesuai tinggi render agar tidak mengunduh berkas 2048px.
- State validasi singkat (mis. input < 2 huruf) **tidak** memakai ilustrasi agar tidak berkedip setiap ketikan.

### F. Detail Words Panel

Panel kanan (desktop) atau dialog (mobile). Semua kartu di dalam panel memakai `rounded-lg` (`8px`) dan chip memakai `rounded-md` (`6px`) — tidak ada `rounded-full` kecuali status pill prioritas.

Panel **tidak** memuat kartu ajakan drill; fitur drill dihapus dari detail kata.

#### F.1 Urutan Blok

1. **Panel header** — label `Detail Words` 12px/`600` + tombol tutup `X` (`aria-label="Close detail"`). Garis bawah `1px` `#F1F5F9` **harus menyentuh tepi kiri dan kanan kartu**: header memakai margin negatif sebesar padding kartu (`-mx-4 px-4`) agar border tidak terlihat menjorok ke dalam.
2. **Identitas kata** — kata 26px/`700` `wrap-anywhere`; baris kedua berisi fonetik 13px `italic` `#64748B` + chip POS; tombol `Listen` varian compact (`h-8`, 12px) rata kanan atas.
3. **Meaning** — judul seksi + isi, tanpa kartu pembungkus (flat).
4. **Word Forms** — chip datar, hanya dirender bila ada.
5. **Example Sentences** — kartu bernomor, maksimal 3.
6. **Synonyms / Antonyms** — baris chip, hanya dirender bila ada.
7. **Status hafalan** — satu kartu ringkas: status, jumlah review, dan aksi hapus.
8. **Source** — tautan lisensi, dipisah garis atas.

Jarak antar blok `20px` (`mt-5`) dan jarak di dalam blok `16px` (`py-4`, `gap-4`) agar tidak terasa padat.

#### F.2 Blok Meaning

- Header kartu: label 11px/`700` uppercase `#64748B` + badge `AI` (bila hasil fallback) + ikon `Languages`.
- Terjemahan **dikelompokkan per part of speech**, bukan per sense. Satu label POS hanya muncul sekali; kata digabung dan di-dedup, maksimal 6 per POS.
- Label POS: 10px/`600` uppercase `#94A3B8`.
- Kata terjemahan: chip `rounded-md`, `border #E4E4E7`, `bg #FFFFFF`, 13px/`500` `#09090B`.
- Definisi bahasa Inggris ada di dalam `<details>` dengan ikon `ChevronRight` yang berputar 90° saat terbuka; default tertutup. Ringkasan 12px `#64748B`.
- Bila tidak ada terjemahan: teks 13px `#64748B` "No translation available for this language yet." dan definisi Inggris tetap dapat dibuka.

#### F.3 Blok Lain

- **Word Forms**: chip 11px/`500`, `rounded-md`, dipisah `gap-1.5`; tidak memakai pemisah `·`.
- **Example Sentences**: kartu `rounded-lg` `border #E4E4E7` `bg #FFFFFF`, angka di bulatan `rounded-md` `bg #F5F3FF` `text #7C3AED`, teks 13px `#3F3F46`.
- **Synonyms**: chip `border-line` `bg-surface` `text-ink-soft`. **Antonyms**: chip `border-hard-soft` `bg-hard-soft/60` `text-hard`.
- **Status hafalan**: kartu ringkas `bg #FAFAFA` berisi ikon `CheckCircle2` `#16A34A`, jumlah review (`N total reviews` / `No reviews yet`), dan satu tombol **`Remembered`** (compact primary, ikon `Check`, `hover:scale-105`) di sisi kanan.
  - Tombol ini memanggil `POST /api/words/[id]/review` dengan `result: "remembered"`, sehingga `review_count` dan `remembered_count` bertambah serta streak harian ikut naik. Ini satu-satunya cara manual menambah review karena UI drill sudah dihapus. Saat request berjalan label menjadi `Saving…` dan tombol disabled.
  - **Tidak ada tombol hapus di panel detail.** Un-save hanya tersedia dari baris di daftar Remembered (ikon `Trash2` saat hover) agar kartu tetap ringkas dan aksi destruktif tidak berada di dua tempat.
  - Judul `Already memorised` tidak ditampilkan; status sudah disampaikan oleh ikon centang dan konteks kartu.
- **Source**: label 11px uppercase, tautan 12px `#7C3AED` dengan `underline`, lisensi 11px `#94A3B8`.

### G. Profile Page

Halaman `/profile`, satu kolom, `max-w-xl`, memakai pola menu pengaturan OS (Apple Settings), bukan form panjang.

#### G.1 Struktur

1. **Banner** — **full-bleed**: menempel ke tepi atas, kiri, dan kanan viewport, tanpa padding halaman, **tanpa border**, dan **tanpa radius**. Tinggi tetap `128px` (`h-32`), latar `#F5F3FF` dengan pola titik (`radial-gradient` 1px `#DDD6FE`, grid `16px`, opacity turun ke bawah lewat mask). Pola ada di pseudo-element sehingga tidak menangkap klik.
2. **Tombol kembali** — mengapung di atas banner (kiri atas), gaya iOS: ikon `ChevronLeft` 22px + label `Back` 15px/`500` `#7C3AED`, tinggi `40px`, `hover:bg-accent-soft`. Posisi atas `calc(env(safe-area-inset-top) + 8px)` agar tidak tertutup status bar/notch.
3. **Avatar** — lingkaran `72px` (`size-18`) berisi huruf pertama nama (fallback: email, lalu `?`), huruf 26px/`600` `#7C3AED`, `bg #FFFFFF`, `border-line`, `shadow-sm`. Diposisikan `absolute` di tengah horizontal pada tepi bawah banner dengan `translate-y-1/2`, sehingga separuh berada di banner dan separuh di atas konten.
4. **Identitas** — nama 20px/`600` dan email 13px `#64748B`, rata tengah, jarak atas `56px` (`mt-14`) agar tidak menabrak avatar.
5. **Grup menu** — setiap grup adalah kartu putih terpisah, di dalam kontainer `max-w-xl` dengan padding horizontal `16px`.

#### G.2 Grup Menu

Setiap grup: `mt-5`, judul 11px/`600` uppercase `#64748B`, lalu kartu `rounded-xl` `border #E4E4E7` `bg #FFFFFF` dengan `divide-y` `#F1F5F9`. Baris setinggi `~52px` (`px-4 py-3`), ikon 15px di dalam kotak `28px` `rounded-md` `bg #F5F3FF` `text #7C3AED`, label 14px `#09090B`, nilai 13px `#64748B` rata kanan.

| Grup          | Baris                                                         |
| ------------- | ------------------------------------------------------------- |
| Account       | Name, Email                                                   |
| Translation   | **satu baris saja**: bahasa yang sedang aktif + chevron kanan |
| Progress      | Saved words, Current streak                                   |
| (tanpa judul) | Sign out (teks `#DC2626`, rata tengah, tanpa chevron)         |

- Baris bahasa menampilkan nama native, lalu `nama Inggris · contoh kata`. Menekan baris membuka **modal pemilih bahasa** (`LanguagePickerModal`), bukan menampilkan semua opsi di halaman. Alasannya: halaman tetap ringkas dan pola "baris → detail" konsisten dengan settings OS.
- Modal pemilih memakai pola `Modal` bersama: judul `Translation language`, daftar radio native (disembunyikan `sr-only`, fokus terlihat pada baris), tanda centang pada bahasa aktif, dan tombol `Cancel`.
- Memilih bahasa **langsung tersimpan**; modal tetap terbuka selama request berjalan (semua baris disabled, baris terpilih diredupkan), lalu menutup sendiri saat berhasil. Bila gagal, pilihan dikembalikan ke nilai sebelumnya dan error tampil di dalam modal sebagai `role="alert"`.
- `Sign out` hanya ada di halaman ini pada mobile; header desktop tetap punya menu akun.
- Konfirmasi sign out tidak diperlukan, tetapi tombol harus disabled dan berlabel `Signing out…` selama proses.

---

## 6. Hirarki Struktur Layar (DOM / Layer Tree)

```text
[App Root Container] (.flex .min-h-screen)
├── [Sidebar Area] (.w-64 .bg-slate-50 .border-r)
│   ├── [Brand Logo Header] (.flex .items-center .p-4)
│   ├── [Nav Group: Main Menu]
│   │   ├── [Nav Item: Dashboard] (.active)
│   │   ├── [Nav Item: My Tasks]
│   │   └── [Nav Item: Calendar]
│   ├── [Nav Group: Workspaces]
│   │   ├── [Workspace Item: Naible Studio]
│   │   └── [Workspace Item: UIGO Studio] (.expanded)
│   └── [Nav Group: General]
└── [Main Content Wrapper] (.flex-1 .flex .flex-col)
    ├── [Top Utility Header] (.flex .justify-between .p-4 .border-b)
    │   ├── [Breadcrumb Navigation]
    │   └── [Global Utilities: Search, Notifications, Profile]
    ├── [Page Header Section] (.p-6)
    │   ├── [Title & Subtitle]
    │   └── [Team Members Bar & Primary CTA (+ Create New)]
    ├── [Tab Bar Section] (.flex .justify-between .border-b .px-6)
    │   ├── [Tabs List: Overview, Board, List, Table, Timeline]
    │   └── [Actions: Share, Filter]
    └── [Table Scroll Container] (.p-6 .space-y-6)
        ├── [Group Section: To Do]
        │   ├── [Accordion Header + Controls]
        │   └── [Table Data Matrix]
        ├── [Group Section: In Progress]
        │   ├── [Accordion Header + Controls]
        │   └── [Table Data Matrix]
        └── [Group Section: Done]
            ├── [Accordion Header + Controls]
            └── [Table Data Matrix]
```

### Mobile (`< lg`)

```text
[App Root] (.flex .min-h-dvh .pt-[4.5rem] .pb-[calc(5rem+env(safe-area-inset-bottom))])
├── [App Bar] (.fixed .inset-x-0 .top-0 .h-14 .border-b .bg-surface .z-40)
│   ├── [Brand] (Billien + Lexical Mastery Platform)
│   └── [Account Controls]
│       ├── [Guest] Sign in button
│       └── [Signed in] Streak pill (tanpa menu akun; Sign out ada di Profile)
├── [Content] (.flex-1 .flex .flex-col .gap-4)
│   └── [Word List Card] (search, filter chips, rows, pagination)
│       └── [Detail Words] (dialog modal di atas daftar saat kata dipilih)
└── [Bottom Navigation] (.fixed .inset-x-0 .bottom-0 .border-t .bg-surface .z-40)
    ├── [Tab: Discovery]
    ├── [Tab: Remembered]
    └── [Slot kontekstual: Profile / Sign in]
```
