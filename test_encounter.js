const satusehatService = require('./src/services/satusehat.service');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  try {
    const data = {
      pasienIhs: 'P02478375538', // Dummy Pasien IHS
      pasienName: 'pa** 1**',
      dokterIhs: '59da44e8-11ac-4c60-8ab1-a3452b66db34', // Dummy Dokter
      dokterName: 'dr. Dito Arifin, Sp.M',
      poliIhs: '38a9db0c-8d07-4581-9b16-5626a5cd5291', // Assuming some location
      poliName: 'Poli Gigi',
      noKunjungan: 'G-005'
    };
    
    // I need a real location ID. Wait, I will just try to hit it with whatever.
    // The user just synced Poli Gigi, so let's find the location ID from the DB.
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const poli = await prisma.poliklinik.findFirst({ where: { kodePoli: 'GIGI' }});
    if(poli && poli.ihsLocationId) {
       data.poliIhs = poli.ihsLocationId;
    } else {
       console.log("Poli Gigi has no IHS Location ID. Exiting.");
       return;
    }

    const res = await satusehatService.createEncounter(data);
    console.log("Success!", res);
  } catch (error) {
    console.error("Failed:", error.response?.data ? JSON.stringify(error.response.data, null, 2) : error.message);
  }
}
test();
