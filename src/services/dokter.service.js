const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const satusehatService = require('./satusehat.service');

const dokterService = {
  // Get all dokters
  getAllDokter: async () => {
    return await prisma.user.findMany({
      where: {
        role: 'DOKTER',
      },
      include: {
        poliklinik: true,
        tenagaMedis: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  },

  // Create new dokter
  createDokter: async (data) => {
    // 1. Validasi NIK jika ada
    if (!data.nik) {
      throw new Error('NIK wajib diisi untuk mendaftarkan dokter.');
    }
    if (data.nik.length !== 16) {
      throw new Error('NIK harus terdiri dari 16 digit angka.');
    }

    // 2. Check if username already exists
    const existingUser = await prisma.user.findUnique({
      where: { username: data.username },
    });

    if (existingUser) {
      throw new Error('Username sudah digunakan. Silakan pilih username lain.');
    }
    
    // 3. Validasi ke SATUSEHAT
    let satusehatData = null;
    try {
      satusehatData = await satusehatService.getPractitionerByNIK(data.nik);
      if (!satusehatData.success) {
        throw new Error(satusehatData.message || 'NIK tidak valid atau tidak terdaftar di Kemenkes.');
      }
    } catch (error) {
      throw new Error(`Validasi SATUSEHAT gagal: ${error.message}`);
    }

    // Default password 'dokter123' if not provided
    const plainPassword = data.password || 'dokter123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 4. Create User and TenagaMedis in one transaction
    return await prisma.user.create({
      data: {
        namaLengkap: satusehatData?.data?.name?.[0]?.text || data.namaLengkap, // Utamakan nama dari Kemenkes
        username: data.username,
        password: hashedPassword,
        role: 'DOKTER',
        poliklinikId: data.poliklinikId || null,
        tenagaMedis: {
          create: {
            nik: data.nik,
            noIHS: satusehatData.ihsNumber,
          }
        }
      },
      include: {
        tenagaMedis: true,
      }
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
    
    // Jika update melibatkan NIK baru
    let tenagaMedisUpdate = undefined;
    if (data.nik) {
      if (data.nik.length !== 16) throw new Error('NIK harus 16 digit.');
      
      try {
        const satusehatData = await satusehatService.getPractitionerByNIK(data.nik);
        if (satusehatData.success) {
          updateData.namaLengkap = satusehatData?.data?.name?.[0]?.text || data.namaLengkap;
          tenagaMedisUpdate = {
            upsert: {
              create: { nik: data.nik, noIHS: satusehatData.ihsNumber },
              update: { nik: data.nik, noIHS: satusehatData.ihsNumber }
            }
          };
        } else {
           throw new Error(satusehatData.message);
        }
      } catch (error) {
         throw new Error(`Validasi SATUSEHAT gagal: ${error.message}`);
      }
    }

    if (tenagaMedisUpdate) {
       updateData.tenagaMedis = tenagaMedisUpdate;
    }

    return await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        tenagaMedis: true,
      }
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
