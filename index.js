require('dotenv').config();
// require('./src/workers/satusehat.worker'); // [DINONAKTIFKAN] Menggunakan Lapis 1 (Sync) di rawatJalan.service.js. Aktifkan kembali saat Redis tersedia.
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
