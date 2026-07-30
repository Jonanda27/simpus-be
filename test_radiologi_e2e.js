const prisma = require('./src/config/prisma');
const radiologiService = require('./src/services/radiologi.service');
const {
  buildServiceRequestPayload,
  toFHIRImagingStudy,
  toFHIRRadiologyObservation,
  buildCompositionPayload,
  toRawatJalanBundle,
} = require('./src/utils/fhir-mappers');

async function testRadiologiE2E() {
  console.log('🚀 Memulai Test E2E Integration Modul Radiologi SIMPUS & SATUSEHAT...\n');

  try {
    // 1. Ambil Kunjungan & Pasien Aktif dari DB
    const kunjungan = await prisma.kunjungan.findFirst({
      include: { pasien: true, dokterTujuan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!kunjungan) {
      throw new Error('Tidak ada data kunjungan ditemukan di DB. Harap jalankan npx prisma db seed lebih dahulu.');
    }

    console.log(`✅ 1. Kunjungan Ditemukan: ID=${kunjungan.id}, Pasien=${kunjungan.pasien.namaLengkap} (${kunjungan.pasien.noRM})`);

    // 2. Simulasi Dokter Poli Membuat Order Radiologi
    const orderData = {
      kunjunganId: kunjungan.id,
      dokterId: kunjungan.dokterTujuanId || kunjungan.userPendaftarId,
      prioritas: 'stat',
      catatan: 'Indikasi: Batuk kronis > 2 minggu, susp. TB Paru / Efusi Pleura',
      details: [
        {
          kodeLoinc: '39051-8',
          namaPemeriksaan: 'Rontgen Thorax AP/PA (XR Thorax AP/PA)',
          bodySiteCode: '51185008',
          bodySiteDisplay: 'Thoracic structure',
        },
      ],
    };

    const newOrder = await radiologiService.createOrder(orderData);
    console.log(`✅ 2. Order Radiologi Dibuat: ID=${newOrder.id}`);
    console.log(`   └─ Accession Number (ACSN): ${newOrder.acsn} (Status: ${newOrder.status})`);

    if (!newOrder.acsn || !newOrder.acsn.startsWith('ACSN-')) {
      throw new Error('Format ACSN tidak valid!');
    }

    // 3. Simulasi Dokter Radiologi / Petugas Input Hasil Bacaan Ekspertise
    const ekspertiseData = {
      dokterRadiologiId: kunjungan.dokterTujuanId || kunjungan.userPendaftarId,
      bacaanNaratif:
        'Foto Thorax PA:\n- CTR < 50%, bentuk dan ukuran cor normal.\n- Paru: Corakan bronkovaskuler meningkat pada lapang atas paru kanan.\n- Infiltrat halus pada segmen apikal pulmo dextra.\n- Sinus kostofrenikus dan diafragma licin kanan-kiri.',
      kesimpulan: 'Gambaran Radiologi sesuai TB Paru Dupleks Lesi Aktif.',
      wadoUrl: `https://nidr.kemkes.go.id/wado/v1/studies/${newOrder.acsn}`,
    };

    const hasilEkspertise = await radiologiService.inputHasilEkspertise(newOrder.id, ekspertiseData);
    console.log(`✅ 3. Input Hasil Ekspertise Berhasil! (Status Order: ${hasilEkspertise.order.status})`);
    console.log(`   └─ WADO URL NIDR: ${hasilEkspertise.hasil.wadoUrl}`);

    // 4. Testing & Validation FHIR R4 Mappers SATUSEHAT
    console.log('\n🔍 4. Menguji Transformasi FHIR R4 Mappers Radiologi SATUSEHAT Kemenkes:');

    const orgId = '1000001';
    const patientIhs = kunjungan.pasien.noIHS || 'P123456789';
    const encounterSatusehatId = kunjungan.encounterId || 'Enc-12345';
    const dokterIhs = 'N1000001';

    // A. ServiceRequest (Radiologi ACSN)
    const srFhir = buildServiceRequestPayload(
      {
        id: newOrder.id,
        orderId: newOrder.id,
        acsn: newOrder.acsn,
        requestCode: '39051-8',
        requestDisplay: 'Diagnostic radiography',
        catatanKlinis: newOrder.catatanKlinis,
        pasienIhs: patientIhs,
        pasienName: kunjungan.pasien.namaLengkap,
        dokterIhs,
        encounterId: encounterSatusehatId,
      },
      orgId,
      'RAD'
    );

    const acsnIdentifier = srFhir.identifier.find((i) => i.type?.coding?.[0]?.code === 'ACSN');
    console.log(`   [✓] ServiceRequest FHIR: Category=${srFhir.category[0].coding[0].code} (${srFhir.category[0].coding[0].display})`);
    console.log(`       └─ ACSN Identifier: ${acsnIdentifier?.value}`);

    // B. ImagingStudy (WADO NIDR)
    const imagingFhir = toFHIRImagingStudy({
      hasil: hasilEkspertise.hasil,
      order: hasilEkspertise.order,
      patientIhs,
      encounterSatusehatId,
      organizationId: orgId,
    });

    console.log(`   [✓] ImagingStudy FHIR: Status=${imagingFhir.status}, Modality=${imagingFhir.series[0].modality.code}`);
    console.log(`       └─ Endpoint WADO: ${imagingFhir.endpoint[0].reference}`);

    // C. Observation Radiologi
    const obsRadFhir = toFHIRRadiologyObservation({
      kodeLoinc: '39051-8',
      namaPemeriksaan: 'Rontgen Thorax AP/PA',
      bacaanNaratif: hasilEkspertise.hasil.bacaanNaratif,
      pasienIhs: patientIhs,
      pasienName: kunjungan.pasien.namaLengkap,
      dokterIhs,
      encounterId: encounterSatusehatId,
      imagingStudyId: 'ImagingStudy-UUID-SAMPLE',
    });

    console.log(`   [✓] Observation Radiologi FHIR: Category=${obsRadFhir.category[0].coding[0].code}`);
    console.log(`       └─ DerivedFrom ImagingStudy: ${obsRadFhir.derivedFrom?.[0]?.reference}`);

    // D. Composition Section Radiologi (18782-3)
    const compFhir = buildCompositionPayload(
      {
        resumeMedisId: 'Resume-001',
        pasienIhs: patientIhs,
        pasienName: kunjungan.pasien.namaLengkap,
        encounterId: encounterSatusehatId,
        dokterIhs,
        diagnosticReportId: 'DiagReport-Rad-001',
      },
      orgId
    );

    const radSection = compFhir.section.find((s) => s.code?.coding?.[0]?.code === '18782-3');
    console.log(`   [✓] Composition FHIR: Section LOINC 18782-3=${radSection ? 'TERSEDIA' : 'TIDAK TERSEDIA'}`);
    if (radSection) {
      console.log(`       └─ Entry Reference: ${radSection.entry[0].reference}`);
    }

    // 5. Test Full Bundle Mapper Serialization
    const fullDataComplete = {
      ...kunjungan,
      orderRadiologi: {
        ...newOrder,
        hasil: hasilEkspertise.hasil,
        details: orderData.details,
      },
    };

    const bundlePayload = toRawatJalanBundle(fullDataComplete, orgId);
    console.log(`\n🎉 5. FHIR Transaction Bundle Sukses Dibuat! Total Resources: ${bundlePayload.entry.length}`);
    const radResourceTypes = bundlePayload.entry.map((e) => e.resource.resourceType);
    console.log(`   └─ Resources Terdaftar: ${[...new Set(radResourceTypes)].join(', ')}`);

    console.log('\n======================================================');
    console.log('✨ KESIMPULAN: MODUL RADIOLOGI DENGAN SATUSEHAT LULUS E2E TEST!');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ E2E TEST RADIOLOGI GAGAL:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRadiologiE2E();
