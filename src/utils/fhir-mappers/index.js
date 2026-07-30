const { buildLocationPayload } = require('./location.mapper');
const { buildEncounterPayload } = require('./encounter.mapper');
const { buildObservationPayload } = require('./observation.mapper');
const { buildConditionPayload } = require('./condition.mapper');
const { buildMedicationPayload, buildMedicationRequestPayload } = require('./medication.mapper');
const { buildProcedurePayload } = require('./procedure.mapper');
const { buildAllergyPayload } = require('./allergy.mapper');
const { buildMedicationDispensePayload } = require('./medication-dispense.mapper');
const { buildPatientPayload } = require('./patient.mapper');
const { buildCompositionPayload } = require('./composition.mapper');
const { buildClinicalImpressionPayload } = require('./clinical-impression.mapper');
const { buildServiceRequestPayload } = require('./service-request.mapper');
const { buildSpecimenPayload } = require('./specimen.mapper');
const { buildRelatedPersonPayload } = require('./related-person.mapper');
const { buildQuestionnaireResponsePayload } = require('./questionnaire-response.mapper');
const { toRawatJalanBundle } = require('./bundle.mapper');

module.exports = {
  buildLocationPayload,
  buildEncounterPayload,
  buildObservationPayload,
  buildConditionPayload,
  buildMedicationPayload,
  buildMedicationRequestPayload,
  buildProcedurePayload,
  buildAllergyPayload,
  buildMedicationDispensePayload,
  buildPatientPayload,
  buildCompositionPayload,
  buildClinicalImpressionPayload,
  buildServiceRequestPayload,
  buildSpecimenPayload,
  buildRelatedPersonPayload,
  buildQuestionnaireResponsePayload,
  toRawatJalanBundle
};
