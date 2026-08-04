/**
 * Previa Health
 * Document Engine
 * Custom error classes
 */

import { ProcessingStage } from "./types";

export class DocumentEngineError extends Error {
  public readonly stage: ProcessingStage;
  public readonly code: string;

  constructor(
    message: string,
    stage: ProcessingStage,
    code = "DOCUMENT_ENGINE_ERROR"
  ) {
    super(message);

    this.name = "DocumentEngineError";
    this.stage = stage;
    this.code = code;

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DocumentEngineError {
  constructor(message: string) {
    super(message, ProcessingStage.VALIDATION, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class MimeDetectionError extends DocumentEngineError {
  constructor(message: string) {
    super(message, ProcessingStage.MIME_DETECTION, "MIME_DETECTION_ERROR");
    this.name = "MimeDetectionError";
  }
}

export class OCRProcessingError extends DocumentEngineError {
  constructor(message: string) {
    super(message, ProcessingStage.OCR, "OCR_PROCESSING_ERROR");
    this.name = "OCRProcessingError";
  }
}

export class TextExtractionError extends DocumentEngineError {
  constructor(message: string) {
    super(message, ProcessingStage.TEXT_EXTRACTION, "TEXT_EXTRACTION_ERROR");
    this.name = "TextExtractionError";
  }
}

export class AIExtractionError extends DocumentEngineError {
  constructor(message: string) {
    super(message, ProcessingStage.AI_EXTRACTION, "AI_EXTRACTION_ERROR");
    this.name = "AIExtractionError";
  }
}