
import OpenAI from "openai";
import {
  HEALTH_INTELLIGENCE_PROMPT,
  HEALTH_OVERVIEW_PROMPT,
  INCREMENTAL_HEALTH_OVERVIEW_PROMPT,
  REPORT_ANALYSIS_PROMPT,
} from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type IncrementalHealthOverviewResult = {
  summary: string;
  key_changes: unknown[];
  patterns: unknown[];
  doctor_questions: unknown[];
  confidence: number;
};

export type HealthIntelligenceResult = {
  summary: string;
  recordSnapshot: {
    reportCount: number;
    reportTypes: string[];
    dateRange: {
      from: string | null;
      to: string | null;
    };
    observationCount: number;
  };
  findings: unknown[];
  connections: unknown[];
  changes: unknown[];
  gaps: unknown[];
  doctorQuestions: string[];
  confidence: number;
};

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * Diagnostic logging only.
 * Never logs report contents, patient details, API keys, or image data.
 */
function logAIRequest(
  operation: string,
  model: string,
  startedAt: number,
  sections: Record<string, number>,
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    input_tokens_details?: {
      cached_tokens?: number;
    };
  }
) {
  console.info(`[AI DIAGNOSTICS] ${operation}`, {
    model,
    duration_ms: Date.now() - startedAt,
    input_characters_by_section: sections,
    input_characters_total: Object.values(sections).reduce(
      (total, count) => total + count,
      0
    ),
    input_tokens: usage?.input_tokens ?? null,
    output_tokens: usage?.output_tokens ?? null,
    total_tokens: usage?.total_tokens ?? null,
    cached_input_tokens:
      usage?.input_tokens_details?.cached_tokens ?? null,
    usage_available: usage != null,
  });
}

export async function analyzeMedicalReport(
  reportText: string,
  pageImages: Buffer[] = []
) {
  const userContent: any[] = [
    {
      type: "input_text",
      text: reportText,
    },
  ];

  for (const image of pageImages) {
    userContent.push({
      type: "input_image",
      image_url: `data:image/png;base64,${image.toString("base64")}`,
    });
  }

  const startedAt = Date.now();

  const response = await openai.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: REPORT_ANALYSIS_PROMPT }],
      },
      {
        role: "user",
        content: userContent,
      },
    ],
    text: {
      format: {
        type: "json_object",
      },
    },
  });

  logAIRequest(
    "Medical Report Analysis",
    response.model,
    startedAt,
    {
      system_prompt: REPORT_ANALYSIS_PROMPT.length,
      report_text: reportText.length,
      image_count: pageImages.length,
      image_bytes: pageImages.reduce(
        (total, image) => total + image.length,
        0
      ),
    },
    response.usage
  );

  return JSON.parse(response.output_text);
}

export async function analyzeHealthOverview(observations: unknown) {
  const observationsText = JSON.stringify(observations);
  const startedAt = Date.now();

  const response = await openai.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: HEALTH_OVERVIEW_PROMPT }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: observationsText,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_object",
      },
    },
  });

  logAIRequest(
    "Health Overview",
    response.model,
    startedAt,
    {
      system_prompt: HEALTH_OVERVIEW_PROMPT.length,
      observations: observationsText.length,
    },
    response.usage
  );

  return JSON.parse(response.output_text);
}

export async function updateHealthOverviewIncrementally(
  existingHealthState: unknown,
  meaningfulChanges: unknown,
  newObservations: unknown
): Promise<IncrementalHealthOverviewResult> {
  const incrementalInput = JSON.stringify({
    existing_health_state: existingHealthState ?? {},
    meaningful_changes: meaningfulChanges ?? [],
    new_observations: newObservations ?? [],
  });

  const startedAt = Date.now();

  const response = await openai.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: INCREMENTAL_HEALTH_OVERVIEW_PROMPT,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: incrementalInput,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_object",
      },
    },
  });

  logAIRequest(
    "Incremental Health Overview",
    response.model,
    startedAt,
    {
      system_prompt: INCREMENTAL_HEALTH_OVERVIEW_PROMPT.length,
      health_state_changes_and_observations: incrementalInput.length,
    },
    response.usage
  );

  
const parsed: unknown = JSON.parse(response.output_text);

if (
  !parsed ||
  typeof parsed !== "object" ||
  Array.isArray(parsed)
) {
  throw new Error(
    "Invalid incremental Health AI response: expected a JSON object."
  );
}

const result = parsed as Record<string, unknown>;

if (
  typeof result.summary !== "string" ||
  !Array.isArray(result.key_changes) ||
  !Array.isArray(result.patterns) ||
  !Array.isArray(result.doctor_questions) ||
  typeof result.confidence !== "number" ||
  !Number.isFinite(result.confidence)
) {
  throw new Error(
    "Invalid incremental Health AI response: required fields are missing or malformed."
  );
}

return {
  summary: result.summary,
  key_changes: result.key_changes,
  patterns: result.patterns,
  doctor_questions: result.doctor_questions,
  confidence: Math.max(0, Math.min(1, result.confidence)),
};

}

export async function analyzeHealthIntelligence(
  healthRecord: unknown
): Promise<HealthIntelligenceResult> {
  const healthRecordText = JSON.stringify(healthRecord);
  const startedAt = Date.now();

  const response = await openai.responses.create({
    model: "gpt-5",
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: HEALTH_INTELLIGENCE_PROMPT,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: healthRecordText,
          },
        ],
      },
    ],
    text: {
      format: {
        type: "json_object",
      },
    },
  });

  logAIRequest(
    "Health Intelligence",
    response.model,
    startedAt,
    {
      system_prompt: HEALTH_INTELLIGENCE_PROMPT.length,
      health_record: healthRecordText.length,
    },
    response.usage
  );

  const parsed = JSON.parse(response.output_text);

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    recordSnapshot: {
      reportCount: asNumber(parsed.record_snapshot?.reportCount),
      reportTypes: asArray(parsed.record_snapshot?.reportTypes).filter(
        (item): item is string => typeof item === "string"
      ),
      dateRange: {
        from:
          typeof parsed.record_snapshot?.dateRange?.from === "string"
            ? parsed.record_snapshot.dateRange.from
            : null,
        to:
          typeof parsed.record_snapshot?.dateRange?.to === "string"
            ? parsed.record_snapshot.dateRange.to
            : null,
      },
      observationCount: asNumber(
        parsed.record_snapshot?.observationCount
      ),
    },
    findings: asArray(parsed.findings),
    connections: asArray(parsed.connections),
    changes: asArray(parsed.changes),
    gaps: asArray(parsed.gaps),
    doctorQuestions: asArray(parsed.doctorQuestions).filter(
      (item): item is string => typeof item === "string"
    ),
    confidence: Math.min(
      1,
      Math.max(0, asNumber(parsed.confidence))
    ),
  };
}