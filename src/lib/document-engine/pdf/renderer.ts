/**
 * Previa Health
 * PDF Renderer
 *
 * Temporary implementation.
 */

import { DocumentEngineLogger } from "../logger";

export interface PdfRenderOptions {
  scale?: number;
}

export class PdfRenderer {
  async render(
    _pdfBuffer: Buffer,
    options: PdfRenderOptions = {}
  ): Promise<Buffer[]> {
    DocumentEngineLogger.info(
      `Rendering PDF pages (scale=${options.scale ?? 3})`
    );

    throw new Error(
      "PdfRenderer is being migrated away from pdf-to-img."
    );
  }
}