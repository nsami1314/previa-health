/**
 * Previa Health
 * Document Engine
 * File information utilities
 */

import { ValidationError } from "./errors";
import { getDocumentTypeFromMime } from "./mime";
import { DocumentType } from "./types";

export interface FileInfo {
  filename: string;
  extension: string;
  mimeType: string;
  documentType: DocumentType;
  size: number;
  isPdf: boolean;
  isImage: boolean;
}

export function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf(".");

  if (index === -1) {
    throw new ValidationError("File has no extension");
  }

  return filename.slice(index + 1).toLowerCase();
}

export function getFileInfo(file: File): FileInfo {
  const extension = getFileExtension(file.name);

  const documentType = getDocumentTypeFromMime(file.type);

  return {
    filename: file.name,
    extension,
    mimeType: file.type,
    documentType,
    size: file.size,
    isPdf: documentType === DocumentType.PDF,
    isImage: documentType !== DocumentType.PDF,
  };
}