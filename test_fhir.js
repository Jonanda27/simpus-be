const satusehatService = require('./src/services/satusehat.service');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
  try {
    const nik = '9271060312000001';
    const result = await satusehatService.getPatientByNIK(nik);
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error(error);
  }
}

test();
