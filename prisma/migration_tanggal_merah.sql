-- Create TanggalMerah table
CREATE TABLE IF NOT EXISTS "TanggalMerah" (
  "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "tanggal"    DATE         NOT NULL,
  "judul"      TEXT         NOT NULL,
  "keterangan" TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TanggalMerah_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TanggalMerah_tanggal_idx" ON "TanggalMerah"("tanggal");
