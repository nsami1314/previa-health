import OpenAI from "openai";
import {
  HEALTH_OVERVIEW_PROMPT,
  REPORT_ANALYSIS_PROMPT,
} from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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