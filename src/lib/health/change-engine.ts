export type HealthObservation = {
  id?: string;
  medical_report_id?: string;
  observation_date?: string | null;
  test_name: string;
  normalized_name?: string | null;
  value?: number | null;
  unit?: string | null;
  reference_range?: string | null;
  abnormal_flag?: string | null;
};

export type HealthChange = {
  test_name: string;
  normalized_name: string | null;
  previous_value: number | null;
  latest_value: number | null;
  absolute_change: number | null;
  percentage_change: number | null;
  unit: string | null;
  reference_range: string | null;
  previous_abnormal_flag: string | null;
  latest_abnormal_flag: string | null;
  observation_date: string | null;
  change_type:
    | "new_test"
    | "value_change"
    | "normal_to_abnormal"
    | "abnormal_to_normal"
    | "abnormal_change";
};

function getTestKey(observation: HealthObservation): string {
  const rawName =
    observation.normalized_name?.trim() ||
    observation.test_name.trim();

  const name = rawName
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[/:(),]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const canonicalNames: Record<string, string> = {
    "total cholesterol": "total_cholesterol",
    "cholesterol total": "total_cholesterol",
    "total cholesterol tc": "total_cholesterol",

    "hdl": "hdl_cholesterol",
    "hdl c": "hdl_cholesterol",
    "hdl cholesterol": "hdl_cholesterol",

    "ldl": "ldl_cholesterol",
    "ldl c": "ldl_cholesterol",
    "ldl cholesterol": "ldl_cholesterol",

    "triglycerides": "triglycerides",
    "tg": "triglycerides",

    "vldl": "vldl_cholesterol",
    "vldl cholesterol": "vldl_cholesterol",

    "non hdl cholesterol": "non_hdl_cholesterol",
    "non hdl c": "non_hdl_cholesterol",

    "cholesterol hdl c": "cholesterol_hdl_ratio",
    "cholesterol hdl ratio": "cholesterol_hdl_ratio",
    "total cholesterol hdl ratio": "cholesterol_hdl_ratio",

    "hba1c": "hba1c",
    "hba1c percent": "hba1c",
    "glycated hemoglobin": "hba1c",
    "glycosylated hemoglobin": "hba1c",

    "estimated average glucose": "estimated_average_glucose",
    "eag": "estimated_average_glucose",
  };

  return (
    canonicalNames[name] ||
    name.replace(/\s+/g, "_")
  );
}

function isNumericValue(
  value: number | null | undefined
): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeFlag(flag: string | null | undefined): string {
  return flag?.trim().toLowerCase() || "";
}

/**
 * Returns:
 * true  = explicitly abnormal
 * false = explicitly normal
 * null  = unknown / not provided
 */
function getAbnormalStatus(
  flag: string | null | undefined
): boolean | null {
  const normalized = normalizeFlag(flag);

  if (!normalized) {
    return null;
  }

  const abnormalFlags = [
    "high",
    "low",
    "abnormal",
    "positive",
    "critical",
    "critical high",
    "critical low",
    "h",
    "l",
    "hh",
    "ll",
    "positive abnormal",
  ];

  if (abnormalFlags.includes(normalized)) {
    return true;
  }

  const normalFlags = [
    "normal",
    "negative",
    "within range",
    "within normal limits",
    "normal range",
    "n",
  ];

  if (normalFlags.includes(normalized)) {
    return false;
  }

  // Unknown flag should not be assumed to mean normal.
  return null;
}

function valuesAreMeaningfullyDifferent(
  previous: number,
  latest: number
): boolean {
  if (previous === latest) {
    return false;
  }

  const absoluteChange = Math.abs(latest - previous);

  // Ignore tiny reporting / floating-point differences.
  if (absoluteChange < 0.01) {
    return false;
  }

  // For values close to zero, use an absolute threshold.
  if (Math.abs(previous) < 1) {
    return absoluteChange >= 0.1;
  }

  const percentageChange =
    (absoluteChange / Math.abs(previous)) * 100;

  /*
   * Initial local gating threshold.
   *
   * This is NOT a clinical significance threshold.
   * It only determines whether an additional AI
   * interpretation may be worth requesting.
   */
  return percentageChange >= 5;
}

function getChangeType(
  previous: HealthObservation,
  latest: HealthObservation,
  hasValueChange: boolean
): HealthChange["change_type"] | null {
  const previousStatus = getAbnormalStatus(
    previous.abnormal_flag
  );

  const latestStatus = getAbnormalStatus(
    latest.abnormal_flag
  );

  // Explicit normal -> abnormal.
  if (
    previousStatus === false &&
    latestStatus === true
  ) {
    return "normal_to_abnormal";
  }

  // Explicit abnormal -> normal.
  if (
    previousStatus === true &&
    latestStatus === false
  ) {
    return "abnormal_to_normal";
  }

  // Both explicitly abnormal and value changed.
  if (
    previousStatus === true &&
    latestStatus === true &&
    hasValueChange
  ) {
    return "abnormal_change";
  }

  // Numeric value changed meaningfully.
  if (hasValueChange) {
    return "value_change";
  }

  return null;
}

export function detectMeaningfulChanges(
  previousObservations: HealthObservation[],
  newObservations: HealthObservation[]
): HealthChange[] {
  const previousByTest = new Map<
    string,
    HealthObservation[]
  >();

  for (const observation of previousObservations) {
    const key = getTestKey(observation);

    if (!previousByTest.has(key)) {
      previousByTest.set(key, []);
    }

    previousByTest.get(key)!.push(observation);
  }

  const changes: HealthChange[] = [];

  for (const latest of newObservations) {
    const key = getTestKey(latest);

    const previousList =
      previousByTest.get(key) || [];

    /*
     * Test has never appeared before.
     *
     * A genuinely new lab/test result is useful context
     * for the incremental AI state.
     */
    if (previousList.length === 0) {
      changes.push({
        test_name: latest.test_name,
        normalized_name:
          latest.normalized_name || null,

        previous_value: null,

        latest_value: isNumericValue(latest.value)
          ? latest.value
          : null,

        absolute_change: null,
        percentage_change: null,

        unit: latest.unit || null,

        reference_range:
          latest.reference_range || null,

        previous_abnormal_flag: null,

        latest_abnormal_flag:
          latest.abnormal_flag || null,

        observation_date:
          latest.observation_date || null,

        change_type: "new_test",
      });

      continue;
    }

    /*
     * Find the most recent previous observation
     * for this test.
     */
    const sortedPrevious = [...previousList].sort(
      (a, b) => {
        const dateA = a.observation_date
          ? new Date(
              a.observation_date
            ).getTime()
          : 0;

        const dateB = b.observation_date
          ? new Date(
              b.observation_date
            ).getTime()
          : 0;

        return dateB - dateA;
      }
    );

    const previous = sortedPrevious[0];

    /*
     * Explicitly narrow values to number | null.
     * This also keeps TypeScript happy.
     */
    const previousValue = isNumericValue(
      previous.value
    )
      ? previous.value
      : null;

    const latestValue = isNumericValue(
      latest.value
    )
      ? latest.value
      : null;

    const hasValueChange =
      previousValue !== null &&
      latestValue !== null &&
      valuesAreMeaningfullyDifferent(
        previousValue,
        latestValue
      );

    const previousStatus =
      getAbnormalStatus(
        previous.abnormal_flag
      );

    const latestStatus =
      getAbnormalStatus(
        latest.abnormal_flag
      );

    /*
     * Only count a status transition when both
     * statuses are explicitly known.
     */
    const abnormalStatusChanged =
      previousStatus !== null &&
      latestStatus !== null &&
      previousStatus !== latestStatus;

    const changeType = getChangeType(
      previous,
      latest,
      hasValueChange
    );

    if (!changeType) {
      continue;
    }

    const absoluteChange =
      previousValue !== null &&
      latestValue !== null
        ? latestValue - previousValue
        : null;

    const percentageChange =
      previousValue !== null &&
      latestValue !== null &&
      previousValue !== 0
        ? ((latestValue - previousValue) /
            Math.abs(previousValue)) *
          100
        : null;

    /*
     * Safety check:
     *
     * A change must either be a meaningful numeric
     * change or an explicit normal/abnormal transition.
     */
    if (
      !hasValueChange &&
      !abnormalStatusChanged
    ) {
      continue;
    }

    changes.push({
      test_name: latest.test_name,

      normalized_name:
        latest.normalized_name || null,

      previous_value: previousValue,

      latest_value: latestValue,

      absolute_change: absoluteChange,

      percentage_change: percentageChange,

      unit:
        latest.unit ||
        previous.unit ||
        null,

      reference_range:
        latest.reference_range ||
        previous.reference_range ||
        null,

      previous_abnormal_flag:
        previous.abnormal_flag || null,

      latest_abnormal_flag:
        latest.abnormal_flag || null,

      observation_date:
        latest.observation_date || null,

      change_type: changeType,
    });
  }

  return changes;
}