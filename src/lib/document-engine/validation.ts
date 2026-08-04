/**
 * Previa Health
 * Document Engine
 * File validation
 */

import {
    DEFAULT_MAX_FILE_SIZE_MB,
    SUPPORTED_MIME_TYPES,
  } from "./constants";
  import { ValidationError } from "./errors";
  
  export function validateFile(file: File): void {
    validateMimeType(file.type);
    validateFileSize(file.size);
  }
  
  export function validateMimeType(mimeType: string): void {
    const normalized = mimeType.trim().toLowerCase();
  
    if (!SUPPORTED_MIME_TYPES.includes(normalized)) {
      throw new ValidationError(
        `Unsupported file type: ${mimeType}`
      );
    }
  }
  
  export function validateFileSize(
    sizeInBytes: number,
    maxFileSizeMB = DEFAULT_MAX_FILE_SIZE_MB
  ): void {
    const maxBytes = maxFileSizeMB * 1024 * 1024;
  
    if (sizeInBytes > maxBytes) {
      throw new ValidationError(
        `File exceeds maximum size of ${maxFileSizeMB} MB`
      );
    }
  }