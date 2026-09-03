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
  const textItems = items
    .filter(
      (item): item is {
        str: string;
        transform: number[];
      } =>
        typeof item === "object" &&
        item !== null &&
        "str" in item &&
        "transform" in item &&
        typeof (item as { str: unknown }).str === "string" &&
        Array.isArray((item as { transform: unknown }).transform)
    )
    .map((item) => ({
      text: item.str.trim(),
      x: item.transform[4] ?? 0,
      y: item.transform[5] ?? 0,
    }))
    .filter((item) => item.text.length > 0);

  const rows: {
    y: number;
    items: { text: string; x: number }[];
  }[] = [];

  for (const item of textItems) {
    let row = rows.find(
      (existingRow) => Math.abs(existingRow.y - item.y) < 3
    );

    if (!row) {
      row = {
        y: item.y,
        items: [],
      };

      rows.push(row);
    }

    row.items.push({
      text: item.text,
      x: item.x,
    });
  }

  rows.sort((a, b) => b.y - a.y);

  return rows
    .map((row) =>
      row.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
    )
    .join("\n");
}

export class PdfParser implements DocumentParser {
  private readonly renderer = new PdfRenderer();

  private readonly ocr = new OCREngine();

  private renderedPages: Buffer[] = [];

  getRenderedPages(): Buffer[] {
    return this.renderedPages;
  }

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
  
    const pdfBuffer = Buffer.from(
      await file.arrayBuffer()
    );
  
    this.renderedPages =
      await this.renderer.render(pdfBuffer);
  
    DocumentEngineLogger.info(
      `Rendered ${this.renderedPages.length} page(s) for OCR`
    );
  
    let ocrText = "";

    for (const page of this.renderedPages) {
  const ocrResult =
    await this.ocr.recognize(page);

  ocrText += ocrResult.text + "\n\n";

  DocumentEngineLogger.info(
    `OCR extracted ${ocrResult.text.length} characters`
  );
}
combinedText = ocrText.trim();

pages.length = 0;

pages.push({
  pageNumber: 1,
  text: combinedText,
  confidence: 75,
  ocrUsed: true,
});

    
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