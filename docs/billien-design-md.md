# Spesifikasi Desain Antarmuka "Billien" (Design System & UI Blueprint)

Dokumen ini adalah acuan desain dan implementasi frontend proyek **Billien**: token warna, tipografi, aturan tata letak, dan rincian komponen untuk setiap layar.

---

## 1. Ringkasan Layar & Konteks

- **Nama Produk**: Billien — _Learn English, one word at a time._
- **Tipe Antarmuka**: Aplikasi web responsif (Next.js App Router) dengan lima layar.
- **Deskripsi Singkat**: Aplikasi kosakata bahasa Inggris. Pengunjung dapat mencari kata tanpa akun; setelah masuk dengan Google, kata tersimpan, bahasa terjemahan, streak harian, dan sesi latihan menjadi milik akun. Gaya visual bersih dan terstruktur: kanvas abu-abu terang, kartu putih bergaris tipis, dan satu aksen ungu.
- **Lima Layar**:
  - `/` — **Discovery**: cari kata, baca arti, simpan.
  - `/remembered` — **Remembered**: pustaka kata tersimpan, filter huruf, dan panel detail.
  - `/recall` — **Recall**: latihan mengingat aktif dengan kartu dan penjadwalan berulang.
  - `/analytics` — **Analytics**: laporan aktivitas harian/bulanan dan akurasi recall.
  - `/profile` — **Profile**: bahasa terjemahan, progres, dan sign out.
- **Chrome**: layout route group `app/(app)` menyediakan sesi, header desktop, app bar mobile, bottom navigation, serta dialog akun dan onboarding. Setiap halaman hanya merender isinya sendiri.

---

## 2. Toko Warna & Tema (Color Palette)

### Primary / Accent

- **Primary Dark (Action / Buttons)**: `#18181B`, hover `#27272A` (tombol simpan, `Remembered`, dan aksi utama lain).
- **Workspace Accent**: `#7C3AED`, hover `#6D28D9`, tint `#F5F3FF`, garis `#DDD6FE` (state aktif, tautan, ikon, dan fokus).

### Secondary / Neutral

- **Canvas**: `#F4F5F7` (latar halaman).
- **Surface**: `#FFFFFF` (kartu dan panel).
- **Subtle / Sunken / Hover**: `#FAFAFA` / `#F8FAFC` / `#F4F4F5` (isi kartu sekunder, toolbar, dan state hover).
- **Borders & Dividers**: `#E4E4E7` (`line`) dan `#F1F5F9` (`line-soft`), 1px solid.

### Text Colors

- **Primary Text**: `#09090B` (judul, kata, dan teks utama).
- **Soft Text**: `#3F3F46` (isi kalimat dan contoh).
- **Secondary Text**: `#64748B` (deskripsi, label, dan metadata).
- **Muted Text**: `#94A3B8` dan placeholder `#A1A1AA` (ikon pudar dan placeholder input).

### Feedback / State Colors (Soft Badges)

- **Hard / Wrong**: background `#FEE2E2`, teks `#DC2626`.
- **Medium / Almost**: background `#FEF3C7`, teks `#D97706`.
- **Easy / Correct**: background `#DCFCE7`, teks `#16A34A`.
- **Streak**: background `#FFEDD5`, teks `#C2410C` — sengaja oranye-merah agar tidak terbaca sebagai error.
- **Chart series**: `#7C3AED`, `#0EA5E9`, `#16A34A`, `#D97706`, `#DC2626`, diakses lewat `var(--color-chart-N)` sehingga tidak ada hex di komponen.

Semua token di atas didefinisikan sekali di `app/globals.css` (`@theme`) dan dipakai lewat kelas Tailwind (`bg-canvas`, `text-muted`, `border-line`, dan seterusnya).

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
  - **Header desktop**: dua kartu sejajar — kartu brand + pemilih view di kiri (melebar), kartu akun di kanan (lebar tetap). Di bawah `lg` keduanya digantikan app bar mobile.
  - **Area kerja**: `max-w-310` di tengah, `flex-1`. Discovery dan Remembered memakai _split_ dua kolom (daftar + detail); Recall memakai kartu soal + rail nomor.
  - **Analytics**: menggambar header sendiri (`ownsHeader`) dan memakai kolom yang lebih lebar.
  - **Profile**: _bleed_ di atas (`bleedsTop`) — cover menempel ke tepi app bar tanpa jarak.
- **Sistem Spasi**: Berbasis kelipatan 4px / 8px (`4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`).
- **Border Radius**:
  - **Buttons & Badges**: `rounded-md` (`6px`) hingga `rounded-lg` (`8px`).
  - **Pill (streak, status)**: `rounded-full` (`9999px`).
  - **Cards & Panels**: `rounded-xl` (`12px`) untuk kartu dan dialog.
- **Shadow & Depth**:
  - Pendekatan _flat minimalist_: garis `1px` sebagai pemisah, tanpa _heavy box-shadow_.
  - `shadow-sm` hanya untuk elemen yang memang mengambang (view switcher aktif, avatar, tombol aksi utama).

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

### A. Header Desktop (dua kartu)

Berlaku pada `lg` ke atas (`components/app/app-header.tsx`). Di bawahnya digantikan app bar mobile (lihat E.1).

- **Kartu kiri — brand + view switcher** (`flex-1`):
  - Ikon logo (`logo-mark.png`) 28px, judul `Billien` 13px/`600`, tagline `Learn English, one word at a time` 11px `#64748B`.
  - **View switcher**: segmented control `rounded-lg` `bg-subtle` dengan tiga item — **Discovery**, **Remembered**, **Recall** — masing-masing ikon 14px + label 12px/`500`. Item aktif memakai `bg-surface` + `shadow-sm` + `text-ink`; item lain `text-muted`. Status aktif diturunkan dari pathname, bukan state lokal.

- **Kartu kanan — akun**: tombol `Sign in` untuk guest, atau pill streak + dropdown menu akun untuk pengguna masuk. Menu berisi identitas, `Profile`, dan `Sign out`.

- **Analytics** tidak memakai header ini: halaman menggambar header sendiri dengan tombol kembali (`lib/navigation.ts` → `ownsHeader`).

### B. Workspace Dua Kolom (Discovery & Remembered)

- **Kolom kiri — daftar kata**: kartu putih berisi search field, toolbar (sort + filter huruf di Remembered), baris kata, dan paginasi.
- **Kolom kanan — panel detail**: kartu terpisah yang muncul saat sebuah kata dipilih. Di `lg` lebarnya dianimasikan lewat `.detail-split` (`--detail-track`), dan kolom kiri melebar saat panel tertutup. Di bawah `lg` panel menjadi dialog.
- **Baris kata**: kata 14px/`600`, fonetik kecil, dan definisi/terjemahan maksimal dua baris. Baris tersimpan menampilkan aksi hapus; baris Discovery menampilkan status hafalan.
- **Tidak ada sidebar, breadcrumb, notifikasi, avatar tim, atau tabel bergrup.** Navigasi utama hanya header (desktop) dan bottom navigation (mobile).

### C. Recall Workspace

- **Kolom kiri — kartu soal**: satu prompt per kartu, field jawaban, tombol hint, dan progres sesi.
- **Kolom kanan — rail nomor**: daftar nomor kartu yang terbuka berurutan, sehingga pengguna tahu posisinya tanpa kehilangan fokus pada soal.
- **Layar review**: setelah sesi dikirim, semua jawaban benar ditampilkan bersama hasil per kartu dan opsi override untuk jawaban yang dinilai salah.

### D. Analytics

- Header sendiri: tombol kembali, judul, dan pemilih rentang (`7d`, `30d`, `90d`, `this-month`, `last-month`, `this-year`, `last-year`).
- Kartu total, kartu streak (saat ini dan terbaik), bar chart kata ditambah + review, line chart akurasi recall, tabel fallback yang dapat diakses, dan daftar kata yang perlu diulang.

### E. Mobile App Shell (App Bar & Bottom Navigation)

Dirancang agar terasa seperti aplikasi native, bukan halaman web yang diperkecil.
Dua batang tetap (fixed) membingkai konten: app bar di atas, bottom navigation di bawah.

#### E.1 App Bar (atas, tinggi `56px`)

- Posisi `fixed` di tepi atas, latar `#FFFFFF`, garis bawah `1px` `#E4E4E7`, `z-index` 40.
- **Kiri** (brand, boleh `truncate`):
  - Judul `Billien` — 15px / `600` / `#09090B`.
  - Deskripsi `Learn English, one word at a time` — 10px / `500` / `#64748B` (disembunyikan di layar sangat sempit).
- **Kanan**:
  - **Guest** → tombol `Sign in`: ikon `LogIn` 15px + label 13px/`600`, tinggi `40px`, `rounded-lg`, `border` `#E4E4E7`, latar putih.
  - **Signed in** → pill streak saja (ikon `Flame` 13px + angka 12px/`600`, `bg #FEF3C7`, `text #D97706`, `rounded-full`, tinggi `40px`). **Tidak ada tombol 3 titik / menu akun di app bar mobile**: menu `Profile` sudah tersedia di bottom navigation, dan `Sign out` dipindahkan ke halaman Profile agar bar tetap ringkas dan tidak ada dua jalur ke aksi yang sama.
  - **Session pending** → satu placeholder `animate-pulse` untuk pill streak.

* Menu akun (dropdown `w-56` berisi identitas, `Profile`, dan `Sign out`) hanya ada di header desktop.

#### E.1.1 Komponen shadcn/ui

Dua komponen dari shadcn/ui dipakai langsung, bukan ditulis ulang:

- **Dropdown Menu** (`components/ui/dropdown-menu.tsx`, Radix) untuk menu akun. Memberi focus management, Escape, klik-di-luar, dan navigasi keyboard tanpa kode manual. Kelas bawaan shadcn (`bg-popover`, `text-popover-foreground`, `bg-accent`) dipetakan ke token proyek: `bg-surface`, `text-ink`, `border-line`, `hover:bg-hover`. Item destruktif memakai prop `tone="danger"` (`text-hard`, `focus:bg-hard-soft/50`).
- **Sonner** (`components/ui/sonner.tsx`) dipasang sekali di root layout. Posisi `top-center` agar tidak menutupi bottom navigation.

Karena proyek tidak memakai plugin animasi Tailwind, animasi `animate-in` bawaan shadcn diganti keyframe `.menu-surface` di `globals.css` (140ms, `prefers-reduced-motion` dihormati).

- **Tidak ada segmented menu di app bar**; perpindahan view milik bottom navigation.

#### E.2 Bottom Navigation (bawah, tinggi `56px` + safe area)

- Posisi `fixed` di tepi bawah, latar `#FFFFFF`, garis atas `1px` `#E4E4E7`, `z-index` 40, `aria-label="Navigasi utama"`.
- Item sejajar rata (`flex-1`), tiap item terdiri dari:
  - Ikon 18px di dalam pill `rounded-full` (`h-7`, `min-w-12`).
  - Label 10px / `500` di bawah ikon.
- **State aktif**: pill `bg #F5F3FF`, ikon `#7C3AED`, label `#7C3AED`, plus `aria-current="page"`.
- **State non-aktif**: ikon `#94A3B8`, label `#64748B`.
- **State fokus**: `outline` 2px `#7C3AED` di dalam batas item (offset negatif) agar tidak terpotong layar.
- Item standar: `Discovery` (`/`), `Remembered` (`/remembered`), dan `Recall` (`/recall`), berupa `<Link>` dengan `aria-current="page"` pada halaman aktif; lalu slot kontekstual:
  - **Signed in** → `Profile` (tautan ke `/profile`).
  - **Guest** → `Sign in` (membuka modal autentikasi).
- Tepat **4 item** saat ini (3 view + 1 slot kontekstual). Jika menu bertambah, sisanya dipindahkan ke halaman `More`, bukan mengecilkan ikon.
- Bottom bar tetap tampil di `/profile`; baris `Profile` menjadi item aktif di sana.

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
- **Validasi**: minimal `1` karakter dan hanya `[a-z'-]`; satu huruf adalah kata sah (`a`, `I`), sedangkan angka dan tanda baca tidak pernah dikirim ke API.
- **Discovery**: hasil pencarian tampil sebagai **satu baris** di daftar; panel detail tetap tertutup sampai baris diklik. Di bawah hasil, pengguna masuk melihat lima kata terakhir yang disimpan.
- **Remembered**: pencarian memfilter daftar secara lokal dan **instan** (tanpa debounce) karena tidak ada request jaringan; pencarian mencocokkan kata Inggris maupun terjemahan.

* **State yang wajib ada**:
  1. _Idle_ — belum ada ketikan: petunjuk singkat, tanpa skeleton.
  2. _Karakter tidak valid_ — petunjuk validasi, tanpa request. Satu huruf tetap valid.
  3. _Loading_ — skeleton baris selama debounce + fetch.
  4. _Tidak ditemukan_ — pesan netral + saran periksa ejaan.
  5. _Gagal jaringan_ — `role="alert"` + tombol **Try again**.

#### E.4.1 Feedback: toast vs alert inline

Notifikasi dibagi dua, supaya tidak ada pesan basi yang menempel di daftar:

| Jenis                          | Contoh                                                                                                          | Tampilan                                                                                                                        |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Event sementara**            | kata tersimpan, kata dihapus, review tercatat, preferensi bahasa tersimpan, sign out, gagal menyimpan/menghapus | **Sonner toast** (`toast.success` / `toast.error`)                                                                              |
| **State persisten**            | gagal memuat daftar Remembered, gagal lookup kata                                                               | **Alert inline** `role="alert"` + tombol **Try again**, karena harus bertahan selama kondisi masih berlaku dan menyediakan aksi |
| **Error di dalam form/dialog** | gagal PATCH preferensi, gagal OAuth                                                                             | **Inline di dalam dialog**, dekat kontrolnya                                                                                    |

Aturan toast: satu pesan per aksi, kalimat lampau dan spesifik (`"eat" was added to your memorised list.`), tanpa emoji, dan tidak dipakai untuk progres loading (indikator loading ada di tombol).

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
- State validasi karakter tidak valid **tidak** memakai ilustrasi agar tidak berkedip setiap ketikan.

### F. Detail Words Panel

Panel kanan (desktop) atau dialog (mobile). Semua kartu di dalam panel memakai `rounded-lg` (`8px`) dan chip memakai `rounded-md` (`6px`) — tidak ada `rounded-full` kecuali status pill prioritas.

Panel detail tidak memuat kartu ajakan latihan; latihan hanya dimulai dari tab Recall.

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
  - Tombol ini memanggil `POST /api/words/[id]/review` dengan `result: "remembered"`, sehingga `review_count` dan `remembered_count` bertambah serta streak harian ikut naik. Ini satu-satunya cara manual menambah review di luar sesi Recall. Saat request berjalan label menjadi `Saving…` dan tombol disabled.
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
[App Root Container] (.flex .min-h-dvh .flex-col .bg-canvas)
└── [Content Wrapper] (.mx-auto .flex .w-full .max-w-310 .flex-col .gap-4)
    ├── [Header Card: Brand + View Switcher] (.flex .flex-1)
    │   ├── [Brand] (logo 28px, Billien, tagline)
    │   └── [View Switcher] (segmented: Discovery, Remembered, Recall)
    ├── [Header Card: Account] (pill streak + dropdown / Sign in)
    └── [Page Content] (satu view per halaman)
        ├── [Discovery] → [Word List Card] + [Detail Panel]
        ├── [Remembered] → [Toolbar: sort + letter filter] + [Word List Card] + [Detail Panel]
        ├── [Recall] → [Question Card] + [Numbered Rail]
        ├── [Analytics] → [Own Header] + [Stats] + [Charts] + [Weakest Words]
        └── [Profile] → [Full-bleed Cover] + [Identity] + [Settings Groups]
```

### Mobile (`< lg`)

```text
[App Root] (.flex .min-h-dvh .pt-[4.5rem] .pb-[calc(5rem+env(safe-area-inset-bottom))])
├── [App Bar] (.fixed .inset-x-0 .top-0 .h-14 .border-b .bg-surface .z-40)
│   ├── [Brand] (Billien + Learn English, one word at a time)
│   └── [Account Controls]
│       ├── [Guest] Sign in button
│       └── [Signed in] Streak pill (tanpa menu akun; Sign out ada di Profile)
├── [Content] (.flex-1 .flex .flex-col .gap-4)
│   ├── [Word List Card] (search, toolbar, rows, pagination)
│   │   └── [Detail Words] (dialog modal di atas daftar saat kata dipilih)
│   ├── [Recall] (question card + numbered rail, satu kolom)
│   ├── [Analytics] (header sendiri + charts)
│   └── [Profile] (cover full-bleed + settings)
└── [Bottom Navigation] (.fixed .inset-x-0 .bottom-0 .border-t .bg-surface .z-40)
    ├── [Tab: Discovery]
    ├── [Tab: Remembered]
    ├── [Tab: Recall]
    └── [Slot kontekstual: Profile / Sign in]
```
