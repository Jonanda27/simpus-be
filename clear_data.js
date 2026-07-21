const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Memulai penghapusan data Pasien, Dokter, dan Kunjungan...');

  try {
    // 1. Hapus Pasien (ini akan men-cascade Kunjungan dan data terkait pasien)
    const deletedPasien = await prisma.pasien.deleteMany({});
    console.log(`Berhasil menghapus ${deletedPasien.count} Pasien.`);

    // 2. Hapus Dokter (User dengan role DOKTER)
    const deletedDokter = await prisma.user.deleteMany({
      where: {
        role: 'DOKTER'
      }
    });
    console.log(`Berhasil menghapus ${deletedDokter.count} Dokter.`);

    // Note: Kunjungan sudah terhapus otomatis karena cascade dari Pasien dan Dokter.
    const deletedKunjungan = await prisma.kunjungan.deleteMany({});
    console.log(`Berhasil menghapus ${deletedKunjungan.count} Kunjungan tersisa.`);

    console.log('Selesai menghapus data!');
  } catch (error) {
    console.error('Terjadi kesalahan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
