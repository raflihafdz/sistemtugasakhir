-- Add maxSlot to Dosen table
ALTER TABLE "Dosen" ADD COLUMN IF NOT EXISTS "maxSlot" INTEGER NOT NULL DEFAULT 5;

-- Remove REVISI from StatusPendaftaran enum
-- Step 1: Drop defaults that depend on the enum
ALTER TABLE "PendaftaranTugasAkhir" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Persetujuan" ALTER COLUMN "status" DROP DEFAULT;

-- Step 2: Change columns to text
ALTER TABLE "PendaftaranTugasAkhir" ALTER COLUMN "status" TYPE TEXT;
ALTER TABLE "Persetujuan" ALTER COLUMN "status" TYPE TEXT;

-- Step 3: Drop old enum with cascade
DROP TYPE IF EXISTS "StatusPendaftaran" CASCADE;

-- Step 4: Recreate enum without REVISI
CREATE TYPE "StatusPendaftaran" AS ENUM ('MENUNGGU', 'DITERIMA', 'DITOLAK', 'DISETUJUI_ADMIN');

-- Step 5: Restore column types and defaults
ALTER TABLE "PendaftaranTugasAkhir" ALTER COLUMN "status" TYPE "StatusPendaftaran" USING "status"::"StatusPendaftaran";
ALTER TABLE "PendaftaranTugasAkhir" ALTER COLUMN "status" SET DEFAULT 'MENUNGGU'::"StatusPendaftaran";

ALTER TABLE "Persetujuan" ALTER COLUMN "status" TYPE "StatusPendaftaran" USING "status"::"StatusPendaftaran";
