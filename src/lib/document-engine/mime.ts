/**
 * Previa Health
 * Document Engine
 * MIME type detection utilities
 */

import { DocumentType } from "./types";
import { MimeDetectionError } from "./errors";

const MIME_TO_DOCUMENT_TYPE: Record<string, DocumentType> = {
  "application/pdf": DocumentType.PDF,

  "image/jpeg": DocumentType.JPEG,
  "image/jpg": DocumentType.JPG,
  "image/png": DocumentType.PNG,
  "image/webp": DocumentType.WEBP,
  "image/heic": DocumentType.HEIC,
  "image/heif": DocumentType.HEIC,
};

export function getDocumentTypeFromMime(
  mimeType: string
): DocumentType {
  const normalized = mimeType.trim().toLowerCase();

  const type = MIME_TO_DOCUMENT_TYPE[normalized];

  if (!type) {
    throw new MimeDetectionError(
      `Unsupported MIME type: ${mimeType}`
    );
  }

  return type;
}

export function isSupportedMimeType(
  mimeType: string
): boolean {
  return mimeType.trim().toLowerCase() in MIME_TO_DOCUMENT_TYPE;
}

export function isPdf(
  mimeType: string
): boolean {
  return (
    getDocumentTypeFromMime(mimeType) === DocumentType.PDF
  );
}

export function isImage(
  mimeType: string
): boolean {
  const type = getDocumentTypeFromMime(mimeType);

  return type !== DocumentType.PDF;
}