/**
 * Previa Health
 * Document Engine
 * Main orchestration service
 */

import { DocumentProcessor } from "./document-processor";
import { PdfParser } from "./parsers";
import { ImageParser } from "./parsers";
import { ParsedDocument } from "./types";
import { DocumentEngineLogger } from "./logger";

export class DocumentEngine {
  private readonly processor = new DocumentProcessor();

  private readonly pdfParser = new PdfParser();

  private readonly imageParser = new ImageParser();

  async process(file: File): Promise<ParsedDocument> {
    DocumentEngineLogger.info(
      `Starting document processing: ${file.name}`
    );

    const fileInfo = this.processor.process(file);

    if (fileInfo.isPdf) {
      return this.pdfParser.parse(file);
    }

    if (fileInfo.isImage) {
      return this.imageParser.parse(file);
    }

    throw new Error("Unsupported document type.");
  }
  getRenderedPages(): Buffer[] {
    return this.pdfParser.getRenderedPages();
  }
}