# Rencana Pengembangan (Future Plan)

Berikut adalah daftar fitur dan perbaikan yang akan dieksekusi pada iterasi selanjutnya untuk melengkapi sistem Point of Sale (POS) ini:

## 1. Manajemen Laporan & Analitik (Full Reporting)
- **Filter Rentang Waktu (Date Range):** Menambahkan filter kalender (hari ini, minggu ini, bulan ini, custom) pada halaman Riwayat Transaksi.
- **Export Data:** Fitur untuk mengunduh laporan transaksi dalam format CSV atau Excel (berguna untuk pembukuan *Owner*).
- **Laporan Laba/Rugi Sederhana:** Menghitung total `(Harga Jual - Harga Modal)` untuk melihat profit kotor bulanan.

## 2. Pengaturan Toko (Shop Settings)
- **Konfigurasi Global:** Halaman pengaturan untuk mengubah Nama Toko, Alamat, dan Logo (akan tercetak di struk).
- **Default Values:** Pengaturan pajak (*tax rate*), *service charge* (jika ada), dan batas *default* peringatan stok rendah.

## 3. Manajemen Sesi Kasir (Till Session)
- **Tutup Kasir (Close Register):** Fitur bagi kasir untuk menutup sesi, menghitung total uang tunai (laci), dan mencocokkannya dengan total transaksi sistem.
- **Laporan Shift:** Ringkasan penerimaan uang per shift/sesi kasir.

## 4. Peningkatan Manajemen Inventaris
- **Stock Adjustment:** Fitur untuk menambah/mengurangi stok secara manual dengan alasan (misal: barang rusak, restock) tanpa melalui penjualan kasir.
- **Peringatan Notifikasi:** UI Indikator (seperti lonceng/badge) di navbar jika ada produk yang menyentuh batas *low stock*.

## 5. UI/UX Polish Tambahan
- **Keyboard Shortcuts (POS):** Navigasi kasir menggunakan keyboard penuh (F2 untuk bayar, panah untuk memilih produk, dsb) demi kecepatan kasir.
- **Dark Mode Optimization:** Penyesuaian akhir untuk kontras warna saat tema gelap diaktifkan (terutama pada *chart* dan *badge* status).
