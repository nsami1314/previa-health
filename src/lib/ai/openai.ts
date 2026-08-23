import OpenAI from "openai";
import { REPORT_ANALYSIS_PROMPT } from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeMedicalReport(reportText: string) {
  const response = await openai.responses.create({
    model: "gpt-5",

    input: [
      {
        role: "system",
        content: REPORT_ANALYSIS_PROMPT,
      },
      {
        role: "user",
        content: reportText,
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