const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Menjalankan seeder untuk pembuatan akun ADMINISTRASI...');

  const passwordHash = await bcrypt.hash('loket123', 10);

  // Buat atau perbarui akun administrasi
  const admUser = await prisma.user.upsert({
    where: { username: 'loket1' },
    update: {
      password: passwordHash,
      role: 'ADMINISTRASI',
    },
    create: {
      username: 'loket1',
      password: passwordHash,
      role: 'ADMINISTRASI',
    },
  });

  console.log('Seeder selesai! Akun ADMINISTRASI berhasil dibuat.');
  console.log(`Username : ${admUser.username}`);
  console.log('Password : loket123');
  console.log(`Role     : ${admUser.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
