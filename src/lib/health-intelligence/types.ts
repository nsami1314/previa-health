/**
 * Previa Health Intelligence
 *
 * Deterministic domain contracts for understanding the available medical
 * record as one longitudinal story.
 *
 * Important architectural boundary:
 *
 * Health Trends
 *   → answers "What is happening to my measurements?"
 *
 * Health Intelligence
 *   → answers "What relationships, unresolved items, conflicts, continuity
 *      signals, and record blind spots become visible when the record is
 *      considered together?"
 *
 * This module does not call an LLM and does not diagnose, prescribe, or
 * generate treatment decisions.
 */

/* -------------------------------------------------------------------------- */
/* Source records                                                             */
/* -------------------------------------------------------------------------- */

export type HealthIntelligenceSourceType =
  | "medical_report"
  | "medical_observation"
  | "medication"
  | "condition"
  | "health_profile"
  | "health_goal";

export interface HealthIntelligenceSource {
  id: string;
  type: HealthIntelligenceSourceType;
  title: string;
  date: string | null;
  detail: string;
  reportId?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Evidence                                                                   */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceEvidence {
  sourceId: string;
  sourceType: HealthIntelligenceSourceType;
  title: string;
  date: string | null;
  detail: string;
  reportId?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Insight taxonomy                                                           */
/* -------------------------------------------------------------------------- */

export type HealthIntelligenceInsightType =
  | "dont_miss"
  | "connection"
  | "persistence"
  | "change"
  | "conflict"
  | "care_loop"
  | "medication"
  | "record_gap"
  | "new_finding";

export type HealthIntelligenceDomain =
  | "cardiovascular"
  | "metabolic"
  | "kidney"
  | "liver"
  | "thyroid"
  | "hematology"
  | "respiratory"
  | "neurological"
  | "gastrointestinal"
  | "musculoskeletal"
  | "reproductive"
  | "urological"
  | "infectious"
  | "general"
  | "medication"
  | "care_continuity"
  | "record_integrity";

/* -------------------------------------------------------------------------- */
/* Priority / confidence                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Priority is a presentation priority, not a medical risk score.
 */
export type HealthIntelligencePriority =
  | "high"
  | "medium"
  | "low";

/**
 * Confidence describes how strongly the available records support the
 * relationship detected by the deterministic engine.
 *
 * It is NOT diagnostic confidence.
 */
export type HealthIntelligenceConfidence =
  | "strong"
  | "moderate"
  | "limited";

/* -------------------------------------------------------------------------- */
/* Standard insight object                                                    */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceInsight {
  id: string;

  type: HealthIntelligenceInsightType;

  domain: HealthIntelligenceDomain;

  priority: HealthIntelligencePriority;

  confidence: HealthIntelligenceConfidence;

  title: string;

  statement: string;

  /**
   * What was actually observed.
   */
  what: string;

  /**
   * Why the engine surfaced it.
   */
  why: string;

  /**
   * Evidence supporting the insight.
   */
  evidence: HealthIntelligenceEvidence[];

  /**
   * Important limitation or interpretation boundary.
   */
  limitation: string;

  /**
   * Optional first/last dates of the evidence involved.
   */
  firstDate: string | null;

  lastDate: string | null;

  /**
   * Canonical entities involved in the relationship.
   *
   * Examples:
   * ["hba1c"]
   * ["carotid", "doppler"]
   * ["atorvastatin", "ldl"]
   */
  relatedEntities: string[];

  /**
   * Stable rule identifier.
   *
   * This allows the deterministic engine to be versioned and tested without
   * changing the user-facing insight text.
   */
  ruleId: string;
}

/* -------------------------------------------------------------------------- */
/* Medical report                                                             */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceReport {
  id: string;

  userId: string;

  fileName: string;

  reportType: string;

  reportDate: string | null;

  uploadedAt: string | null;

  /**
   * Whether a report_analysis row exists.
   */
  hasAnalysis: boolean;

  /**
   * AI-generated extraction is treated as stored evidence.
   *
   * Health Intelligence itself does NOT call AI.
   */
  analysis: HealthIntelligenceReportAnalysis | null;
}

/* -------------------------------------------------------------------------- */
/* Report analysis                                                            */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceMedicationReference {
  name: string;
  dosage: string | null;
  frequency: string | null;
  instructions: string | null;
}

export interface HealthIntelligenceReportAnalysis {
  id?: string;

  reportId: string;

  summary: string | null;

  diagnoses: string[];

  abnormalFindings: string[];

  normalFindings: string[];

  possibleConditions: string[];

  doctorQuestions: string[];

  followUpTests: string[];

  recommendations: string[];

  medications: HealthIntelligenceMedicationReference[];

  /**
   * Original stored AI response/extracted JSON, retained for compatibility
   * and provenance. The deterministic engine may inspect it but never asks
   * an AI model to generate new information.
   */
  raw: Record<string, unknown>;
}

/* -------------------------------------------------------------------------- */
/* Medical observations                                                       */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceObservation {
  id: string;

  userId: string;

  medicalReportId: string | null;

  observationDate: string | null;

  testName: string;

  normalizedName: string | null;

  value: number | null;

  unit: string | null;

  referenceRange: string | null;

  abnormalFlag: string | null;
}

/* -------------------------------------------------------------------------- */
/* Medications                                                                */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceMedication {
  id: string;

  userId: string;

  reportId: string | null;

  medicineName: string;

  dosage: string | null;

  frequency: string | null;

  startDate: string | null;

  endDate: string | null;

  status: string | null;

  notes: string | null;

  source: string | null;

  confidence: number | null;

  createdAt: string | null;

  updatedAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* Health conditions                                                          */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceCondition {
  id: string;

  userId: string;

  conditionName: string;

  status: string | null;

  diagnosedDate: string | null;

  notes: string | null;

  createdAt: string | null;
}

/* -------------------------------------------------------------------------- */
/* Health profile                                                             */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceProfile {
  id?: string;

  userId?: string;

  fullName?: string | null;

  dateOfBirth?: string | null;

  gender?: string | null;

  bloodGroup?: string | null;

  allergies?: string | null;

  currentMedications?: string | null;

  medicalConditions?: string | null;

  familyHistory?: string | null;

  lifestyle?: string | null;

  notes?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Health goals                                                               */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceGoal {
  id: string;

  userId: string;

  title?: string | null;

  goalName?: string | null;

  description?: string | null;

  status?: string | null;

  targetDate?: string | null;

  createdAt?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Complete record input                                                      */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceRecord {
  reports: HealthIntelligenceReport[];

  observations: HealthIntelligenceObservation[];

  medications: HealthIntelligenceMedication[];

  conditions: HealthIntelligenceCondition[];

  profile: HealthIntelligenceProfile | null;

  goals: HealthIntelligenceGoal[];
}

/* -------------------------------------------------------------------------- */
/* Record snapshot                                                            */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceRecordSnapshot {
  reportCount: number;

  analyzedReportCount: number;

  observationCount: number;

  medicationCount: number;

  conditionCount: number;

  goalCount: number;

  reportTypes: string[];

  dateRange: {
    from: string | null;
    to: string | null;
  };

  sourceCoverage: {
    laboratory: number;
    imaging: number;
    sonography: number;
    doppler: number;
    consultation: number;
    prescription: number;
    discharge: number;
    other: number;
  };
}

/* -------------------------------------------------------------------------- */
/* Record integrity                                                           */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceRecordIntegrity {
  score: number;

  label:
    | "well_documented"
    | "partially_documented"
    | "limited_record";

  explanation: string;

  factors: {
    reports: boolean;
    analyses: boolean;
    observations: boolean;
    medications: boolean;
    conditions: boolean;
    longitudinalEvidence: boolean;
  };
}

/**
 * This is deliberately NOT called a health score.
 *
 * It describes how much structured/documented information Previa currently
 * has available for longitudinal reasoning.
 */

/* -------------------------------------------------------------------------- */
/* Intelligence result                                                        */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceResult {
  source: "deterministic";

  generatedAt: string;

  summary: string;

  recordSnapshot: HealthIntelligenceRecordSnapshot;

  recordIntegrity: HealthIntelligenceRecordIntegrity;

  /**
   * Evidence-backed questions the person can take to a healthcare
   * professional. These are either saved with a report analysis or produced
   * by a deterministic record rule; they are not generated by a new AI call.
   */
  clinicianQuestions: HealthIntelligenceClinicianQuestion[];

  /**
   * Highest-priority signals.
   */
  dontMiss: HealthIntelligenceInsight[];

  /**
   * Relationships across multiple sources.
   */
  connections: HealthIntelligenceInsight[];

  /**
   * Persistent or repeated documented findings.
   */
  persistence: HealthIntelligenceInsight[];

  /**
   * Important structural changes in the record.
   */
  changes: HealthIntelligenceInsight[];

  /**
   * Sources that describe potentially conflicting information.
   */
  conflicts: HealthIntelligenceInsight[];

  /**
   * Documentation/care continuity signals.
   */
  careLoops: HealthIntelligenceInsight[];

  /**
   * Medication-related reconciliation signals.
   */
  medicationSignals: HealthIntelligenceInsight[];

  /**
   * Reports or evidence that cannot currently be connected/processed.
   */
  recordGaps: HealthIntelligenceInsight[];

  /**
   * Newly appearing findings.
   */
  newFindings: HealthIntelligenceInsight[];

  /**
   * All unique insights after deterministic prioritization and deduplication.
   *
   * The UI can use this collection when a future view wants a unified feed.
   */
  allInsights: HealthIntelligenceInsight[];
}

export interface HealthIntelligenceClinicianQuestion {
  id: string;

  question: string;

  source: "saved_report_question" | "record_follow_up";

  evidence: HealthIntelligenceEvidence[];

  limitation: string;
}

/* -------------------------------------------------------------------------- */
/* Engine configuration                                                        */
/* -------------------------------------------------------------------------- */

export interface HealthIntelligenceEngineOptions {
  /**
   * Maximum number of insights returned in each category.
   */
  maxPerCategory?: number;

  /**
   * Maximum number of evidence records attached to one insight.
   */
  maxEvidencePerInsight?: number;

  /**
   * Number of days within which two pieces of evidence can be considered
   * temporally related.
   */
  temporalAssociationDays?: number;
}
