/**
 * Previa Health
 * Document Engine
 * Image Parser (Foundation)
 */

import { DocumentParser } from "./parser";
import {
  ParsedDocument,
  DocumentMetadata,
  ParsedPage,
} from "../types";
import { isImage } from "../mime";

export class ImageParser implements DocumentParser {
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

    const pages: ParsedPage[] = [
      {
        pageNumber: 1,
        text: "",
        confidence: 0,
        ocrUsed: false,
      },
    ];

    return {
      metadata,
      pages,
      text: "",
      processingTime: 0,
      ocrUsed: false,
      warnings: [
        "OCR has not been executed yet.",
      ],
      errors: [],
    };
  }
}