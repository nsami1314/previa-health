/**
 * Previa Health
 * Document Engine
 * Base parser interface
 */

import { ParsedDocument } from "../types";

export interface DocumentParser {
  /**
   * Returns true if this parser supports the supplied file.
   */
  supports(file: File): boolean;

  /**
   * Parses the supplied file into a standardized ParsedDocument.
   */
  parse(file: File): Promise<ParsedDocument>;
}