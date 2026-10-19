import type {
    HealthMetricCategory,
    HealthMetricDefinition,
  } from "./types";
  
  /**
   * Canonical Health Trends metric registry.
   *
   * This is a deterministic registry.
   * No AI, API calls, or external services are used here.
   *
   * The normalization layer will use:
   *   source test name / normalized name
   *              ↓
   *          aliases below
   *              ↓
   *      canonical metric
   *
   * New laboratory naming variations can be added here without changing
   * the trend engine.
   */
  
  export const HEALTH_METRICS: HealthMetricDefinition[] = [
    /* ---------------------------------------------------------------------- */
    /* Blood                                                                  */
    /* ---------------------------------------------------------------------- */
  
    {
      id: "hemoglobin",
      displayName: "Hemoglobin",
      canonicalName: "hemoglobin",
      category: "BLOOD",
      aliases: [
        "hemoglobin",
        "haemoglobin",
        "hb",
        "hgb",
      ],
      defaultUnit: "g/dL",
      supportedUnits: ["g/dL", "g/L"],
      directionality: "NEUTRAL",
    },
  
    {
      id: "hematocrit",
      displayName: "Hematocrit",
      canonicalName: "hematocrit",
      category: "BLOOD",
      aliases: [
        "hematocrit",
        "haematocrit",
        "hct",
        "pcv",
        "packed cell volume",
      ],
      defaultUnit: "%",
      supportedUnits: ["%", "L/L"],
      directionality: "NEUTRAL",
    },
  
    {
      id: "white-blood-cell-count",
      displayName: "White Blood Cell Count",
      canonicalName: "white_blood_cell_count",
      category: "BLOOD_COUNT",
      aliases: [
        "white blood cell count",
        "white blood cells",
        "wbc",
        "wbc count",
        "total leukocyte count",
        "tlc",
        "leukocyte count",
      ],
      defaultUnit: "10^3/µL",
      supportedUnits: [
        "10^3/µL",
        "10^3/uL",
        "10^9/L",
        "/µL",
        "/uL",
      ],
      directionality: "NEUTRAL",
    },
  
    {
      id: "platelet-count",
      displayName: "Platelet Count",
      canonicalName: "platelet_count",
      category: "BLOOD_COUNT",
      aliases: [
        "platelet count",
        "platelets",
        "plt",
        "platelet",
      ],
      defaultUnit: "10^3/µL",
      supportedUnits: [
        "10^3/µL",
        "10^3/uL",
        "10^9/L",
        "/µL",
        "/uL",
      ],
      directionality: "NEUTRAL",
    },
  
    {
      id: "red-blood-cell-count",
      displayName: "Red Blood Cell Count",
      canonicalName: "red_blood_cell_count",
      category: "BLOOD_COUNT",
      aliases: [
        "red blood cell count",
        "red blood cells",
        "rbc",
        "rbc count",
        "erythrocyte count",
      ],
      defaultUnit: "10^6/µL",
      supportedUnits: [
        "10^6/µL",
        "10^6/uL",
        "10^12/L",
        "/µL",
        "/uL",
      ],
      directionality: "NEUTRAL",
    },
  
    /* ---------------------------------------------------------------------- */
    /* Cardiovascular                                                         */
    /* ---------------------------------------------------------------------- */
  
    {
      id: "total-cholesterol",
      displayName: "Total Cholesterol",
      canonicalName: "total_cholesterol",
      category: "CARDIOVASCULAR",
      aliases: [
        "total cholesterol",
        "cholesterol total",
        "cholesterol",
        "tc",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "mmol/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "ldl-cholesterol",
      displayName: "LDL Cholesterol",
      canonicalName: "ldl_cholesterol",
      category: "CARDIOVASCULAR",
      aliases: [
        "ldl",
        "ldl cholesterol",
        "low density lipoprotein",
        "low-density lipoprotein",
        "ldl-c",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "mmol/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "hdl-cholesterol",
      displayName: "HDL Cholesterol",
      canonicalName: "hdl_cholesterol",
      category: "CARDIOVASCULAR",
      aliases: [
        "hdl",
        "hdl cholesterol",
        "high density lipoprotein",
        "high-density lipoprotein",
        "hdl-c",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "mmol/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "triglycerides",
      displayName: "Triglycerides",
      canonicalName: "triglycerides",
      category: "CARDIOVASCULAR",
      aliases: [
        "triglycerides",
        "triglyceride",
        "tg",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "mmol/L"],
      directionality: "HIGHER",
    },
  
    /* ---------------------------------------------------------------------- */
    /* Metabolic                                                               */
    /* ---------------------------------------------------------------------- */
  
    {
      id: "hba1c",
      displayName: "HbA1c",
      canonicalName: "hba1c",
      category: "METABOLIC",
      aliases: [
        "hba1c",
        "hb a1c",
        "a1c",
        "glycated hemoglobin",
        "glycosylated hemoglobin",
        "glycated haemoglobin",
        "glycosylated haemoglobin",
        "hemoglobin a1c",
        "haemoglobin a1c",
      ],
      defaultUnit: "%",
      supportedUnits: ["%", "mmol/mol"],
      directionality: "HIGHER",
    },
  
    {
      id: "fasting-blood-glucose",
      displayName: "Fasting Blood Glucose",
      canonicalName: "fasting_blood_glucose",
      category: "METABOLIC",
      aliases: [
        "fasting blood glucose",
        "fasting glucose",
        "fasting blood sugar",
        "fasting sugar",
        "fbs",
        "fb glucose",
        "glucose fasting",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "mmol/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "random-blood-glucose",
      displayName: "Random Blood Glucose",
      canonicalName: "random_blood_glucose",
      category: "METABOLIC",
      aliases: [
        "random blood glucose",
        "random glucose",
        "random blood sugar",
        "random sugar",
        "rbs",
        "glucose random",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "mmol/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "postprandial-blood-glucose",
      displayName: "Postprandial Blood Glucose",
      canonicalName: "postprandial_blood_glucose",
      category: "METABOLIC",
      aliases: [
        "postprandial blood glucose",
        "postprandial glucose",
        "post prandial glucose",
        "postprandial blood sugar",
        "postprandial sugar",
        "ppbs",
        "pp glucose",
        "2 hour postprandial glucose",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "mmol/L"],
      directionality: "HIGHER",
    },
  
    /* ---------------------------------------------------------------------- */
    /* Kidney                                                                  */
    /* ---------------------------------------------------------------------- */
  
    {
      id: "creatinine",
      displayName: "Creatinine",
      canonicalName: "creatinine",
      category: "KIDNEY",
      aliases: [
        "creatinine",
        "serum creatinine",
        "s creatinine",
        "serum creat",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "µmol/L", "umol/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "urea",
      displayName: "Urea",
      canonicalName: "urea",
      category: "KIDNEY",
      aliases: [
        "urea",
        "blood urea",
        "serum urea",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "mmol/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "blood-urea-nitrogen",
      displayName: "Blood Urea Nitrogen",
      canonicalName: "blood_urea_nitrogen",
      category: "KIDNEY",
      aliases: [
        "blood urea nitrogen",
        "bun",
        "serum bun",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "mmol/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "egfr",
      displayName: "eGFR",
      canonicalName: "egfr",
      category: "KIDNEY",
      aliases: [
        "egfr",
        "estimated glomerular filtration rate",
        "glomerular filtration rate",
        "gfr",
      ],
      defaultUnit: "mL/min/1.73m²",
      supportedUnits: ["mL/min/1.73m²"],
      directionality: "LOWER",
    },
  
    /* ---------------------------------------------------------------------- */
    /* Liver                                                                   */
    /* ---------------------------------------------------------------------- */
  
    {
      id: "alt",
      displayName: "ALT",
      canonicalName: "alt",
      category: "LIVER",
      aliases: [
        "alt",
        "sgpt",
        "alanine aminotransferase",
        "alanine transaminase",
      ],
      defaultUnit: "U/L",
      supportedUnits: ["U/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "ast",
      displayName: "AST",
      canonicalName: "ast",
      category: "LIVER",
      aliases: [
        "ast",
        "sgot",
        "aspartate aminotransferase",
        "aspartate transaminase",
      ],
      defaultUnit: "U/L",
      supportedUnits: ["U/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "alkaline-phosphatase",
      displayName: "Alkaline Phosphatase",
      canonicalName: "alkaline_phosphatase",
      category: "LIVER",
      aliases: [
        "alkaline phosphatase",
        "alkaline phosphatase serum",
        "alp",
      ],
      defaultUnit: "U/L",
      supportedUnits: ["U/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "total-bilirubin",
      displayName: "Total Bilirubin",
      canonicalName: "total_bilirubin",
      category: "LIVER",
      aliases: [
        "total bilirubin",
        "bilirubin total",
        "bilirubin",
        "tbil",
      ],
      defaultUnit: "mg/dL",
      supportedUnits: ["mg/dL", "µmol/L", "umol/L"],
      directionality: "HIGHER",
    },
  
    {
      id: "albumin",
      displayName: "Albumin",
      canonicalName: "albumin",
      category: "LIVER",
      aliases: [
        "albumin",
        "serum albumin",
      ],
      defaultUnit: "g/dL",
      supportedUnits: ["g/dL", "g/L"],
      directionality: "NEUTRAL",
    },
  
    /* ---------------------------------------------------------------------- */
    /* Thyroid                                                                 */
    /* ---------------------------------------------------------------------- */
  
    {
      id: "tsh",
      displayName: "TSH",
      canonicalName: "tsh",
      category: "THYROID",
      aliases: [
        "tsh",
        "thyroid stimulating hormone",
        "thyroid-stimulating hormone",
        "thyrotropin",
      ],
      defaultUnit: "µIU/mL",
      supportedUnits: ["µIU/mL", "uIU/mL", "mIU/L"],
      directionality: "NEUTRAL",
    },
  
    {
      id: "free-t4",
      displayName: "Free T4",
      canonicalName: "free_t4",
      category: "THYROID",
      aliases: [
        "free t4",
        "ft4",
        "free thyroxine",
        "free t-4",
      ],
      defaultUnit: "ng/dL",
      supportedUnits: ["ng/dL", "pmol/L"],
      directionality: "NEUTRAL",
    },
  
    {
      id: "free-t3",
      displayName: "Free T3",
      canonicalName: "free_t3",
      category: "THYROID",
      aliases: [
        "free t3",
        "ft3",
        "free triiodothyronine",
        "free t-3",
      ],
      defaultUnit: "pg/mL",
      supportedUnits: ["pg/mL", "pmol/L"],
      directionality: "NEUTRAL",
    },
  
    /* ---------------------------------------------------------------------- */
    /* Nutrition                                                               */
    /* ---------------------------------------------------------------------- */
  
    {
      id: "vitamin-d",
      displayName: "Vitamin D",
      canonicalName: "vitamin_d",
      category: "NUTRITION",
      aliases: [
        "vitamin d",
        "vitamin d3",
        "25 oh vitamin d",
        "25-oh vitamin d",
        "25 hydroxy vitamin d",
        "25-hydroxy vitamin d",
        "25 oh d",
        "25(oh)d",
      ],
      defaultUnit: "ng/mL",
      supportedUnits: ["ng/mL", "nmol/L"],
      directionality: "NEUTRAL",
    },
  
    {
      id: "vitamin-b12",
      displayName: "Vitamin B12",
      canonicalName: "vitamin_b12",
      category: "NUTRITION",
      aliases: [
        "vitamin b12",
        "b12",
        "cobalamin",
        "serum vitamin b12",
      ],
      defaultUnit: "pg/mL",
      supportedUnits: ["pg/mL", "pmol/L"],
      directionality: "NEUTRAL",
    },
  
    {
      id: "ferritin",
      displayName: "Ferritin",
      canonicalName: "ferritin",
      category: "NUTRITION",
      aliases: [
        "ferritin",
        "serum ferritin",
      ],
      defaultUnit: "ng/mL",
      supportedUnits: ["ng/mL", "µg/L"],
      directionality: "NEUTRAL",
    },
  
    /* ---------------------------------------------------------------------- */
    /* Body                                                                    */
    /* ---------------------------------------------------------------------- */
  
    {
      id: "weight",
      displayName: "Weight",
      canonicalName: "weight",
      category: "BODY",
      aliases: [
        "weight",
        "body weight",
        "bodyweight",
      ],
      defaultUnit: "kg",
      supportedUnits: ["kg", "g", "lb", "lbs"],
      directionality: "NEUTRAL",
    },
  
    {
      id: "bmi",
      displayName: "BMI",
      canonicalName: "bmi",
      category: "BODY",
      aliases: [
        "bmi",
        "body mass index",
      ],
      defaultUnit: "kg/m²",
      supportedUnits: ["kg/m²"],
      directionality: "NEUTRAL",
    },
  
    /* ---------------------------------------------------------------------- */
    /* Inflammation                                                            */
    /* ---------------------------------------------------------------------- */
  
    {
      id: "crp",
      displayName: "CRP",
      canonicalName: "crp",
      category: "INFLAMMATION",
      aliases: [
        "crp",
        "c reactive protein",
        "c-reactive protein",
        "c reactive protein serum",
      ],
      defaultUnit: "mg/L",
      supportedUnits: ["mg/L", "mg/dL"],
      directionality: "HIGHER",
    },
  
    {
      id: "esr",
      displayName: "ESR",
      canonicalName: "esr",
      category: "INFLAMMATION",
      aliases: [
        "esr",
        "erythrocyte sedimentation rate",
        "sedimentation rate",
      ],
      defaultUnit: "mm/hr",
      supportedUnits: ["mm/hr", "mm/h"],
      directionality: "HIGHER",
    },
  ];
  
  /* -------------------------------------------------------------------------- */
  /* Lookup helpers                                                             */
  /* -------------------------------------------------------------------------- */
  
  /**
   * Normalize a name for deterministic alias matching.
   *
   * This does not use fuzzy AI matching. It simply makes common formatting
   * differences equivalent.
   */
  export function normalizeMetricName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[()[\]{}]/g, " ")
      .replace(/[-_/]+/g, " ")
      .replace(/\s+/g, " ");
  }
  
  /**
   * Find a canonical metric from a source test name or normalized name.
   */
  export function findHealthMetric(
    name: string | null | undefined,
  ): HealthMetricDefinition | null {
    if (!name) {
      return null;
    }
  
    const normalizedName = normalizeMetricName(name);
  
    for (const metric of HEALTH_METRICS) {
      if (normalizeMetricName(metric.canonicalName) === normalizedName) {
        return metric;
      }
  
      if (
        metric.aliases.some(
          (alias) => normalizeMetricName(alias) === normalizedName,
        )
      ) {
        return metric;
      }
    }
  
    return null;
  }
  
  /**
   * Retrieve a metric directly by canonical ID.
   */
  export function getHealthMetric(
    metricId: string,
  ): HealthMetricDefinition | null {
    return HEALTH_METRICS.find((metric) => metric.id === metricId) ?? null;
  }
  
  /**
   * Retrieve all metrics belonging to a category.
   */
  export function getHealthMetricsByCategory(
    category: HealthMetricCategory,
  ): HealthMetricDefinition[] {
    return HEALTH_METRICS.filter((metric) => metric.category === category);
  }