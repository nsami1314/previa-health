// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require("pdf-parse/lib/pdf-parse");

export async function extractTextFromPDF(
  pdfBuffer: Buffer
): Promise<string> {
  const data = await pdfParse(pdfBuffer);
  return data.text;
}