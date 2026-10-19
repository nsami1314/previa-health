/**
 * Previa Health Intelligence
 *
 * Deterministic terminology and entity normalization.
 *
 * Purpose:
 * - Convert different ways of writing the same medical concept into a
 *   canonical identifier.
 * - Support cross-report relationships without requiring an AI model.
 * - Keep normalization conservative: an unknown term is preserved rather
 *   than being guessed.
 *
 * This file does NOT diagnose conditions or interpret clinical meaning.
 */

/* -------------------------------------------------------------------------- */
/* Basic text normalization                                                   */
/* -------------------------------------------------------------------------- */

export function normalizeText(value: unknown): string {
    if (typeof value !== "string") {
      return "";
    }
  
    return value
      .trim()
      .toLowerCase()
      .replace(/[‐-‒–—]/g, "-")
      .replace(/[^\p{L}\p{N}%/.\-+\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  export function compactText(value: unknown): string {
    return normalizeText(value).replace(/[\s._-]+/g, "");
  }
  
  /* -------------------------------------------------------------------------- */
  /* Canonical medical entities                                                 */
  /* -------------------------------------------------------------------------- */
  
  export interface NormalizedEntity {
    canonical: string;
  
    displayName: string;
  
    aliases: string[];
  
    domain:
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
  }
  
  /* -------------------------------------------------------------------------- */
  /* Entity dictionaries                                                        */
  /* -------------------------------------------------------------------------- */
  
  const ENTITY_DEFINITIONS: NormalizedEntity[] = [
    /* ------------------------------ Metabolic ------------------------------ */
  
    {
      canonical: "hba1c",
      displayName: "HbA1c",
      aliases: [
        "hba1c",
        "hb a1c",
        "hb-a1c",
        "glycated hemoglobin",
        "glycosylated hemoglobin",
        "hemoglobin a1c",
        "ha1c",
      ],
      domain: "metabolic",
    },
  
    {
      canonical: "fasting_glucose",
      displayName: "Fasting glucose",
      aliases: [
        "fasting glucose",
        "fasting blood glucose",
        "fasting blood sugar",
        "fbs",
        "fasting plasma glucose",
      ],
      domain: "metabolic",
    },
  
    {
      canonical: "random_glucose",
      displayName: "Random glucose",
      aliases: [
        "random glucose",
        "random blood glucose",
        "random blood sugar",
        "rbs",
        "random plasma glucose",
      ],
      domain: "metabolic",
    },
  
    {
      canonical: "glucose",
      displayName: "Glucose",
      aliases: [
        "glucose",
        "blood glucose",
        "blood sugar",
        "serum glucose",
        "plasma glucose",
      ],
      domain: "metabolic",
    },
  
    {
      canonical: "insulin",
      displayName: "Insulin",
      aliases: [
        "insulin",
        "fasting insulin",
        "serum insulin",
      ],
      domain: "metabolic",
    },
  
    /* -------------------------- Lipid / cardiovascular --------------------- */
  
    {
      canonical: "total_cholesterol",
      displayName: "Total cholesterol",
      aliases: [
        "total cholesterol",
        "cholesterol total",
        "serum cholesterol",
        "tc",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "ldl",
      displayName: "LDL cholesterol",
      aliases: [
        "ldl",
        "ldl-c",
        "ldl c",
        "ldl cholesterol",
        "low density lipoprotein",
        "low-density lipoprotein",
        "low density lipoprotein cholesterol",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "hdl",
      displayName: "HDL cholesterol",
      aliases: [
        "hdl",
        "hdl-c",
        "hdl c",
        "hdl cholesterol",
        "high density lipoprotein",
        "high-density lipoprotein",
        "high density lipoprotein cholesterol",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "triglycerides",
      displayName: "Triglycerides",
      aliases: [
        "triglycerides",
        "triglyceride",
        "tg",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "vldl",
      displayName: "VLDL cholesterol",
      aliases: [
        "vldl",
        "vldl-c",
        "vldl cholesterol",
        "very low density lipoprotein",
        "very-low-density lipoprotein",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "non_hdl",
      displayName: "Non-HDL cholesterol",
      aliases: [
        "non hdl",
        "non-hdl",
        "non hdl cholesterol",
        "non-hdl cholesterol",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "apob",
      displayName: "Apolipoprotein B",
      aliases: [
        "apob",
        "apo b",
        "apo-b",
        "apolipoprotein b",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "lipoprotein_a",
      displayName: "Lipoprotein(a)",
      aliases: [
        "lipoprotein a",
        "lipoprotein(a)",
        "lpa",
        "lp(a)",
      ],
      domain: "cardiovascular",
    },
  
    /* -------------------------------- Kidney -------------------------------- */
  
    {
      canonical: "creatinine",
      displayName: "Creatinine",
      aliases: [
        "creatinine",
        "serum creatinine",
        "blood creatinine",
      ],
      domain: "kidney",
    },
  
    {
      canonical: "egfr",
      displayName: "eGFR",
      aliases: [
        "egfr",
        "e gfr",
        "estimated glomerular filtration rate",
        "glomerular filtration rate",
      ],
      domain: "kidney",
    },
  
    {
      canonical: "urea",
      displayName: "Urea",
      aliases: [
        "urea",
        "blood urea",
        "serum urea",
      ],
      domain: "kidney",
    },
  
    {
      canonical: "bun",
      displayName: "BUN",
      aliases: [
        "bun",
        "blood urea nitrogen",
      ],
      domain: "kidney",
    },
  
    {
      canonical: "uric_acid",
      displayName: "Uric acid",
      aliases: [
        "uric acid",
        "serum uric acid",
      ],
      domain: "kidney",
    },
  
    /* --------------------------------- Liver -------------------------------- */
  
    {
      canonical: "alt",
      displayName: "ALT",
      aliases: [
        "alt",
        "sgpt",
        "alanine aminotransferase",
        "alanine transaminase",
      ],
      domain: "liver",
    },
  
    {
      canonical: "ast",
      displayName: "AST",
      aliases: [
        "ast",
        "sgot",
        "aspartate aminotransferase",
        "aspartate transaminase",
      ],
      domain: "liver",
    },
  
    {
      canonical: "alp",
      displayName: "ALP",
      aliases: [
        "alp",
        "alkaline phosphatase",
      ],
      domain: "liver",
    },
  
    {
      canonical: "bilirubin_total",
      displayName: "Total bilirubin",
      aliases: [
        "bilirubin",
        "total bilirubin",
        "bilirubin total",
      ],
      domain: "liver",
    },
  
    {
      canonical: "albumin",
      displayName: "Albumin",
      aliases: [
        "albumin",
        "serum albumin",
      ],
      domain: "liver",
    },
  
    /* -------------------------------- Thyroid ------------------------------- */
  
    {
      canonical: "tsh",
      displayName: "TSH",
      aliases: [
        "tsh",
        "thyroid stimulating hormone",
        "thyroid-stimulating hormone",
        "thyrotropin",
      ],
      domain: "thyroid",
    },
  
    {
      canonical: "free_t4",
      displayName: "Free T4",
      aliases: [
        "free t4",
        "ft4",
        "free thyroxine",
        "thyroxine free",
      ],
      domain: "thyroid",
    },
  
    {
      canonical: "free_t3",
      displayName: "Free T3",
      aliases: [
        "free t3",
        "ft3",
        "free triiodothyronine",
        "triiodothyronine free",
      ],
      domain: "thyroid",
    },
  
    /* ------------------------------- Hematology ----------------------------- */
  
    {
      canonical: "hemoglobin",
      displayName: "Hemoglobin",
      aliases: [
        "hemoglobin",
        "haemoglobin",
        "hb",
        "hgb",
      ],
      domain: "hematology",
    },
  
    {
      canonical: "wbc",
      displayName: "White blood cell count",
      aliases: [
        "wbc",
        "white blood cell count",
        "white blood cells",
        "leukocyte count",
        "total leukocyte count",
        "tlc",
      ],
      domain: "hematology",
    },
  
    {
      canonical: "platelets",
      displayName: "Platelet count",
      aliases: [
        "platelets",
        "platelet count",
        "platelet",
        "plt",
      ],
      domain: "hematology",
    },
  
    {
      canonical: "rbc",
      displayName: "Red blood cell count",
      aliases: [
        "rbc",
        "red blood cell count",
        "red blood cells",
        "erythrocyte count",
      ],
      domain: "hematology",
    },
  
    {
      canonical: "hematocrit",
      displayName: "Hematocrit",
      aliases: [
        "hematocrit",
        "haematocrit",
        "pcv",
        "packed cell volume",
      ],
      domain: "hematology",
    },
  
    /* ------------------------------ Respiratory ----------------------------- */
  
    {
      canonical: "spo2",
      displayName: "SpO₂",
      aliases: [
        "spo2",
        "sp02",
        "oxygen saturation",
        "o2 saturation",
        "oxygen sat",
        "pulse oximetry",
      ],
      domain: "respiratory",
    },
  
    /* ------------------------------ General labs ---------------------------- */
  
    {
      canonical: "crp",
      displayName: "CRP",
      aliases: [
        "crp",
        "c-reactive protein",
        "c reactive protein",
      ],
      domain: "general",
    },
  
    {
      canonical: "esr",
      displayName: "ESR",
      aliases: [
        "esr",
        "erythrocyte sedimentation rate",
        "sedimentation rate",
      ],
      domain: "general",
    },
  
    /* ------------------------------ Cardiovascular -------------------------- */
  
    {
      canonical: "systolic_bp",
      displayName: "Systolic blood pressure",
      aliases: [
        "systolic bp",
        "systolic blood pressure",
        "sbp",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "diastolic_bp",
      displayName: "Diastolic blood pressure",
      aliases: [
        "diastolic bp",
        "diastolic blood pressure",
        "dbp",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "heart_rate",
      displayName: "Heart rate",
      aliases: [
        "heart rate",
        "pulse rate",
        "pulse",
        "hr",
      ],
      domain: "cardiovascular",
    },
  
    /* ------------------------------ Anatomical terms ------------------------ */
  
    {
      canonical: "carotid",
      displayName: "Carotid arteries",
      aliases: [
        "carotid",
        "carotid artery",
        "carotid arteries",
        "internal carotid",
        "internal carotid artery",
        "ica",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "carotid_doppler",
      displayName: "Carotid Doppler",
      aliases: [
        "carotid doppler",
        "carotid duplex",
        "carotid duplex scan",
        "carotid ultrasound",
        "carotid usg",
        "doppler carotid",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "thyroid",
      displayName: "Thyroid",
      aliases: [
        "thyroid",
        "thyroid gland",
      ],
      domain: "thyroid",
    },
  
    {
      canonical: "liver",
      displayName: "Liver",
      aliases: [
        "liver",
        "hepatic",
        "hepatic system",
      ],
      domain: "liver",
    },
  
    {
      canonical: "kidney",
      displayName: "Kidneys",
      aliases: [
        "kidney",
        "kidneys",
        "renal",
        "renal system",
      ],
      domain: "kidney",
    },
  
    {
      canonical: "heart",
      displayName: "Heart",
      aliases: [
        "heart",
        "cardiac",
        "cardiovascular",
      ],
      domain: "cardiovascular",
    },
  
    {
      canonical: "brain",
      displayName: "Brain",
      aliases: [
        "brain",
        "cerebral",
        "intracranial",
        "cranial",
      ],
      domain: "neurological",
    },
  
    {
      canonical: "neck",
      displayName: "Neck",
      aliases: [
        "neck",
        "cervical",
      ],
      domain: "general",
    },
  ];
  
  /* -------------------------------------------------------------------------- */
  /* Lookup indexes                                                             */
  /* -------------------------------------------------------------------------- */
  
  const ENTITY_BY_ALIAS = new Map<string, NormalizedEntity>();
  
  for (const entity of ENTITY_DEFINITIONS) {
    ENTITY_BY_ALIAS.set(compactText(entity.canonical), entity);
  
    for (const alias of entity.aliases) {
      ENTITY_BY_ALIAS.set(compactText(alias), entity);
    }
  }
  
  /* -------------------------------------------------------------------------- */
  /* Normalization                                                              */
  /* -------------------------------------------------------------------------- */
  
  export function normalizeMedicalEntity(
    value: unknown,
  ): NormalizedEntity | null {
    const normalized = compactText(value);
  
    if (!normalized) {
      return null;
    }
  
    return ENTITY_BY_ALIAS.get(normalized) ?? null;
  }
  
  export function canonicalizeMedicalEntity(value: unknown): string | null {
    return normalizeMedicalEntity(value)?.canonical ?? null;
  }
  
  export function getMedicalEntityDisplayName(value: unknown): string {
    const entity = normalizeMedicalEntity(value);
  
    if (entity) {
      return entity.displayName;
    }
  
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  
    return "Unknown finding";
  }
  
  export function getMedicalEntityDomain(
    value: unknown,
  ): NormalizedEntity["domain"] | null {
    return normalizeMedicalEntity(value)?.domain ?? null;
  }
  
  /* -------------------------------------------------------------------------- */
  /* Alias matching                                                             */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Determines whether two strings represent the same known medical entity.
   *
   * Unknown strings are deliberately NOT considered equal merely because they
   * contain similar words.
   */
  export function isSameMedicalEntity(
    first: unknown,
    second: unknown,
  ): boolean {
    const firstEntity = normalizeMedicalEntity(first);
    const secondEntity = normalizeMedicalEntity(second);
  
    if (!firstEntity || !secondEntity) {
      return false;
    }
  
    return firstEntity.canonical === secondEntity.canonical;
  }
  
  /**
   * Returns all known canonical entities that appear in a larger piece of text.
   *
   * Matching is conservative and based only on the explicit entity dictionary.
   */
  export function extractMedicalEntities(text: unknown): NormalizedEntity[] {
    const normalized = normalizeText(text);
  
    if (!normalized) {
      return [];
    }
  
    const found = new Map<string, NormalizedEntity>();
  
    for (const entity of ENTITY_DEFINITIONS) {
      const aliases = [entity.canonical, ...entity.aliases];
  
      for (const alias of aliases) {
        const normalizedAlias = normalizeText(alias);
  
        if (!normalizedAlias) {
          continue;
        }
  
        const escapedAlias = normalizedAlias.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&",
        );
  
        const pattern = new RegExp(
          `(^|[^\\p{L}\\p{N}])${escapedAlias}([^\\p{L}\\p{N}]|$)`,
          "iu",
        );
  
        if (pattern.test(normalized)) {
          found.set(entity.canonical, entity);
          break;
        }
      }
    }
  
    return Array.from(found.values());
  }
  
  /* -------------------------------------------------------------------------- */
  /* Report type normalization                                                  */
  /* -------------------------------------------------------------------------- */
  
  export type NormalizedReportType =
    | "laboratory"
    | "imaging"
    | "sonography"
    | "doppler"
    | "consultation"
    | "prescription"
    | "discharge"
    | "procedure"
    | "pathology"
    | "other";
  
  export function normalizeReportType(
    reportType: unknown,
    fileName?: unknown,
  ): NormalizedReportType {
    const source = `${normalizeText(reportType)} ${normalizeText(fileName)}`;
  
    if (
      /\b(lab|laboratory|blood test|cbc|lipid|thyroid|lft|kft|kidney function|liver function)\b/i.test(
        source,
      )
    ) {
      return "laboratory";
    }
  
    if (
      /\b(doppler|duplex)\b/i.test(source) ||
      /\bcarotid\b.*\bdoppler\b/i.test(source)
    ) {
      return "doppler";
    }
  
    if (
      /\b(sonography|sonogram|ultrasound|usg)\b/i.test(source)
    ) {
      return "sonography";
    }
  
    if (
      /\b(ct|mri|xray|x-ray|scan|imaging|radiology|pet scan|mammogram)\b/i.test(
        source,
      )
    ) {
      return "imaging";
    }
  
    if (
      /\b(consultation|consult|doctor|physician|clinical note|opd)\b/i.test(
        source,
      )
    ) {
      return "consultation";
    }
  
    if (
      /\b(prescription|rx|medicine|medication)\b/i.test(source)
    ) {
      return "prescription";
    }
  
    if (
      /\b(discharge|discharge summary)\b/i.test(source)
    ) {
      return "discharge";
    }
  
    if (
      /\b(biopsy|histopathology|pathology)\b/i.test(source)
    ) {
      return "pathology";
    }
  
    if (
      /\b(procedure|operation|surgery|operative note)\b/i.test(source)
    ) {
      return "procedure";
    }
  
    return "other";
  }
  
  /* -------------------------------------------------------------------------- */
  /* Finding normalization                                                      */
  /* -------------------------------------------------------------------------- */
  
  export function normalizeFindingText(value: unknown): string {
    return normalizeText(value)
      .replace(/\b\d+(?:\.\d+)?\s*(?:mg|g|ml|mmhg|mm|cm|%)\b/gi, " ")
      .replace(/\b\d+(?:\.\d+)?\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  
  /**
   * Conservative finding key.
   *
   * This is intentionally not a medical diagnosis classifier. It only
   * normalizes obvious textual duplication so repeated stored findings can be
   * compared deterministically.
   */
  export function createFindingKey(value: unknown): string {
    const entities = extractMedicalEntities(value);
  
    if (entities.length > 0) {
      return entities
        .map((entity) => entity.canonical)
        .sort()
        .join("|");
    }
  
    return normalizeFindingText(value)
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, "_")
      .slice(0, 160);
  }
  
  /* -------------------------------------------------------------------------- */
  /* Medication normalization                                                   */
  /* -------------------------------------------------------------------------- */
  
  export function normalizeMedicationName(value: unknown): string {
    const normalized = normalizeText(value);
  
    if (!normalized) {
      return "";
    }
  
    return normalized
      .replace(/\b\d+(?:\.\d+)?\s*(mg|mcg|g|ml|iu|units?)\b/gi, "")
      .replace(
        /\b(tablet|tab|capsule|cap|syrup|injection|inj|cream|ointment|drops?)\b/gi,
        "",
      )
      .replace(/\s+/g, " ")
      .trim();
  }
  
  /**
   * Conservative comparison of medication names.
   *
   * It intentionally does not attempt to infer active ingredients from brand
   * names. That requires a trusted medication knowledge base and should not be
   * guessed by the application.
   */
  export function isSameMedicationName(
    first: unknown,
    second: unknown,
  ): boolean {
    const a = normalizeMedicationName(first);
    const b = normalizeMedicationName(second);
  
    if (!a || !b) {
      return false;
    }
  
    return a === b;
  }
  
  /* -------------------------------------------------------------------------- */
  /* Date normalization                                                         */
  /* -------------------------------------------------------------------------- */
  
  export function normalizeDate(value: unknown): string | null {
    if (!value) {
      return null;
    }
  
    if (value instanceof Date) {
      return Number.isNaN(value.getTime())
        ? null
        : value.toISOString().slice(0, 10);
    }
  
    if (typeof value !== "string" && typeof value !== "number") {
      return null;
    }
  
    const date = new Date(value);
  
    if (Number.isNaN(date.getTime())) {
      return null;
    }
  
    return date.toISOString().slice(0, 10);
  }
  
  /* -------------------------------------------------------------------------- */
  /* Date utilities                                                             */
  /* -------------------------------------------------------------------------- */
  
  export function daysBetween(
    first: string | null,
    second: string | null,
  ): number | null {
    if (!first || !second) {
      return null;
    }
  
    const firstDate = new Date(`${first}T00:00:00Z`);
    const secondDate = new Date(`${second}T00:00:00Z`);
  
    if (
      Number.isNaN(firstDate.getTime()) ||
      Number.isNaN(secondDate.getTime())
    ) {
      return null;
    }
  
    return Math.abs(
      Math.round(
        (secondDate.getTime() - firstDate.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    );
  }
  
  /* -------------------------------------------------------------------------- */
/* Text classification helpers                                                */
/* -------------------------------------------------------------------------- */

export function looksLikeAbnormalFinding(value: unknown): boolean {
    const text = normalizeText(value);
  
    if (!text) {
      return false;
    }
  
    return /\b(abnormal|elevated|high|low|increased|decreased|reduced|raised|positive|negative|deficient|deficiency|enlarged|dilated|narrowed|stenosis|occlusion|obstruction|lesion|nodule|cyst|mass|calcification|plaque|thickening|inflammation|effusion|anemia|fatty|stone|degeneration|fracture)\b/i.test(
      text
    );
  }
  
  export function looksLikeResolvedFinding(value: unknown): boolean {
    const text = normalizeText(value);
  
    if (!text) {
      return false;
    }
  
    return /\b(resolved|resolution|normal|no\s+evidence\s+of|absent|not\s+seen|cleared|improved)\b/i.test(
      text
    );
  }
  
  export function looksLikeUncertainFinding(value: unknown): boolean {
    const text = normalizeText(value);
  
    if (!text) {
      return false;
    }
  
    return /\b(possible|probable|suggestive|suspicious|cannot\s+exclude|may\s+represent|could\s+represent|questionable|indeterminate)\b/i.test(
      text
    );
  }
  
  /* -------------------------------------------------------------------------- */
  /* Public dictionary access                                                   */
  /* -------------------------------------------------------------------------- */
  
  export function getAllMedicalEntities(): NormalizedEntity[] {
    return [...ENTITY_DEFINITIONS];
  }