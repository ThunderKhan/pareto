import { createHash } from "node:crypto";
import { extname, basename } from "node:path";
import { TextDecoder } from "node:util";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";

export type ResumeKind = "PDF" | "DOCX" | "TXT";
export type ResumePage = { number: number | null; text: string };
export type ParsedResume = {
  text: string; pages: ResumePage[]; warnings: string[]; truncated: boolean;
};
export type CheckedResume = {
  bytes: Buffer; kind: ResumeKind; mimeType: string; fileName: string; sha256: string;
};
export class ResumeInputError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export const MAX_RESUME_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_BODY_BYTES = MAX_RESUME_BYTES + 100 * 1024;
const MAX_DOCX_BYTES = 2 * 1024 * 1024;
const MAX_TXT_BYTES = 512 * 1024;
const MAX_TEXT_CHARS = 24000;
const MAX_PDF_PAGES = 24;
const MAX_ZIP_EXPANDED_BYTES = 10 * 1024 * 1024;
const decoder = new TextDecoder("utf-8", { fatal: true });

function saneFileName(input: string): string {
  const leaf = basename(input.replaceAll("\\", "/")).normalize("NFKC").trim();
  if (!leaf || leaf.length > 160 || /[\u0000-\u001F]/u.test(leaf)) {
    throw new ResumeInputError(422, "INVALID_NAME", "Provide a valid filename up to 160 characters.");
  }
  return leaf.replace(/[^\p{L}\p{N} ._()\-]/gu, "_");
}

function validZip(bytes: Buffer) {
  // Central-directory inspection protects mammoth from small, highly expanded
  // DOCX archives. Zip64, encryption, nested paths and excessive entries fail closed.
  const tail = Math.max(0, bytes.length - 65557);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= tail; i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new ResumeInputError(422, "INVALID_DOCX", "DOCX archive is damaged.");
  const entries = bytes.readUInt16LE(eocd + 10);
  const cdSize = bytes.readUInt32LE(eocd + 12);
  const start = bytes.readUInt32LE(eocd + 16);
  if (entries === 0 || entries > 300 || cdSize > bytes.length || start + cdSize > eocd) {
    throw new ResumeInputError(422, "INVALID_DOCX", "DOCX archive exceeds safe limits.");
  }
  let pos = start, uncompressed = 0, hasDocument = false;
  for (let i = 0; i < entries; i++) {
    if (pos + 46 > eocd || bytes.readUInt32LE(pos) !== 0x02014b50) {
      throw new ResumeInputError(422, "INVALID_DOCX", "DOCX directory is damaged.");
    }
    const flags = bytes.readUInt16LE(pos + 8);
    const method = bytes.readUInt16LE(pos + 10);
    const compressed = bytes.readUInt32LE(pos + 20);
    const size = bytes.readUInt32LE(pos + 24);
    const nameSize = bytes.readUInt16LE(pos + 28);
    const extra = bytes.readUInt16LE(pos + 30), comment = bytes.readUInt16LE(pos + 32);
    const end = pos + 46 + nameSize + extra + comment;
    if (end > eocd || (flags & 1) || ![0, 8].includes(method) ||
        size === 0xFFFFFFFF || compressed === 0xFFFFFFFF ||
        size > MAX_ZIP_EXPANDED_BYTES || (compressed > 0 && size / compressed > 150)) {
      throw new ResumeInputError(422, "INVALID_DOCX", "DOCX contains unsupported or unsafe content.");
    }
    const name = bytes.subarray(pos + 46, pos + 46 + nameSize).toString("utf8");
    if (name.startsWith("/") || name.includes("..") || name.includes("\\") || name.includes("\u0000")) {
      throw new ResumeInputError(422, "INVALID_DOCX", "DOCX contains an unsafe archive entry.");
    }
    if (name === "word/document.xml") hasDocument = true;
    uncompressed += size;
    if (uncompressed > MAX_ZIP_EXPANDED_BYTES) {
      throw new ResumeInputError(422, "INVALID_DOCX", "DOCX content expands beyond the allowed limit.");
    }
    pos = end;
  }
  if (!hasDocument || pos !== start + cdSize) {
    throw new ResumeInputError(422, "INVALID_DOCX", "This is not a supported DOCX document.");
  }
}

export function validateResume(fileName: string, declaredType: string, bytes: Buffer): CheckedResume {
  const name = saneFileName(fileName);
  const extension = extname(name).toLowerCase();
  const table: Record<string, { kind: ResumeKind; mimeType: string; max: number }> = {
    ".pdf": { kind: "PDF", mimeType: "application/pdf", max: MAX_RESUME_BYTES },
    ".docx": { kind: "DOCX", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", max: MAX_DOCX_BYTES },
    ".txt": { kind: "TXT", mimeType: "text/plain", max: MAX_TXT_BYTES },
  };
  const type = table[extension];
  if (!type) throw new ResumeInputError(415, "UNSUPPORTED_TYPE", "Only PDF, DOCX and TXT files are supported.");
  if (!bytes.length || bytes.length > type.max) {
    throw new ResumeInputError(413, "FILE_SIZE", "The document exceeds its permitted file-size limit or is empty.");
  }
  const allowedMime: Record<string, string[]> = {
    PDF: ["application/pdf", "application/octet-stream"],
    DOCX: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip", "application/octet-stream"],
    TXT: ["text/plain", "application/octet-stream"],
  };
  if (declaredType && !allowedMime[type.kind].includes(declaredType.toLowerCase())) {
    throw new ResumeInputError(415, "MIME_MISMATCH", "The file MIME type does not match its extension.");
  }
  if (type.kind === "PDF" && !bytes.subarray(0, 1024).includes(Buffer.from("%PDF-"))) {
    throw new ResumeInputError(422, "INVALID_PDF", "The uploaded file is not a valid PDF.");
  }
  if (type.kind === "DOCX") validZip(bytes);
  if (type.kind === "TXT") {
    try {
      const value = decoder.decode(bytes);
      if (/\u0000|[\u0001-\u0008\u000B\u000C\u000E-\u001F]/u.test(value)) throw Error("binary content");
    } catch {
      throw new ResumeInputError(422, "INVALID_TEXT", "TXT must contain valid UTF-8 plain text.");
    }
  }
  return { bytes, kind: type.kind, mimeType: type.mimeType, fileName: name,
    sha256: createHash("sha256").update(bytes).digest("hex") };
}

function trimText(pages: ResumePage[], warnings: string[]): ParsedResume {
  // Normalization is predictable so every provenance excerpt can be traced back.
  const cleaned = pages.map(page => ({
    number: page.number,
    text: page.text.replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").trim(),
  }));
  let used = 0, truncated = false;
  const bounded = cleaned.map(page => {
    const take = Math.max(0, MAX_TEXT_CHARS - used);
    if (page.text.length > take) truncated = true;
    const text = page.text.slice(0, take);
    used += text.length;
    return { number: page.number, text };
  }).filter(p => p.text.length);
  const text = bounded.map(page => page.text).join("\n");
  if (truncated) warnings.push("Only the first 24,000 text characters were extracted; review the truncated resume.");
  if (text.trim().length < 15) {
    throw new ResumeInputError(422, "NO_READABLE_TEXT", "This document has no usable text. Scanned PDFs require OCR.");
  }
  return { text, pages: bounded, warnings, truncated };
}

export async function parseResume(file: CheckedResume): Promise<ParsedResume> {
  const warnings: string[] = [];
  if (file.kind === "TXT") return trimText([{ number: null, text: decoder.decode(file.bytes) }], warnings);
  if (file.kind === "DOCX") {
    try {
      const result = await mammoth.extractRawText({ buffer: file.bytes });
      if (result.messages.length) warnings.push("Some DOCX elements may not have been extracted.");
      return trimText([{ number: null, text: result.value }], warnings);
    } catch {
      throw new ResumeInputError(422, "INVALID_DOCX", "The DOCX could not be parsed.");
    }
  }
  let task: ReturnType<typeof getDocument> | undefined;
  try {
    task = getDocument({ data: new Uint8Array(file.bytes), isEvalSupported: false,
      useSystemFonts: true, stopAtErrors: true });
    const pdf = await task.promise;
    if (pdf.numPages > MAX_PDF_PAGES) warnings.push("Only the first 24 PDF pages were analyzed.");
    const pages: ResumePage[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, MAX_PDF_PAGES); i++) {
      const page = await pdf.getPage(i);
      const items = await page.getTextContent();
      pages.push({ number: i,
        text: items.items.map(item => "str" in item ? item.str : "").join(" ") });
      page.cleanup();
    }
    return trimText(pages, warnings);
  } catch (error) {
    if (error instanceof ResumeInputError) throw error;
    throw new ResumeInputError(422, "INVALID_PDF", "The PDF could not be parsed. Encrypted or damaged documents are unsupported.");
  } finally { await task?.destroy(); }
}
