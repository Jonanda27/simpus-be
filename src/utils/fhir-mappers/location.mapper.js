const buildLocationPayload = (poliklinik, orgId) => {
  return {
    resourceType: "Location",
    identifier: [
      {
        system: `http://sys-ids.kemkes.go.id/location/${orgId}`,
        value: poliklinik.kodePoli
      }
    ],
    status: "active",
    name: poliklinik.namaPoli,
    description: poliklinik.deskripsi || `Ruang Pelayanan ${poliklinik.namaPoli}`,
    mode: "instance",
    physicalType: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/location-physical-type",
          code: "ro",
          display: "Room"
        }
      ]
    },
    managingOrganization: {
      reference: `Organization/${orgId}`
    }
  };
};

module.exports = { buildLocationPayload };
