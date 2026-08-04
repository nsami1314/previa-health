/**
 * Previa Health
 * PDF Renderer
 *
 * Converts a PDF into PNG image buffers using pdf-to-img.
 */

import { pdf } from "pdf-to-img";

import { DocumentEngineLogger } from "../logger";

export interface PdfRenderOptions {
  scale?: number;
}

export class PdfRenderer {
  async render(
    pdfBuffer: Buffer,
    options: PdfRenderOptions = {}
  ): Promise<Buffer[]> {
    const scale = options.scale ?? 3;

    DocumentEngineLogger.info(
      `Rendering PDF pages (scale=${scale})`
    );

    // pdf-to-img accepts a data URL
    const dataUrl = `data:application/pdf;base64,${pdfBuffer.toString(
      "base64"
    )}`;

    const document = await pdf(dataUrl, {
      scale,
    });

    const pages: Buffer[] = [];

    try {
      for await (const image of document) {
        pages.push(Buffer.from(image));
      }

      DocumentEngineLogger.info(
        `Rendered ${pages.length} page(s)`
      );

      return pages;
    } catch (error) {
      DocumentEngineLogger.error(
        "Failed to render PDF pages",
        error
      );

      throw error;
    } finally {
      document.destroy();
    }
  }
}