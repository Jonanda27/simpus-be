const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const apoteker = await prisma.user.upsert({
    where: { username: 'apoteker' },
    update: {},
    create: {
      username: 'apoteker',
      password: hashedPassword,
      namaLengkap: 'Budi Farmasi, S.Farm., Apt.',
      role: 'APOTEKER',
    },
  });

  console.log('Seeded Apoteker successfully:', apoteker);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
