const { buildLocationPayload } = require('./location.mapper');
const { buildEncounterPayload } = require('./encounter.mapper');
<<<<<<< HEAD
const { 
  buildObservationPayload, 
  buildConsciousnessObservationPayload,
  buildPhysicalExamObservationPayload,
  buildPsychologicalStatusObservationPayload,
  HEAD_TO_TOE_LOINC
} = require('./observation.mapper');
=======
const { buildObservationPayload, toFHIRRadiologyObservation } = require('./observation.mapper');
>>>>>>> 251f5e81bda75763bd2204a8f5d79c81a92ee683
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
const { buildRelatedPersonPayload } = require('./related-person.mapper');
const { buildQuestionnaireResponsePayload } = require('./questionnaire-response.mapper');
const { toFHIRImagingStudy } = require('./imaging-study.mapper');
>>>>>>> 251f5e81bda75763bd2204a8f5d79c81a92ee683
const { toRawatJalanBundle } = require('./bundle.mapper');

module.exports = {
  buildLocationPayload,
  buildEncounterPayload,
  buildObservationPayload,
<<<<<<< HEAD
  buildConsciousnessObservationPayload,
  buildPhysicalExamObservationPayload,
  buildPsychologicalStatusObservationPayload,
  HEAD_TO_TOE_LOINC,
=======
  toFHIRRadiologyObservation,
>>>>>>> 251f5e81bda75763bd2204a8f5d79c81a92ee683
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
  buildMedicationStatementPayload,
=======
  buildRelatedPersonPayload,
  buildQuestionnaireResponsePayload,
  toFHIRImagingStudy,
>>>>>>> 251f5e81bda75763bd2204a8f5d79c81a92ee683
  toRawatJalanBundle
};
