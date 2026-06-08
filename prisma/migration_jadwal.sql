-- ====================================================
-- Migration: add_slot_remove_revisi_add_jadwal
-- ====================================================

-- 1. Add maxSlot to Dosen
ALTER TABLE "Dosen" ADD COLUMN IF NOT EXISTS "maxSlot" INTEGER NOT NULL DEFAULT 5;

-- 2. Remove REVISI from StatusPendaftaran enum
ALTER TABLE "PendaftaranTugasAkhir" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Persetujuan" ALTER COLUMN "status" TYPE TEXT;
ALTER TABLE "PendaftaranTugasAkhir" ALTER COLUMN "status" TYPE TEXT;
DROP TYPE IF EXISTS "StatusPendaftaran" CASCADE;
CREATE TYPE "StatusPendaftaran" AS ENUM ('MENUNGGU', 'DITERIMA', 'DITOLAK', 'DISETUJUI_ADMIN');
ALTER TABLE "PendaftaranTugasAkhir"
  ALTER COLUMN "status" TYPE "StatusPendaftaran"
  USING CASE WHEN "status" = 'REVISI' THEN 'MENUNGGU' ELSE "status" END::"StatusPendaftaran";
ALTER TABLE "PendaftaranTugasAkhir"
  ALTER COLUMN "status" SET DEFAULT 'MENUNGGU'::"StatusPendaftaran";
ALTER TABLE "Persetujuan"
  ALTER COLUMN "status" TYPE "StatusPendaftaran"
  USING CASE WHEN "status" = 'REVISI' THEN 'MENUNGGU' ELSE "status" END::"StatusPendaftaran";

-- 3. Create StatusJadwal enum
DO $$ BEGIN
  CREATE TYPE "StatusJadwal" AS ENUM ('TERSEDIA', 'TERISI', 'DIBATALKAN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Create JadwalBimbingan table
CREATE TABLE IF NOT EXISTS "JadwalBimbingan" (
  "id"            TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "dosenId"       TEXT         NOT NULL,
  "tanggal"       DATE         NOT NULL,
  "waktuMulai"    TEXT         NOT NULL,
  "waktuSelesai"  TEXT         NOT NULL,
  "keterangan"    TEXT,
  "status"        "StatusJadwal" NOT NULL DEFAULT 'TERSEDIA',
  "mahasiswaId"   TEXT,
  "pendaftaranId" TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JadwalBimbingan_pkey" PRIMARY KEY ("id")
);

-- 5. Create JadwalSidang table
CREATE TABLE IF NOT EXISTS "JadwalSidang" (
  "id"                    TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "dosenId"               TEXT         NOT NULL,
  "tanggal"               DATE         NOT NULL,
  "waktuMulaiAvailable"   TEXT         NOT NULL,
  "waktuSelesaiAvailable" TEXT         NOT NULL,
  "keterangan"            TEXT,
  "status"                "StatusJadwal" NOT NULL DEFAULT 'TERSEDIA',
  "pendaftaranId"         TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JadwalSidang_pkey" PRIMARY KEY ("id")
);

-- 6. Add foreign keys for JadwalBimbingan
ALTER TABLE "JadwalBimbingan"
  ADD CONSTRAINT "JadwalBimbingan_dosenId_fkey"
  FOREIGN KEY ("dosenId") REFERENCES "Dosen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JadwalBimbingan"
  ADD CONSTRAINT "JadwalBimbingan_mahasiswaId_fkey"
  FOREIGN KEY ("mahasiswaId") REFERENCES "Mahasiswa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JadwalBimbingan"
  ADD CONSTRAINT "JadwalBimbingan_pendaftaranId_fkey"
  FOREIGN KEY ("pendaftaranId") REFERENCES "PendaftaranTugasAkhir"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 7. Add foreign keys for JadwalSidang
ALTER TABLE "JadwalSidang"
  ADD CONSTRAINT "JadwalSidang_dosenId_fkey"
  FOREIGN KEY ("dosenId") REFERENCES "Dosen"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JadwalSidang"
  ADD CONSTRAINT "JadwalSidang_pendaftaranId_fkey"
  FOREIGN KEY ("pendaftaranId") REFERENCES "PendaftaranTugasAkhir"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS "JadwalBimbingan_dosenId_tanggal_idx"
  ON "JadwalBimbingan"("dosenId", "tanggal");
CREATE INDEX IF NOT EXISTS "JadwalSidang_dosenId_tanggal_idx"
  ON "JadwalSidang"("dosenId", "tanggal");
