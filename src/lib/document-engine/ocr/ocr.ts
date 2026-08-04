/**
 * Previa Health
 * OCR Engine
 */

import { createWorker } from "tesseract.js";

import { OCRResult } from "../types";
import { DocumentEngineLogger } from "../logger";

export class OCREngine {
  async recognize(image: Buffer): Promise<OCRResult> {
    DocumentEngineLogger.info("Starting OCR");

    const worker = await createWorker("eng");

    try {
      const result = await worker.recognize(image);

      DocumentEngineLogger.info(
        `OCR finished (confidence ${result.data.confidence.toFixed(2)}%)`
      );

      return {
        text: result.data.text,
        confidence: result.data.confidence,
        language: "eng",
      };
    } finally {
      await worker.terminate();
    }
  }
}