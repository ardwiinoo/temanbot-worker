import pdfParse from "pdf-parse/lib/pdf-parse";

export type ExtractedCvText = {
  text: string;
  cleanText: string;
  charCount: number;
  pageCount?: number;
};

const MIN_TEXT_LENGTH = 200;
const MAX_AI_TEXT_CHARS = 30_000;

export async function extractTextFromPdfBuffer(
  buffer: Buffer,
): Promise<ExtractedCvText> {
  if (!buffer || buffer.length === 0) {
    throw new Error("PDF file is empty");
  }

  const parsed = await pdfParse(buffer);

  const text = parsed.text ?? "";
  const cleanText = cleanCvText(text);

  if (cleanText.length < MIN_TEXT_LENGTH) {
    throw new Error(
      "CV text is too short. This PDF might be scanned/image-based. Please upload a text-selectable PDF.",
    );
  }

  return {
    text,
    cleanText,
    charCount: cleanText.length,
    pageCount: parsed.numpages,
  };
}

export function cleanCvText(text: string) {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function getCvTextForAi(text: string, maxChars = MAX_AI_TEXT_CHARS) {
  const cleanText = cleanCvText(text);

  if (cleanText.length <= maxChars) {
    return cleanText;
  }

  return cleanText.slice(0, maxChars);
}