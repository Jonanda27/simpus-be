const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const dokterService = {
  // Get all dokters
  getAllDokter: async () => {
    return await prisma.user.findMany({
      where: {
        role: 'DOKTER',
      },
      include: {
        poliklinik: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  // Create new dokter
  createDokter: async (data) => {
    // Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUser) {
      throw new Error('Username sudah digunakan. Silakan pilih username lain.');
    }

    // Default password 'dokter123' if not provided
    const plainPassword = data.password || 'dokter123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    return await prisma.user.create({
      data: {
        namaLengkap: data.namaLengkap,
        username: data.username,
        password: hashedPassword,
        role: 'DOKTER',
        poliklinikId: data.poliklinikId || null,
      },
    });
  },

  // Update dokter
  updateDokter: async (id, data) => {
    const updateData = {
      namaLengkap: data.namaLengkap,
      username: data.username,
      poliklinikId: data.poliklinikId || null,
    };

    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
    });
  },

  // Delete dokter
  deleteDokter: async (id) => {
    return await prisma.user.delete({
      where: { id },
    });
  },
};

module.exports = dokterService;
