/**
 * Previa Health
 * PDF Renderer
 *
 * Renders scanned PDF pages into PNG buffers for OCR.
 */

import type { RenderParameters } from "pdfjs-dist/types/src/display/api";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

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

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(_pdfBuffer),
    });
    
    const pdf = await loadingTask.promise;
    
    DocumentEngineLogger.info(`PDF loaded: ${pdf.numPages} pages`);

    const imageBuffers: Buffer[] = [];
    
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
  const page = await pdf.getPage(pageNumber);
    const scale = options.scale ?? 3;

const viewport = page.getViewport({ scale });
const { createCanvas } = await import("@napi-rs/canvas");

const canvas = createCanvas(
  Math.ceil(viewport.width),
  Math.ceil(viewport.height)
);

const context = canvas.getContext("2d");

const renderContext: RenderParameters = {
  canvas: null,
  canvasContext: context as unknown as CanvasRenderingContext2D,
  viewport,
};
await page.render(renderContext).promise;

const imageBuffer = canvas.toBuffer("image/png");

imageBuffers.push(imageBuffer);

DocumentEngineLogger.info(
  `Rendered page ${pageNumber}/${pdf.numPages}`
);
}

return imageBuffers;
  }
}