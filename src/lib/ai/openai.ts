import OpenAI from "openai";
import {
  HEALTH_OVERVIEW_PROMPT,
  REPORT_ANALYSIS_PROMPT,
  INCREMENTAL_HEALTH_OVERVIEW_PROMPT,
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

  const response = await openai.responses.create({
    model: "gpt-5",

    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: REPORT_ANALYSIS_PROMPT,
          },
        ],
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

  return JSON.parse(response.output_text);
}

export async function analyzeHealthOverview(
  observations: unknown
) {
  const response = await openai.responses.create({
    model: "gpt-5",

    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: HEALTH_OVERVIEW_PROMPT,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify(observations),
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

  return JSON.parse(response.output_text);
}

export async function updateHealthOverviewIncrementally(
  existingHealthState: unknown,
  meaningfulChanges: unknown,
  newObservations: unknown
): Promise<IncrementalHealthOverviewResult> {
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
            text: JSON.stringify({
              existing_health_state:
                existingHealthState ?? {},
              meaningful_changes:
                meaningfulChanges ?? [],
              new_observations:
                newObservations ?? [],
            }),
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

  return JSON.parse(
    response.output_text
  ) as IncrementalHealthOverviewResult;
}