/**
 * Previa Health
 * Document Engine
 * Shared constants
 */

import { DocumentType, OCRProvider } from "./types";

export const DOCUMENT_ENGINE_NAME = "Previa Document Engine";
export const DOCUMENT_ENGINE_VERSION = "1.0.0";

export const DEFAULT_OCR_PROVIDER = OCRProvider.TESSERACT;

export const SUPPORTED_DOCUMENT_TYPES: readonly DocumentType[] = [
  DocumentType.PDF,
  DocumentType.JPG,
  DocumentType.JPEG,
  DocumentType.PNG,
  DocumentType.WEBP,
  DocumentType.HEIC,
];

export const SUPPORTED_MIME_TYPES: readonly string[] = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const DEFAULT_LANGUAGE = "eng";

export const DEFAULT_MAX_FILE_SIZE_MB = 20;

export const DEFAULT_MAX_PAGES = 100;

export const OCR_IMAGE_DPI = 300;

export const IMAGE_MAX_WIDTH = 2500;

export const IMAGE_MAX_HEIGHT = 3500;

export const OCR_CONFIDENCE_THRESHOLD = 60;

export const MAX_WARNING_COUNT = 50;

export const MAX_ERROR_COUNT = 50;