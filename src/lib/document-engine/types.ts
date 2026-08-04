/**
 * Previa Health
 * Document Engine
 * Core shared types
 */

export enum DocumentType {
    PDF = "pdf",
    JPG = "jpg",
    JPEG = "jpeg",
    PNG = "png",
    WEBP = "webp",
    HEIC = "heic",
  }
  
  export enum ProcessingStage {
    VALIDATION = "validation",
    MIME_DETECTION = "mime_detection",
    PREPROCESSING = "preprocessing",
    OCR = "ocr",
    TEXT_EXTRACTION = "text_extraction",
    AI_EXTRACTION = "ai_extraction",
    COMPLETE = "complete",
    FAILED = "failed",
  }
  
  export enum OCRProvider {
    NONE = "none",
    TESSERACT = "tesseract",
  }
  
  export type SupportedDocumentType = DocumentType;
  
  export interface DocumentMetadata {
    filename: string;
    mimeType: string;
    extension: string;
    size: number;
    pageCount: number;
    language?: string;
    createdAt?: Date;
    lastModified?: Date;
  }
  
  export interface ParsedPage {
    pageNumber: number;
    text: string;
    confidence?: number;
    width?: number;
    height?: number;
    ocrUsed: boolean;
  }
  
  export interface ParsedDocument {
    metadata: DocumentMetadata;
    pages: ParsedPage[];
    text: string;
    processingTime: number;
    ocrUsed: boolean;
    warnings: string[];
    errors: string[];
  }
  
  export interface OCRResult {
    text: string;
    confidence: number;
    language: string;
  }
  
  export interface ExtractionResult {
    success: boolean;
    text: string;
    metadata: DocumentMetadata;
    pages: ParsedPage[];
    warnings: string[];
    errors: string[];
  }
  
  export interface ProcessingResult {
    success: boolean;
    stage: ProcessingStage;
    document?: ParsedDocument;
    processingTime: number;
    warnings: string[];
    errors: string[];
  }
  
  export interface DocumentEngineOptions {
    language?: string;
    enableOCR?: boolean;
    preserveImages?: boolean;
    maxFileSizeMB?: number;
    maxPages?: number;
  }