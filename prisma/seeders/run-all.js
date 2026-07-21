const { execSync } = require('child_process');
const path = require('path');

const seeders = [
  'seed-admin.js',
  'seed-adm.js',
  'seed-apoteker.js',
  'seed-icd10.js',
  'seed-icd9.js',
  'seed-klinik.js',
  'seed-obat.js',
  'seed-aset.js'
];

console.log('--- STARTING ALL SEEDERS ---');
for (const seeder of seeders) {
  const filePath = path.join(__dirname, seeder);
  console.log(`Executing seeder: ${seeder}...`);
  try {
    execSync(`node "${filePath}"`, { stdio: 'inherit' });
    console.log(`Successfully completed: ${seeder}\n`);
  } catch (error) {
    console.error(`FAILED to execute: ${seeder}`);
    console.error(error.message);
    process.exit(1);
  }
}
console.log('--- ALL SEEDERS COMPLETED SUCCESSFULLY ---');
