const satusehatService = require('./src/services/satusehat.service');

async function testKfa() {
  try {
    const result = await satusehatService.searchKFA('paracetamol');
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testKfa();
