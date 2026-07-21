-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "namaLengkap" TEXT,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "poliklinikId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pasien" (
    "id" TEXT NOT NULL,
    "noRM" TEXT NOT NULL,
    "noIHS" TEXT,
    "nik" TEXT NOT NULL,
    "noKk" TEXT,
    "namaLengkap" TEXT NOT NULL,
    "tempatLahir" TEXT NOT NULL,
    "tanggalLahir" TIMESTAMP(3) NOT NULL,
    "jenisKelamin" TEXT NOT NULL,
    "golonganDarah" TEXT,
    "rhesus" TEXT,
    "fotoWajah" TEXT,
    "agama" TEXT NOT NULL,
    "pendidikan" TEXT,
    "pekerjaan" TEXT NOT NULL,
    "statusPerkawinan" TEXT NOT NULL,
    "kewarganegaraan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pasien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlamatPasien" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "alamatKtp" TEXT NOT NULL,
    "alamatDomisili" TEXT NOT NULL,
    "rtRw" TEXT NOT NULL,
    "desaKelurahan" TEXT NOT NULL,
    "kecamatan" TEXT NOT NULL,
    "kabupatenKota" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL,
    "kodePos" TEXT NOT NULL,
    "titikGps" TEXT,

    CONSTRAINT "AlamatPasien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KontakPasien" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "noHp" TEXT NOT NULL,
    "email" TEXT,
    "kontakDarurat" TEXT NOT NULL,
    "hubunganKontakDarurat" TEXT NOT NULL,
    "noHpDarurat" TEXT NOT NULL,

    CONSTRAINT "KontakPasien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SosialPasien" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "statusDisabilitas" TEXT,
    "programSosial" TEXT,

    CONSTRAINT "SosialPasien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataBayi" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "namaIbu" TEXT,
    "nikIbu" TEXT,
    "namaAyah" TEXT,
    "beratLahir" TEXT,
    "panjangLahir" TEXT,
    "jamLahir" TEXT,
    "jenisPersalinan" TEXT,

    CONSTRAINT "DataBayi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PenjaminPasien" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "jenisPenjamin" TEXT NOT NULL,
    "noBpjs" TEXT,
    "statusKepesertaan" TEXT,
    "faskesTingkat1" TEXT,
    "kelasRawat" TEXT,
    "namaAsuransi" TEXT,
    "nomorPolis" TEXT,
    "masaBerlakuAsuransi" TEXT,
    "namaPerusahaan" TEXT,

    CONSTRAINT "PenjaminPasien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kunjungan" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "tanggalRegistrasi" TIMESTAMP(3) NOT NULL,
    "jamRegistrasi" TEXT NOT NULL,
    "timestamp" TEXT,
    "poliklinikId" TEXT NOT NULL,
    "layananTujuan" TEXT,
    "jenisPelayanan" TEXT NOT NULL,
    "statusPasien" TEXT NOT NULL,
    "noAntrian" TEXT NOT NULL,
    "prioritas" TEXT NOT NULL,
    "caraDatang" TEXT NOT NULL,
    "noSep" TEXT,
    "statusKunjungan" TEXT NOT NULL DEFAULT 'MENUNGGU',
    "userPendaftarId" TEXT,
    "dokterTujuanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kunjungan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRujukan" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "asalRujukan" TEXT,
    "noRujukan" TEXT,
    "tanggalRujukan" TEXT,
    "fasilitasPerujuk" TEXT,
    "diagnosaAwal" TEXT,
    "jenisRujukan" TEXT,

    CONSTRAINT "DataRujukan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersetujuanMedis" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "persetujuanPengobatan" BOOLEAN NOT NULL DEFAULT false,
    "persetujuanRekamMedis" BOOLEAN NOT NULL DEFAULT false,
    "persetujuanSatusehat" BOOLEAN NOT NULL DEFAULT false,
    "persetujuanReminder" BOOLEAN NOT NULL DEFAULT false,
    "tandaTangan" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersetujuanMedis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetadataSistem" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "userPendaftarId" TEXT,
    "loketPendaftaran" TEXT,
    "device" TEXT,
    "ipAddress" TEXT,
    "auditTrail" TEXT,

    CONSTRAINT "MetadataSistem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Screening" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "kunjunganId" TEXT,
    "tanggalScreening" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "petugas" TEXT NOT NULL,
    "jenisKedatangan" TEXT NOT NULL,
    "kategoriTriage" TEXT NOT NULL,
    "tinggiBadan" DOUBLE PRECISION,
    "beratBadan" DOUBLE PRECISION,
    "lingkarPerut" DOUBLE PRECISION,
    "imt" DOUBLE PRECISION,
    "tekananDarahSistolik" INTEGER,
    "tekananDarahDiastolik" INTEGER,
    "nadi" INTEGER,
    "frekuensiNapas" INTEGER,
    "suhuTubuh" DOUBLE PRECISION,
    "saturasiOksigen" INTEGER,
    "skalaNyeri" INTEGER,
    "keluhanUtama" TEXT,
    "riwayatKeluarga" TEXT[],
    "merokok" TEXT,
    "dataTambahan" JSONB,
    "statusKesehatan" TEXT,
    "prioritasPelayanan" TEXT,
    "catatanPetugas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Screening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RekamMedis" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "dokterId" TEXT NOT NULL,
    "keluhanUtama" TEXT,
    "riwayatPenyakitSekarang" TEXT,
    "riwayatPenyakitDahulu" TEXT,
    "riwayatAlergi" TEXT,
    "keadaanUmum" TEXT,
    "kesadaran" TEXT,
    "pemeriksaanFisik" TEXT,
    "hasilPenunjang" TEXT,
    "diagnosisKlinis" TEXT,
    "rencanaTerapi" TEXT,
    "instruksiMedis" TEXT,
    "statusPemeriksaan" TEXT NOT NULL DEFAULT 'DRAFT',
    "penginputId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RekamMedis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosisPasien" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "icd10Id" TEXT NOT NULL,
    "tanggalDiagnosis" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dokterId" TEXT,
    "jenisDiagnosis" TEXT NOT NULL,
    "diagnosisKlinis" TEXT,
    "statusDiagnosis" TEXT NOT NULL DEFAULT 'Suspek',
    "tingkatKepastian" TEXT,
    "kondisiMasuk" TEXT,
    "penyebabCedera" TEXT,
    "tempatKejadian" TEXT,
    "catatanDokter" TEXT,
    "tanggalSembuh" TIMESTAMP(3),
    "statusAkhir" TEXT,
    "sinkronSatusehat" BOOLEAN NOT NULL DEFAULT false,
    "penginputId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosisPasien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TindakanPasien" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "icd9Id" TEXT NOT NULL,
    "pelaksanaId" TEXT,
    "pelaksanaTeks" TEXT NOT NULL DEFAULT 'Dokter',
    "catatanTindakan" TEXT,
    "waktuTindakan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TindakanPasien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterICD10" (
    "id_icd10" TEXT NOT NULL,
    "kode_icd10" TEXT NOT NULL,
    "nama_diagnosis" TEXT NOT NULL,
    "bab" TEXT,
    "kategori" TEXT,
    "sub_kategori" TEXT,
    "parent_kode" TEXT,
    "level" INTEGER,
    "penyakit_menular" BOOLEAN NOT NULL DEFAULT false,
    "penyakit_kronis" BOOLEAN NOT NULL DEFAULT false,
    "wajib_lapor" BOOLEAN NOT NULL DEFAULT false,
    "kode_program" TEXT,
    "status_aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterICD10_pkey" PRIMARY KEY ("id_icd10")
);

-- CreateTable
CREATE TABLE "MasterICD9" (
    "id_icd9" TEXT NOT NULL,
    "kode_icd9" TEXT NOT NULL,
    "nama_prosedur" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterICD9_pkey" PRIMARY KEY ("id_icd9")
);

-- CreateTable
CREATE TABLE "MasterLaboratorium" (
    "id" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "satuan" TEXT,
    "nilaiRujukan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterLaboratorium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerusahaanRekanan" (
    "id" TEXT NOT NULL,
    "kodePerusahaan" TEXT NOT NULL,
    "namaPerusahaan" TEXT NOT NULL,
    "alamat" TEXT,
    "noTelepon" TEXT,
    "email" TEXT,
    "namaPic" TEXT,
    "noHpPic" TEXT,
    "noPks" TEXT,
    "tanggalMulai" TIMESTAMP(3),
    "tanggalBerakhir" TIMESTAMP(3),
    "fileDokumenPks" TEXT,
    "statusKerjasama" TEXT NOT NULL DEFAULT 'AKTIF',
    "cakupanLayanan" TEXT,
    "plafonTahunan" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerusahaanRekanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Poliklinik" (
    "id" TEXT NOT NULL,
    "kodePoli" TEXT NOT NULL,
    "namaPoli" TEXT NOT NULL,
    "deskripsi" TEXT,
    "statusAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Poliklinik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayananKlinik" (
    "id" TEXT NOT NULL,
    "poliklinikId" TEXT NOT NULL,
    "kodeLayanan" TEXT NOT NULL,
    "namaLayanan" TEXT NOT NULL,
    "deskripsi" TEXT,
    "tarifDasar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statusAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LayananKlinik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterObat" (
    "id" TEXT NOT NULL,
    "kodeObat" TEXT NOT NULL,
    "namaObat" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "sediaan" TEXT NOT NULL,
    "harga" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "gambarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MasterObat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resep" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "dokterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU_FARMASI',
    "tanggalResep" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "penginputId" TEXT,

    CONSTRAINT "Resep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResepDetail" (
    "id" TEXT NOT NULL,
    "resepId" TEXT NOT NULL,
    "obatId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "aturanPakai" TEXT NOT NULL,
    "catatan" TEXT,

    CONSTRAINT "ResepDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RujukanKeluar" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "dokterId" TEXT NOT NULL,
    "faskesTujuan" TEXT NOT NULL,
    "poliTujuan" TEXT NOT NULL,
    "alasanRujukan" TEXT NOT NULL,
    "tanggalRujukan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RujukanKeluar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLaboratorium" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "dokterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU_SAMPEL',
    "catatanKlinis" TEXT,
    "tanggalOrder" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderLaboratorium_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLaboratoriumDetail" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "hasil" TEXT,
    "satuan" TEXT,
    "nilaiRujukan" TEXT,
    "kritis" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OrderLaboratoriumDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tagihan" (
    "id" TEXT NOT NULL,
    "kunjunganId" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "totalBiaya" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statusTagihan" TEXT NOT NULL DEFAULT 'BELUM_LUNAS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tagihan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetailTagihan" (
    "id" TEXT NOT NULL,
    "tagihanId" TEXT NOT NULL,
    "namaItem" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 1,
    "hargaSatuan" DOUBLE PRECISION NOT NULL,
    "subTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetailTagihan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pembayaran" (
    "id" TEXT NOT NULL,
    "tagihanId" TEXT NOT NULL,
    "jumlahBayar" DOUBLE PRECISION NOT NULL,
    "kembalian" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metodePembayaran" TEXT NOT NULL,
    "waktuBayar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kasirId" TEXT,

    CONSTRAINT "Pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramUKM" (
    "id" TEXT NOT NULL,
    "kodeProgram" TEXT NOT NULL,
    "namaProgram" TEXT NOT NULL,
    "deskripsi" TEXT,
    "statusAktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramUKM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegisterUKM" (
    "id" TEXT NOT NULL,
    "pasienId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "tanggalDaftar" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusProgram" TEXT NOT NULL DEFAULT 'AKTIF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegisterUKM_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogPemantauanUKM" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "petugasId" TEXT,
    "catatan" TEXT NOT NULL,
    "tindakLanjut" TEXT,
    "statusBerobat" TEXT,

    CONSTRAINT "LogPemantauanUKM_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Pasien_noRM_key" ON "Pasien"("noRM");

-- CreateIndex
CREATE UNIQUE INDEX "Pasien_noIHS_key" ON "Pasien"("noIHS");

-- CreateIndex
CREATE UNIQUE INDEX "Pasien_nik_key" ON "Pasien"("nik");

-- CreateIndex
CREATE UNIQUE INDEX "AlamatPasien_pasienId_key" ON "AlamatPasien"("pasienId");

-- CreateIndex
CREATE UNIQUE INDEX "KontakPasien_pasienId_key" ON "KontakPasien"("pasienId");

-- CreateIndex
CREATE UNIQUE INDEX "SosialPasien_pasienId_key" ON "SosialPasien"("pasienId");

-- CreateIndex
CREATE UNIQUE INDEX "DataBayi_pasienId_key" ON "DataBayi"("pasienId");

-- CreateIndex
CREATE UNIQUE INDEX "PenjaminPasien_pasienId_key" ON "PenjaminPasien"("pasienId");

-- CreateIndex
CREATE UNIQUE INDEX "DataRujukan_kunjunganId_key" ON "DataRujukan"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "PersetujuanMedis_kunjunganId_key" ON "PersetujuanMedis"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "MetadataSistem_kunjunganId_key" ON "MetadataSistem"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "Screening_kunjunganId_key" ON "Screening"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "RekamMedis_kunjunganId_key" ON "RekamMedis"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterICD10_kode_icd10_key" ON "MasterICD10"("kode_icd10");

-- CreateIndex
CREATE UNIQUE INDEX "MasterICD9_kode_icd9_key" ON "MasterICD9"("kode_icd9");

-- CreateIndex
CREATE UNIQUE INDEX "PerusahaanRekanan_kodePerusahaan_key" ON "PerusahaanRekanan"("kodePerusahaan");

-- CreateIndex
CREATE UNIQUE INDEX "Poliklinik_kodePoli_key" ON "Poliklinik"("kodePoli");

-- CreateIndex
CREATE UNIQUE INDEX "LayananKlinik_kodeLayanan_key" ON "LayananKlinik"("kodeLayanan");

-- CreateIndex
CREATE UNIQUE INDEX "MasterObat_kodeObat_key" ON "MasterObat"("kodeObat");

-- CreateIndex
CREATE UNIQUE INDEX "RujukanKeluar_kunjunganId_key" ON "RujukanKeluar"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderLaboratorium_kunjunganId_key" ON "OrderLaboratorium"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "Tagihan_kunjunganId_key" ON "Tagihan"("kunjunganId");

-- CreateIndex
CREATE UNIQUE INDEX "Pembayaran_tagihanId_key" ON "Pembayaran"("tagihanId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramUKM_kodeProgram_key" ON "ProgramUKM"("kodeProgram");

-- CreateIndex
CREATE UNIQUE INDEX "RegisterUKM_pasienId_programId_key" ON "RegisterUKM"("pasienId", "programId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_poliklinikId_fkey" FOREIGN KEY ("poliklinikId") REFERENCES "Poliklinik"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlamatPasien" ADD CONSTRAINT "AlamatPasien_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KontakPasien" ADD CONSTRAINT "KontakPasien_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SosialPasien" ADD CONSTRAINT "SosialPasien_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataBayi" ADD CONSTRAINT "DataBayi_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PenjaminPasien" ADD CONSTRAINT "PenjaminPasien_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kunjungan" ADD CONSTRAINT "Kunjungan_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kunjungan" ADD CONSTRAINT "Kunjungan_poliklinikId_fkey" FOREIGN KEY ("poliklinikId") REFERENCES "Poliklinik"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kunjungan" ADD CONSTRAINT "Kunjungan_userPendaftarId_fkey" FOREIGN KEY ("userPendaftarId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kunjungan" ADD CONSTRAINT "Kunjungan_dokterTujuanId_fkey" FOREIGN KEY ("dokterTujuanId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataRujukan" ADD CONSTRAINT "DataRujukan_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersetujuanMedis" ADD CONSTRAINT "PersetujuanMedis_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetadataSistem" ADD CONSTRAINT "MetadataSistem_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetadataSistem" ADD CONSTRAINT "MetadataSistem_userPendaftarId_fkey" FOREIGN KEY ("userPendaftarId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Screening" ADD CONSTRAINT "Screening_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RekamMedis" ADD CONSTRAINT "RekamMedis_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RekamMedis" ADD CONSTRAINT "RekamMedis_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RekamMedis" ADD CONSTRAINT "RekamMedis_dokterId_fkey" FOREIGN KEY ("dokterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RekamMedis" ADD CONSTRAINT "RekamMedis_penginputId_fkey" FOREIGN KEY ("penginputId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisPasien" ADD CONSTRAINT "DiagnosisPasien_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisPasien" ADD CONSTRAINT "DiagnosisPasien_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisPasien" ADD CONSTRAINT "DiagnosisPasien_icd10Id_fkey" FOREIGN KEY ("icd10Id") REFERENCES "MasterICD10"("id_icd10") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisPasien" ADD CONSTRAINT "DiagnosisPasien_dokterId_fkey" FOREIGN KEY ("dokterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosisPasien" ADD CONSTRAINT "DiagnosisPasien_penginputId_fkey" FOREIGN KEY ("penginputId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TindakanPasien" ADD CONSTRAINT "TindakanPasien_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TindakanPasien" ADD CONSTRAINT "TindakanPasien_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TindakanPasien" ADD CONSTRAINT "TindakanPasien_icd9Id_fkey" FOREIGN KEY ("icd9Id") REFERENCES "MasterICD9"("id_icd9") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TindakanPasien" ADD CONSTRAINT "TindakanPasien_pelaksanaId_fkey" FOREIGN KEY ("pelaksanaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayananKlinik" ADD CONSTRAINT "LayananKlinik_poliklinikId_fkey" FOREIGN KEY ("poliklinikId") REFERENCES "Poliklinik"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resep" ADD CONSTRAINT "Resep_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resep" ADD CONSTRAINT "Resep_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resep" ADD CONSTRAINT "Resep_dokterId_fkey" FOREIGN KEY ("dokterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resep" ADD CONSTRAINT "Resep_penginputId_fkey" FOREIGN KEY ("penginputId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResepDetail" ADD CONSTRAINT "ResepDetail_resepId_fkey" FOREIGN KEY ("resepId") REFERENCES "Resep"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResepDetail" ADD CONSTRAINT "ResepDetail_obatId_fkey" FOREIGN KEY ("obatId") REFERENCES "MasterObat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RujukanKeluar" ADD CONSTRAINT "RujukanKeluar_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RujukanKeluar" ADD CONSTRAINT "RujukanKeluar_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RujukanKeluar" ADD CONSTRAINT "RujukanKeluar_dokterId_fkey" FOREIGN KEY ("dokterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLaboratorium" ADD CONSTRAINT "OrderLaboratorium_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLaboratorium" ADD CONSTRAINT "OrderLaboratorium_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLaboratorium" ADD CONSTRAINT "OrderLaboratorium_dokterId_fkey" FOREIGN KEY ("dokterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLaboratoriumDetail" ADD CONSTRAINT "OrderLaboratoriumDetail_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "OrderLaboratorium"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagihan" ADD CONSTRAINT "Tagihan_kunjunganId_fkey" FOREIGN KEY ("kunjunganId") REFERENCES "Kunjungan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tagihan" ADD CONSTRAINT "Tagihan_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailTagihan" ADD CONSTRAINT "DetailTagihan_tagihanId_fkey" FOREIGN KEY ("tagihanId") REFERENCES "Tagihan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pembayaran" ADD CONSTRAINT "Pembayaran_tagihanId_fkey" FOREIGN KEY ("tagihanId") REFERENCES "Tagihan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisterUKM" ADD CONSTRAINT "RegisterUKM_pasienId_fkey" FOREIGN KEY ("pasienId") REFERENCES "Pasien"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegisterUKM" ADD CONSTRAINT "RegisterUKM_programId_fkey" FOREIGN KEY ("programId") REFERENCES "ProgramUKM"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogPemantauanUKM" ADD CONSTRAINT "LogPemantauanUKM_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "RegisterUKM"("id") ON DELETE CASCADE ON UPDATE CASCADE;
