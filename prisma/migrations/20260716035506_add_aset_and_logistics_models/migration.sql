-- CreateTable
CREATE TABLE "Ruangan" (
    "id" TEXT NOT NULL,
    "namaRuangan" TEXT NOT NULL,
    "lokasi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ruangan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aset" (
    "id" TEXT NOT NULL,
    "kodeAset" TEXT NOT NULL,
    "namaAset" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "deskripsi" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "gambarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Aset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsetLogistik" (
    "id" TEXT NOT NULL,
    "asetId" TEXT NOT NULL,
    "masterObatId" TEXT,
    "nomorBatch" TEXT NOT NULL,
    "tanggalExpired" TIMESTAMP(3) NOT NULL,
    "stokMinimum" INTEGER NOT NULL DEFAULT 0,
    "satuan" TEXT NOT NULL,
    "supplier" TEXT,

    CONSTRAINT "AsetLogistik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsetAlkes" (
    "id" TEXT NOT NULL,
    "asetId" TEXT NOT NULL,
    "nomorSeri" TEXT,
    "merk" TEXT,
    "wajibKalibrasi" BOOLEAN NOT NULL DEFAULT false,
    "noSertifikatKalibrasi" TEXT,
    "tanggalKalibrasiTerakhir" TIMESTAMP(3),
    "intervalKalibrasi" INTEGER,

    CONSTRAINT "AsetAlkes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsetKendaraan" (
    "id" TEXT NOT NULL,
    "asetId" TEXT NOT NULL,
    "nomorPolisi" TEXT NOT NULL,
    "nomorRangka" TEXT,
    "tanggalPajak" TIMESTAMP(3),
    "intervalMaintenance" INTEGER,

    CONSTRAINT "AsetKendaraan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsetInventaris" (
    "id" TEXT NOT NULL,
    "asetId" TEXT NOT NULL,
    "ruanganId" TEXT,
    "nilaiBeli" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tanggalPembelian" TIMESTAMP(3) NOT NULL,
    "masaPakai" INTEGER NOT NULL,

    CONSTRAINT "AsetInventaris_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsetMaintenance" (
    "id" TEXT NOT NULL,
    "asetId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jenis" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "biaya" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pelaksana" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SELESAI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsetMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AsetKalibrasi" (
    "id" TEXT NOT NULL,
    "asetId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "noSertifikat" TEXT NOT NULL,
    "institusi" TEXT NOT NULL,
    "hasil" TEXT NOT NULL,
    "expiredDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsetKalibrasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ruangan_namaRuangan_key" ON "Ruangan"("namaRuangan");

-- CreateIndex
CREATE UNIQUE INDEX "Aset_kodeAset_key" ON "Aset"("kodeAset");

-- CreateIndex
CREATE UNIQUE INDEX "AsetLogistik_asetId_key" ON "AsetLogistik"("asetId");

-- CreateIndex
CREATE UNIQUE INDEX "AsetAlkes_asetId_key" ON "AsetAlkes"("asetId");

-- CreateIndex
CREATE UNIQUE INDEX "AsetKendaraan_asetId_key" ON "AsetKendaraan"("asetId");

-- CreateIndex
CREATE UNIQUE INDEX "AsetKendaraan_nomorPolisi_key" ON "AsetKendaraan"("nomorPolisi");

-- CreateIndex
CREATE UNIQUE INDEX "AsetInventaris_asetId_key" ON "AsetInventaris"("asetId");

-- AddForeignKey
ALTER TABLE "AsetLogistik" ADD CONSTRAINT "AsetLogistik_asetId_fkey" FOREIGN KEY ("asetId") REFERENCES "Aset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsetLogistik" ADD CONSTRAINT "AsetLogistik_masterObatId_fkey" FOREIGN KEY ("masterObatId") REFERENCES "MasterObat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsetAlkes" ADD CONSTRAINT "AsetAlkes_asetId_fkey" FOREIGN KEY ("asetId") REFERENCES "Aset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsetKendaraan" ADD CONSTRAINT "AsetKendaraan_asetId_fkey" FOREIGN KEY ("asetId") REFERENCES "Aset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsetInventaris" ADD CONSTRAINT "AsetInventaris_asetId_fkey" FOREIGN KEY ("asetId") REFERENCES "Aset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsetInventaris" ADD CONSTRAINT "AsetInventaris_ruanganId_fkey" FOREIGN KEY ("ruanganId") REFERENCES "Ruangan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsetMaintenance" ADD CONSTRAINT "AsetMaintenance_asetId_fkey" FOREIGN KEY ("asetId") REFERENCES "Aset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AsetKalibrasi" ADD CONSTRAINT "AsetKalibrasi_asetId_fkey" FOREIGN KEY ("asetId") REFERENCES "Aset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
