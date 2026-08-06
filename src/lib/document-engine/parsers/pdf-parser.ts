/**
 * Previa Health
 * Document Engine
 * Digital PDF Parser
 */

import { PdfRenderer } from "../pdf";
import { OCREngine } from "../ocr";
import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist/legacy/build/pdf.mjs";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.mjs",
  import.meta.url
).toString();

import { DocumentParser } from "./parser";
import { DocumentEngineLogger } from "../logger";

import {
  DocumentMetadata,
  ParsedDocument,
  ParsedPage,
} from "../types";

import { isPdf } from "../mime";
function extractTextItems(items: unknown[]): string {
  return items
    .map((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "str" in item
      ) {
        return String(
          (item as { str: unknown }).str
        );
      }

      return "";
    })
    .join(" ");
}

export class PdfParser implements DocumentParser {
  private readonly renderer = new PdfRenderer();

private readonly ocr = new OCREngine();

  supports(file: File): boolean {
    return isPdf(file.type);
  }

  async parse(file: File): Promise<ParsedDocument> {
    DocumentEngineLogger.info(
      `Parsing digital PDF: ${file.name}`
    );

    const arrayBuffer = await file.arrayBuffer();

const loadingTask = getDocument({
  data: arrayBuffer,
});

const pdfDocument = await loadingTask.promise;

try {
DocumentEngineLogger.info(
  `PDF loaded successfully (${pdfDocument.numPages} page(s))`
);

const pages: ParsedPage[] = [];

let combinedText = "";

for (
  let pageNumber = 1;
  pageNumber <= pdfDocument.numPages;
  pageNumber++
) {
  const page = await pdfDocument.getPage(pageNumber);

  const textContent = await page.getTextContent();

  const pageText = extractTextItems(
    textContent.items
  ).trim();

  pages.push({
    pageNumber,
    text: pageText,
    confidence: 100,
    ocrUsed: false,
  });

  combinedText += pageText + "\n\n";

  DocumentEngineLogger.info(
    `Page ${pageNumber}: ${pageText.length} characters`
  );
}

DocumentEngineLogger.info(
  `Total extracted characters: ${combinedText.length}`
);

const minimumCharacters = 100;

const shouldUseOCR =
  combinedText.trim().length < minimumCharacters;

  DocumentEngineLogger.info(
    `OCR required: ${shouldUseOCR}`
  );
  
  if (shouldUseOCR) {
    DocumentEngineLogger.info(
      "No selectable text found. Starting OCR fallback..."
    );
  
    const pdfBuffer = Buffer.from(arrayBuffer);
  
    const renderedPages =
      await this.renderer.render(pdfBuffer);
  
    DocumentEngineLogger.info(
      `Rendered ${renderedPages.length} page(s) for OCR`
    );
  
    const firstPage = renderedPages[0];

    const ocrResult =
      await this.ocr.recognize(firstPage);
    
    DocumentEngineLogger.info(
      `OCR extracted ${ocrResult.text.length} characters`
    );
  }

  console.log(
    "[DocumentEngine] OCR required:",
    shouldUseOCR
  );

const metadata: DocumentMetadata = {
  filename: file.name,
  mimeType: file.type,
  extension: "pdf",
  size: file.size,
  pageCount: pdfDocument.numPages,
  language: "unknown",
};

return {
  metadata,
  pages,
  text: combinedText.trim(),
  processingTime: 0,
  ocrUsed: shouldUseOCR,
  warnings: [],
  errors: [],
};
} finally {
  await loadingTask.destroy();
}
}
}