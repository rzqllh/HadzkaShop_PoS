# Production security rollout

QRIS harus tetap `QRIS_ENABLED=false` sampai seluruh gate di bagian terakhir
lulus. Jangan menggunakan `prisma migrate dev` atau `prisma db push` terhadap
database production.

## 1. Backup dan migration baseline

1. Ambil backup database yang dapat direstore dan catat waktu serta checksum.
2. Checkout commit `a92243c`, simpan `prisma/schema.prisma` dari commit itu ke
   file sementara, lalu bandingkan database existing:

   ```text
   pnpm exec prisma migrate diff --exit-code --from-config-datasource --to-schema=<baseline-schema-temp>
   ```

3. Berhenti bila exit code bukan `0` atau output bukan `No difference detected`.
   Investigasi drift sebelum melanjutkan.
4. Hanya untuk database existing yang terbukti identik, tandai baseline:

   ```text
   pnpm exec prisma migrate resolve --applied 20260729000100_baseline_a92243c
   pnpm exec prisma migrate deploy
   ```

5. Untuk database baru, cukup jalankan `pnpm exec prisma migrate deploy`; kedua
   migration diterapkan berurutan.
6. Pastikan role pada `DATABASE_URL` adalah server-only database role yang
   memang dapat mengakses tabel setelah RLS aktif. Role `anon` dan
   `authenticated` tidak boleh digunakan Prisma.

## 2. Identity dan Storage

1. Isi Supabase URL, publishable key, dan service-role key di secret manager.
   Service-role key hanya boleh tersedia pada server/runtime job.
2. Jalankan `pnpm auth:backfill`. Deployment harus berhenti bila ada user aktif
   yang tidak dapat dipetakan ke Supabase Auth berdasarkan normalized email.
3. Untuk instalasi baru, isi `BOOTSTRAP_OWNER_*` melalui secret manager lalu
   jalankan `pnpm bootstrap:owner`. Command tidak mencetak password.
4. Jalankan `pnpm storage:provision`. Verifikasi bucket public
   `product-images` memiliki batas 2 MiB dan hanya JPEG/PNG/WebP, tanpa direct
   authenticated upload policy.
5. Setelah seluruh user aktif memiliki `authUserId`, buat migration deployment
   terpisah untuk `ALTER COLUMN "authUserId" SET NOT NULL`. Jangan enforce pada
   deployment additive pertama.

## 3. Checkout dan observability

1. Deploy dengan QRIS masih disabled.
2. Jalankan cash smoke test, parallel last-stock test, duplicate
   `clientRequestId`, manual stock adjustment, dan cash void.
3. Verifikasi log hanya berisi identifier operasional seperti transaction ID,
   shop ID, provider order ID, dan transition. Token, signature, password,
   credentials, serta full provider payload tidak boleh tercatat.
4. Jadwalkan `pnpm payments:reconcile` secara periodik dan alert bila exit code
   non-zero.

## 4. QRIS sandbox enablement gate

Konfirmasi seluruh item berikut sebelum mengubah feature flag:

- sandbox MID/server key dan client key tersedia di secret manager;
- channel QRIS merchant aktif;
- `APP_URL` adalah public HTTPS;
- dashboard Midtrans Notification URL mengarah ke
  `https://<domain>/api/midtrans/webhook`;
- Finish/Unfinish/Error URL dashboard sudah dikonfirmasi pemilik merchant;
- deterministic webhook replay lulus;
- sandbox success, expire, cancel, missed-webhook/Get Status reconciliation,
  dan duplicate notification lulus;
- amount di Midtrans selalu integer IDR dan expiry 15 menit;
- backup, dashboard owner, monitoring, serta rollback owner sudah dikonfirmasi.

Setelah itu set `MIDTRANS_QRIS_ACTIVATED=true`,
`MIDTRANS_CALLBACKS_CONFIRMED=true`, dan terakhir `QRIS_ENABLED=true`. Production
penny test memerlukan persetujuan merchant. QRIS settled tidak boleh memakai
cash void; refund provider adalah rollout terpisah.
