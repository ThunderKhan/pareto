import { afterAll, describe, expect, it } from "vitest";
import { database } from "../search/db";
import { uploadResume, resumeImport, resumeImports, resumeDownload, retryResume } from "./service";
import type { ResumeStorage } from "./storage";
import type { JsonProvider } from "../search/interpret";

const url = process.env.PARETO_TEST_DATABASE_URL;
const owner = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
if (url) process.env.DATABASE_URL = url;

function storage(): ResumeStorage {
  const objects = new Map<string, Buffer>();
  return {
    async upload(key, file) { if (objects.has(key)) throw Error("exists"); objects.set(key, Buffer.from(file.bytes)); },
    async read(key) { const bytes = objects.get(key); if (!bytes) throw Error("missing"); return bytes; },
    async signedUrl(key) { if (!objects.has(key)) throw Error("missing"); return "https://private.invalid/" + encodeURIComponent(key); },
    async remove(key) { objects.delete(key); },
  };
}
const resumeText = "Asha Example\nSenior Java Developer\nHyderabad\n6 years experience\nJava, AWS\nNotice period: 30 days\n";
const provider: JsonProvider = async () => ({ provider: "Gemini", raw: {
  displayName: "Asha Example", roleTitle: "Senior Java Developer", city: "Hyderabad",
  experienceMonths: 72, noticePeriodDays: 30, industry: null, education: null,
  employmentType: null, skills: ["Java", "AWS"], pastRoles: [], certifications: [],
  evidence: [
    { field: "displayName", quote: "Asha Example" },
    { field: "roleTitle", quote: "Senior Java Developer" },
    { field: "city", quote: "Hyderabad" },
    { field: "experienceMonths", quote: "6 years experience" },
    { field: "noticePeriodDays", quote: "30 days" },
    { field: "skill:Java", quote: "Java, AWS" },
    { field: "skill:AWS", quote: "Java, AWS" },
  ],
  warnings: [],
} });

describe.skipIf(!url)("private resume ingestion in PostgreSQL", () => {
  const created: string[] = [];
  const db = database();
  afterAll(async () => {
    if (created.length) {
      await db.candidate.deleteMany({ where: { sourceDocumentId: { in: created } } });
      await db.resumeDocument.deleteMany({ where: { id: { in: created } } });
    }
    await db.$disconnect();
  });

  it("stores a private TXT, verified candidate, normalized skills and original evidence", async () => {
    const vault = storage();
    const result = await uploadResume(owner, "candidate.txt", "text/plain",
      Buffer.from(resumeText + "A1"), vault, [provider]);
    created.push(result.document.id);
    expect(result).toMatchObject({
      duplicate: false, document: { status: "READY", attempts: 1,
        candidate: { displayName: "Asha Example", roleTitle: "Senior Java Developer" } },
    });
    const doc = await resumeImport(owner, result.document.id);
    expect(doc.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ fieldKey: "skill:java", quote: "Java, AWS", pageNumber: null }),
      expect.objectContaining({ fieldKey: "noticePeriodDays", quote: "30 days" }),
    ]));
    expect(doc).not.toHaveProperty("extractedText");
    expect(doc).not.toHaveProperty("storageKey");
    const profile = await db.candidate.findFirst({ where: { sourceDocumentId: doc.id },
      include: { skills: { include: { skill: true } } } });
    expect(profile).toMatchObject({ ownerId: owner, experienceMonths: 72,
      noticePeriodDays: 30, skillsKnown: true });
    expect(profile?.skills.map(skill => skill.skillId).sort()).toEqual(["aws", "java"]);
    expect((await resumeImports(owner)).some(item => item.id === doc.id)).toBe(true);
    expect(await resumeDownload(owner, doc.id, vault)).toMatchObject({ expiresInSeconds: 60 });
    await expect(resumeImport(other, doc.id)).rejects.toMatchObject({ status: 404 });
    await expect(resumeDownload(other, doc.id, vault)).rejects.toMatchObject({ status: 404 });
    await expect(retryResume(other, doc.id, vault, [provider])).rejects.toMatchObject({ status: 404 });
    expect((await uploadResume(owner, "renamed.txt", "text/plain",
      Buffer.from(resumeText + "A1"), vault, [provider])).duplicate).toBe(true);
    expect(await db.resumeDocument.count({ where: { ownerId: owner, sha256: result.document.sha256 } })).toBe(1);
  });

  it("preserves needs-review document and can retry without another upload or duplicate candidate", async () => {
    const vault = storage();
    const initial = await uploadResume(owner, "review.txt", "text/plain",
      Buffer.from(resumeText + "A2"), vault, []);
    created.push(initial.document.id);
    expect(initial.document).toMatchObject({ status: "NEEDS_REVIEW",
      candidate: null, errorCode: "PROFILE_UNVERIFIED" });
    const later = await retryResume(owner, initial.document.id, vault, [provider]);
    expect(later).toMatchObject({ status: "READY", attempts: 2,
      candidate: { displayName: "Asha Example" } });
    expect(await db.candidate.count({ where: { sourceDocumentId: initial.document.id } })).toBe(1);
    await expect(retryResume(owner, initial.document.id, vault, [provider]))
      .rejects.toMatchObject({ status: 409 });
  });

  it("isolates identical resume hashes between different recruiters", async () => {
    const a = storage(), b = storage();
    const bytes = Buffer.from(resumeText + "A3");
    const first = await uploadResume(owner, "first.txt", "text/plain", bytes, a, [provider]);
    const second = await uploadResume(other, "second.txt", "text/plain", bytes, b, [provider]);
    created.push(first.document.id, second.document.id);
    expect(first.document.id).not.toBe(second.document.id);
    expect(first.document.sha256).toBe(second.document.sha256);
    expect(first.document.candidate?.id).not.toBe(second.document.candidate?.id);
    expect((await resumeImports(other)).some(entry => entry.id === first.document.id)).toBe(false);
    await expect(resumeImport(owner, second.document.id)).rejects.toMatchObject({ status: 404 });
  });

  it("does not create a searchable candidate from unverified AI output", async () => {
    const vault = storage();
    const invalid: JsonProvider = async () => ({ provider: "Groq", raw: {
      ...((await provider("", "")).raw as Record<string, unknown>),
      displayName: "Invented Name",
    } });
    const result = await uploadResume(owner, "unverified.txt", "text/plain",
      Buffer.from(resumeText + "A4"), vault, [invalid]);
    created.push(result.document.id);
    expect(result.document).toMatchObject({ status: "NEEDS_REVIEW", candidate: null });
    expect(await db.candidate.count({ where: { sourceDocumentId: result.document.id } })).toBe(0);
  });
});
