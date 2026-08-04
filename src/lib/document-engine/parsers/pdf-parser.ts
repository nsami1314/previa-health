/**
 * Previa Health
 * Document Engine
 * Digital PDF Parser
 */

import { getDocument } from "pdfjs-dist";

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
  ocrUsed: false,
  warnings: [],
  errors: [],
};
} finally {
  await loadingTask.destroy();
}
}
}