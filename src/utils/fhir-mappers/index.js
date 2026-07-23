const { buildLocationPayload } = require('./location.mapper');
const { buildEncounterPayload } = require('./encounter.mapper');
<<<<<<< HEAD
const { buildObservationPayload, buildPhysicalExamObservationPayload } = require('./observation.mapper');
=======
const { buildObservationPayload } = require('./observation.mapper');
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc
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
<<<<<<< HEAD
const { buildQuestionnaireResponsePayload } = require('./questionnaire-response.mapper');
const { buildFamilyMemberHistoryPayload } = require('./family-member-history.mapper');
const { buildMedicationStatementPayload } = require('./medication-statement.mapper');
=======
const { toRawatJalanBundle } = require('./bundle.mapper');
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc

module.exports = {
  buildLocationPayload,
  buildEncounterPayload,
  buildObservationPayload,
<<<<<<< HEAD
  buildPhysicalExamObservationPayload,
=======
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc
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
<<<<<<< HEAD
  buildQuestionnaireResponsePayload,
  buildFamilyMemberHistoryPayload,
  buildMedicationStatementPayload
=======
  toRawatJalanBundle
>>>>>>> 1f3cd31ad4b22d640644e62b13afc863e70fd8fc
};
