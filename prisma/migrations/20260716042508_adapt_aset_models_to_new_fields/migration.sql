/*
  Warnings:

  - You are about to drop the column `ruanganId` on the `AsetInventaris` table. All the data in the column will be lost.
  - You are about to drop the column `satuan` on the `AsetLogistik` table. All the data in the column will be lost.
  - Added the required column `subKategori` to the `AsetInventaris` table without a default value. This is not possible if the table is not empty.
  - Added the required column `jenisKendaraan` to the `AsetKendaraan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subKategori` to the `AsetLogistik` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AsetInventaris" DROP CONSTRAINT "AsetInventaris_ruanganId_fkey";

-- AlterTable
ALTER TABLE "Aset" ADD COLUMN     "ruanganId" TEXT;

-- AlterTable
ALTER TABLE "AsetAlkes" ADD COLUMN     "hargaPerolehan" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "intervalMaintenance" INTEGER,
ADD COLUMN     "kondisi" TEXT NOT NULL DEFAULT 'BAIK',
ADD COLUMN     "tanggalPembelian" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "AsetInventaris" DROP COLUMN "ruanganId",
ADD COLUMN     "pic" TEXT,
ADD COLUMN     "subKategori" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "AsetKendaraan" ADD COLUMN     "idGps" TEXT,
ADD COLUMN     "jenisKendaraan" TEXT NOT NULL,
ADD COLUMN     "kondisi" TEXT NOT NULL DEFAULT 'STANDBY',
ADD COLUMN     "merk" TEXT,
ADD COLUMN     "nomorMesin" TEXT,
ADD COLUMN     "pic" TEXT;

-- AlterTable
ALTER TABLE "AsetLogistik" DROP COLUMN "satuan",
ADD COLUMN     "hargaBeli" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "lokasiSpesifik" TEXT,
ADD COLUMN     "sediaan" TEXT,
ADD COLUMN     "stok" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "subKategori" TEXT NOT NULL,
ALTER COLUMN "nomorBatch" DROP NOT NULL,
ALTER COLUMN "tanggalExpired" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Aset" ADD CONSTRAINT "Aset_ruanganId_fkey" FOREIGN KEY ("ruanganId") REFERENCES "Ruangan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
