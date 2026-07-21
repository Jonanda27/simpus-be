-- CreateTable
CREATE TABLE "MasterTarifPelayanan" (
    "id" TEXT NOT NULL,
    "kodeTarif" TEXT NOT NULL,
    "namaTarif" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "tarif" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deskripsi" TEXT,
    "statusAktif" BOOLEAN NOT NULL DEFAULT true,
    "icd9Id" TEXT,
    "labId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterTarifPelayanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterTarifFarmasi" (
    "id" TEXT NOT NULL,
    "kategoriObat" TEXT NOT NULL,
    "marginPersen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tuslah" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deskripsi" TEXT,
    "statusAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterTarifFarmasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MasterTarifPelayanan_kodeTarif_key" ON "MasterTarifPelayanan"("kodeTarif");

-- CreateIndex
CREATE UNIQUE INDEX "MasterTarifFarmasi_kategoriObat_key" ON "MasterTarifFarmasi"("kategoriObat");

-- AddForeignKey
ALTER TABLE "MasterTarifPelayanan" ADD CONSTRAINT "MasterTarifPelayanan_icd9Id_fkey" FOREIGN KEY ("icd9Id") REFERENCES "MasterICD9"("id_icd9") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterTarifPelayanan" ADD CONSTRAINT "MasterTarifPelayanan_labId_fkey" FOREIGN KEY ("labId") REFERENCES "MasterLaboratorium"("id") ON DELETE SET NULL ON UPDATE CASCADE;
