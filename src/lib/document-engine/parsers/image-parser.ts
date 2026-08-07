/**
 * Previa Health
 * Document Engine
 * Image Parser (Foundation)
 */

import { OCREngine } from "../ocr";
import { DocumentEngineLogger } from "../logger";
import { DocumentParser } from "./parser";
import {
  ParsedDocument,
  DocumentMetadata,
  ParsedPage,
} from "../types";
import { isImage } from "../mime";

export class ImageParser implements DocumentParser {
  private readonly ocr = new OCREngine();

  supports(file: File): boolean {
    return isImage(file.type);
  }

  async parse(file: File): Promise<ParsedDocument> {
    const metadata: DocumentMetadata = {
      filename: file.name,
      mimeType: file.type,
      extension: file.name.split(".").pop()?.toLowerCase() ?? "",
      size: file.size,
      pageCount: 1,
      language: "unknown",
    };
    DocumentEngineLogger.info(
      `Starting OCR for image: ${file.name}`
    );
    
    const imageBuffer = Buffer.from(
      await file.arrayBuffer()
    );
    
    const ocrResult =
      await this.ocr.recognize(imageBuffer);
    
    DocumentEngineLogger.info(
      `OCR extracted ${ocrResult.text.length} characters`
    );

    const pages: ParsedPage[] = [
      {
        pageNumber: 1,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        ocrUsed: true,
      },
    ];
    return {
      metadata,
      pages,
      text: ocrResult.text,
      processingTime: 0,
      ocrUsed: true,
      warnings: [],
      errors: [],
    };
  }
}