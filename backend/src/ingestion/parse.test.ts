import { describe, expect, it } from "vitest";
import { deflateRawSync } from "node:zlib";
import { parseResume, validateResume, ResumeInputError } from "./parse";

const text = "Asha Nair\nSenior Java Developer\nJava AWS Hyderabad\nNotice period: 30 days\nSix years experience";

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function docxFixture() {
  const docs: [string, string][] = [
    ["[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'],
    ["_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
    ["word/document.xml", '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>' + text + '</w:t></w:r></w:p></w:body></w:document>'],
  ];
  const local: Buffer[] = [], central: Buffer[] = [];
  let offset = 0;
  for (const [path, xml] of docs) {
    const name = Buffer.from(path), raw = Buffer.from(xml);
    const zipped = deflateRawSync(raw), crc = crc32(raw);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50); head.writeUInt16LE(20, 4);
    head.writeUInt16LE(8, 8); head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(zipped.length, 18); head.writeUInt32LE(raw.length, 22);
    head.writeUInt16LE(name.length, 26);
    local.push(head, name, zipped);
    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50); dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6); dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(zipped.length, 20);
    dir.writeUInt32LE(raw.length, 24); dir.writeUInt16LE(name.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, name);
    offset += head.length + name.length + zipped.length;
  }
  const centralBytes = Buffer.concat(central);
  const footer = Buffer.alloc(22);
  footer.writeUInt32LE(0x06054b50);
  footer.writeUInt16LE(docs.length, 8); footer.writeUInt16LE(docs.length, 10);
  footer.writeUInt32LE(centralBytes.length, 12); footer.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralBytes, footer]);
}
function pdfFixture() {
  const content = "BT /F1 12 Tf 72 700 Td (Asha Nair Senior Java Developer Hyderabad Java AWS 30 days notice) Tj ET";
  const obj = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    "<< /Length " + Buffer.byteLength(content) + " >>\nstream\n" + content + "\nendstream",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n", offsets = [0];
  for (let i = 0; i < obj.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += (i + 1) + " 0 obj\n" + obj[i] + "\nendobj\n";
  }
  const xref = Buffer.byteLength(pdf);
  pdf += "xref\n0 " + (obj.length + 1) + "\n0000000000 65535 f \n";
  pdf += offsets.slice(1).map(x => String(x).padStart(10, "0") + " 00000 n \n").join("");
  pdf += "trailer\n<< /Root 1 0 R /Size " + (obj.length + 1) +
    " >>\nstartxref\n" + xref + "\n%%EOF\n";
  return Buffer.from(pdf, "latin1");
}
describe("bounded resume parser and upload validation", () => {
  it("accepts UTF-8 TXT without invoking a model", async () => {
    const file = validateResume("folder\\person.txt", "text/plain", Buffer.from(text));
    expect(file).toMatchObject({ kind: "TXT", fileName: "person.txt" });
    const parsed = await parseResume(file);
    expect(parsed.text).toContain("Senior Java Developer");
    expect(parsed.pages).toMatchObject([{ number: null }]);
    expect(parsed.truncated).toBe(false);
    expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
  });
  it("extracts text from a real one-page PDF and records page provenance", async () => {
    const checked = validateResume("cv.pdf", "application/pdf", pdfFixture());
    const parsed = await parseResume(checked);
    expect(parsed.text).toContain("Asha Nair");
    expect(parsed.pages[0].number).toBe(1);
    expect(parsed.pages[0].text).toContain("Java");
  });
  it("extracts the main DOCX body and blocks unsupported zip archives", async () => {
    const checked = validateResume("cv.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", docxFixture());
    const parsed = await parseResume(checked);
    expect(parsed.text).toContain("Asha Nair");
    expect(parsed.text).toContain("Senior Java Developer");
    expect(() => validateResume("fake.docx", "application/octet-stream", Buffer.from("PK"))).toThrow(ResumeInputError);
  });
  it("rejects type confusion, binary TXT, empty content and large requests", () => {
    expect(() => validateResume("shell.exe", "application/octet-stream", Buffer.from("abc"))).toThrow();
    expect(() => validateResume("resume.pdf", "application/pdf", Buffer.from("Not a PDF"))).toThrow();
    expect(() => validateResume("resume.txt", "application/pdf", Buffer.from(text))).toThrow();
    expect(() => validateResume("resume.txt", "text/plain", Buffer.from([0xff, 0xff]))).toThrow();
    expect(() => validateResume("resume.txt", "text/plain", Buffer.alloc(520_000, 65))).toThrow();
    expect(() => validateResume("resume.txt", "text/plain", Buffer.alloc(0))).toThrow();
  });
  it("rejects unreadable scanned-image-only content", async () => {
    const file = validateResume("blank.txt", "text/plain", Buffer.from("Hello"));
    await expect(parseResume(file)).rejects.toMatchObject({ code: "NO_READABLE_TEXT" });
  });
});
