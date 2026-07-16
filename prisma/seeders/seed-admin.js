const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Menjalankan seeder untuk pembuatan akun ADMIN...');

  const passwordHash = await bcrypt.hash('admin123', 10);

  // Buat atau perbarui akun admin
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: passwordHash,
      role: 'ADMIN',
    },
    create: {
      username: 'admin',
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Seeder selesai! Akun ADMIN berhasil dibuat.');
  console.log(`Username : ${adminUser.username}`);
  console.log('Password : admin123');
  console.log(`Role     : ${adminUser.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
