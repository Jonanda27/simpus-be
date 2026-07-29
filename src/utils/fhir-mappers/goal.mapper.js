/**
 * FHIR R4 Goal Mapper for Tujuan Perawatan Pasien
 */
const buildGoalPayload = (data, orgId) => {
  const timeStamp = new Date().toLocaleTimeString('id-ID');
  const uniqueText = data.tujuanPerawatan 
    ? `${data.tujuanPerawatan} (${timeStamp})`
    : `Pemulihan kondisi kesehatan dan eliminasi keluhan pasien (${timeStamp})`;

  return {
    resourceType: "Goal",
    lifecycleStatus: "active",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/goal-category",
            code: "physiotherapy",
            display: "Physiotherapy"
          }
        ]
      }
    ],
    description: {
      text: uniqueText
    },
    subject: {
      reference: `Patient/${data.pasienIhs}`,
      display: data.pasienName
    },
    ...(data.dokterIhs && {
      expressedBy: {
        reference: `Practitioner/${data.dokterIhs}`,
        display: data.dokterName
      }
    }),
    ...(data.targetDate && {
      target: [
        {
          dueDate: new Date(data.targetDate).toISOString().split('T')[0]
        }
      ]
    })
  };
};

module.exports = { buildGoalPayload };
