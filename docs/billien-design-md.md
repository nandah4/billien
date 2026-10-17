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
- **Desktop** (`>= lg`): dua kartu header (judul + segmented menu, streak + menu akun) dan dua kolom (daftar + detail).
- **Mobile** (`< lg`): _app shell_ dengan **app bar** tetap di atas dan **bottom navigation** tetap di bawah; konten satu kolom dan di-scroll normal.
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
  - **Signed in** → pill streak (ikon `Flame` 13px + angka 12px/`600`, `bg #FEF3C7`, `text #D97706`, `rounded-full`, tinggi `40px`) + tombol menu `MoreHorizontal` `40×40`.
  - **Session pending** → dua placeholder `animate-pulse` dengan ukuran sama agar bar tidak melompat.
- Menu akun muncul sebagai dropdown `w-56` di bawah tombol menu: identitas (nama + "Signed in"), `Profile`, lalu `Sign out`.
- **Tidak ada segmented menu di app bar**; perpindahan view milik bottom navigation.

#### E.2 Bottom Navigation (bawah, tinggi `56px` + safe area)

- Posisi `fixed` di tepi bawah, latar `#FFFFFF`, garis atas `1px` `#E4E4E7`, `z-index` 40, `aria-label="Navigasi utama"`.
- Item sejajar rata (`flex-1`), tiap item terdiri dari:
  - Ikon 18px di dalam pill `rounded-full` (`h-7`, `min-w-12`).
  - Label 10px / `500` di bawah ikon.
- **State aktif**: pill `bg #F5F3FF`, ikon `#7C3AED`, label `#7C3AED`, plus `aria-current="page"`.
- **State non-aktif**: ikon `#94A3B8`, label `#64748B`.
- **State fokus**: `outline` 2px `#7C3AED` di dalam batas item (offset negatif) agar tidak terpotong layar.
- Item standar: `Discovery`, `Remembered`, lalu slot kontekstual:
  - **Signed in** → `Profile` (tautan ke `/profile`).
  - **Guest** → `Sign in` (membuka modal autentikasi).
- Maksimal **5 item**. Jika menu bertambah, sisanya dipindahkan ke halaman `More`, bukan mengecilkan ikon.
- Bottom bar tidak ditampilkan pada halaman `/profile` (halaman itu punya tautan kembali sendiri).

#### E.3 Aturan Konten Mobile

- Satu kolom, lebar penuh, padding horizontal `16px`.
- Panel **Detail Words** muncul **di bawah** daftar (bukan overlay), sehingga konteks daftar tidak hilang.
- Scroll memakai halaman (bukan scroll ganda di dalam kartu); `overflow` internal hanya aktif di desktop.
- Tombol hapus pada baris selalu terlihat di mobile (tidak bergantung hover).
- Modal (auth, onboarding bahasa) memakai `max-w` dengan margin `16px` dan boleh di-scroll bila melebihi tinggi layar.

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
│       └── [Signed in] Streak pill + Account menu (Profile, Sign out)
├── [Content] (.flex-1 .flex .flex-col .gap-4)
│   └── [Word List Card] (search, filter chips, rows, pagination)
│       └── [Detail Words] (muncul di bawah daftar saat kata dipilih)
└── [Bottom Navigation] (.fixed .inset-x-0 .bottom-0 .border-t .bg-surface .z-40)
    ├── [Tab: Discovery]
    ├── [Tab: Remembered]
    └── [Slot kontekstual: Profile / Sign in]
```
