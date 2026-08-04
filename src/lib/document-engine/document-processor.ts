/**
 * Previa Health
 * Document Engine
 * Document Processor
 */

import { validateFile } from "./validation";
import { getFileInfo, FileInfo } from "./file-info";
import { DocumentEngineLogger } from "./logger";

export class DocumentProcessor {
  process(file: File): FileInfo {
    DocumentEngineLogger.info(`Processing file: ${file.name}`);

    validateFile(file);

    const fileInfo = getFileInfo(file);

    DocumentEngineLogger.info(
      `Detected ${fileInfo.documentType.toUpperCase()} document`
    );

    return fileInfo;
  }
}