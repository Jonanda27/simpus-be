/**
  * Dictionary LOINC & SNOMED-CT untuk Head to Toe
  */
const HEAD_TO_TOE_LOINC = {
  kepala: { loinc: "10199-8", display: "Physical findings of Head Narrative" },
  mata: { loinc: "10197-2", display: "Physical findings of Eye Narrative" },
  telinga: { loinc: "10195-6", display: "Physical findings of Ear Narrative" },
  hidung: { loinc: "10203-8", display: "Physical findings of Nose Narrative" },
  rambut: { loinc: "32436-8", display: "Physical findings of Hair" },
  bibir: { loinc: "32446-7", display: "Physical findings of Lip" },
  gigi: { loinc: "85910-8", display: "Physical findings of Teeth and Gum Narrative" },
  lidah: { loinc: "32483-0", display: "Physical findings of Tongue" },
  langitLangit: { loinc: "10201-2", display: "Physical findings of Mouth and Throat and Teeth Narrative", snomed: "72914001", snomedDisplay: "Palatal structure" },
  leher: { loinc: "11411-6", display: "Physical findings of Neck Narrative" },
  tenggorokan: { loinc: "56867-5", display: "Physical findings of Throat Narrative" },
  tonsil: { loinc: "10201-2", display: "Physical findings of Mouth and Throat and Teeth Narrative", snomed: "91636008", snomedDisplay: "Bilateral palatine tonsils" },
  dada: { loinc: "11391-0", display: "Physical findings of Chest Narrative" },
  payudara: { loinc: "10193-1", display: "Physical findings of Breasts Narrative" },
  punggung: { loinc: "10192-3", display: "Physical findings of Back Narrative" },
  perut: { loinc: "10191-5", display: "Physical findings of Abdomen Narrative" },
  genital: { loinc: "11400-9", display: "Physical findings of Genitalia Narrative" },
  anus: { loinc: "11388-6", display: "Physical findings of Buttocks Narrative", snomed: "53505006", snomedDisplay: "Anal structure" },
  lenganAtas: { loinc: "11386-0", display: "Physical findings of Upper Arm Narrative" },
  lenganBawah: { loinc: "11398-5", display: "Physical findings of Forearm Narrative" },
  jariTangan: { loinc: "11404-1", display: "Physical findings of Hand Narrative", snomed: "7569003", snomedDisplay: "Finger structure" },
  kukuTangan: { loinc: "32456-6", display: "Physical findings of Nail", snomed: "770812000", snomedDisplay: "Entire nail unit of finger" },
  persendianTangan: { loinc: "11415-7", display: "Physical findings of Wrist Narrative" },
  tungkaiAtas: { loinc: "11414-0", display: "Physical findings of Thigh Narrative" },
  tungkaiBawah: { loinc: "11389-4", display: "Physical findings of Calf Narrative" },
  jariKaki: { loinc: "11397-7", display: "Physical findings of Foot Narrative", snomed: "29707007", snomedDisplay: "Toe structure" },
  kukuKaki: { loinc: "32456-6", display: "Physical findings of Nail", snomed: "770805009", snomedDisplay: "Structure of nail unit of toe" },
  persendianKaki: { loinc: "11385-2", display: "Physical findings of Ankle Narrative", snomed: "26552008", snomedDisplay: "Foot joint structure" }
};

const buildObservationPayload = (data) => {
  const startEncounter = new Date().toISOString();

  const payload = {
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: data.categoryCode || "vital-signs",
            display: data.categoryDisplay || "Vital Signs"
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: data.loincCode,
          display: data.loincDisplay
        }
      ]
    },
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    encounter: {
      reference: `Encounter/${data.encounterId}`
    },
    ...(data.dokterIhs && {
      performer: [
        {
          reference: `Practitioner/${data.dokterIhs}`,
          display: data.dokterName
        }
      ]
    }),
    effectiveDateTime: data.effectiveDateTime || startEncounter
  };

  // Khusus untuk tekanan darah (Blood Pressure), strukturnya beda karena pakai "component"
  if (data.loincCode === "85354-9") {
    payload.component = data.components;
  } else if (data.valueCodeableConcept) {
    payload.valueCodeableConcept = data.valueCodeableConcept;
  } else if (data.valueString !== undefined) {
    payload.valueString = data.valueString;
  } else {
    payload.valueQuantity = {
      value: data.value,
      unit: data.unit,
      system: "http://unitsofmeasure.org",
      code: data.unitCode
    };
  }

  return payload;
};

/**
 * Build Observation Payload untuk Tingkat Kesadaran (LOINC 67775-7 + SNOMED-CT)
 */
const buildConsciousnessObservationPayload = (data) => {
  const snomedMap = {
    'alert': { code: '248234008', display: 'Mentally alert' },
    'voice': { code: '300202002', display: 'Response to voice' },
    'pain': { code: '450847001', display: 'Responds to pain' },
    'unresponsive': { code: '422768004', display: 'Unresponsive' },
    'confusion': { code: '130987000', display: 'Acute confusion' },
    'delirium': { code: '2776000', display: 'Delirium' }
  };

  const selected = snomedMap[data.kesadaranCode] || snomedMap['alert'];

  return buildObservationPayload({
    ...data,
    categoryCode: "exam",
    categoryDisplay: "Exam",
    loincCode: "67775-7",
    loincDisplay: "Level of responsiveness",
    valueCodeableConcept: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: data.snomedCode || selected.code,
          display: data.snomedDisplay || selected.display
        }
      ]
    }
  });
};

/**
 * Build Observation Payload untuk Pemeriksaan Fisik Head to Toe (Category: exam)
 */
const buildPhysicalExamObservationPayload = (data) => {
  const organMeta = HEAD_TO_TOE_LOINC[data.organKey] || {};
  const loincCode = data.loincCode || organMeta.loinc || "29545-1";
  const loincDisplay = data.loincDisplay || organMeta.display || "Physical findings";

  const codings = [
    {
      system: "http://loinc.org",
      code: loincCode,
      display: loincDisplay
    }
  ];

  if (organMeta.snomed) {
    codings.push({
      system: "http://snomed.info/sct",
      code: organMeta.snomed,
      display: organMeta.snomedDisplay
    });
  }

  return {
    resourceType: "Observation",
    status: "final",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "exam",
            display: "Exam"
          }
        ]
      }
    ],
    code: {
      coding: codings
    },
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    encounter: {
      reference: `Encounter/${data.encounterId}`
    },
    effectiveDateTime: data.effectiveDateTime || new Date().toISOString(),
    valueString: data.hasilPemeriksaan
  };
};

/**
 * Build Observation Payload untuk Status Psikologis (Survey - LOINC 8693-4)
 */
const buildPsychologicalStatusObservationPayload = (data) => {
  const psikoMap = {
    'normal': { code: '17326005', display: 'Well in self' },
    'cemas': { code: '48694002', display: 'Feeling anxious' },
    'takut': { code: '1402001', display: 'Afraid' },
    'marah': { code: '75408008', display: 'Feeling angry' },
    'sedih': { code: '420038007', display: 'Feeling unhappy' },
    'lainnya': { code: '74964007', display: 'Other' }
  };

  const selected = psikoMap[data.psikologisKey] || psikoMap['normal'];

  return buildObservationPayload({
    ...data,
    categoryCode: "survey",
    categoryDisplay: "Survey",
    loincCode: "8693-4",
    loincDisplay: "Mental Status",
    valueCodeableConcept: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: data.snomedCode || selected.code,
          display: data.snomedDisplay || selected.display
        }
      ],
      ...(data.text && { text: data.text })
    }
  });
};

module.exports = { 
  HEAD_TO_TOE_LOINC,
  buildObservationPayload, 
  buildConsciousnessObservationPayload,
  buildPhysicalExamObservationPayload,
  buildPsychologicalStatusObservationPayload
};
