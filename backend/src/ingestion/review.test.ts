import { describe, it, expect, afterAll } from "vitest";
import { database } from "../search/db";
import { queueResumeUpload, resumeImport } from "./service";
import { claimJob } from "./queue";
import { processClaim } from "./processor";
import { resumeReviewProfile, reviewResumeProfile, resumeAuditHistory } from "./review";
import { ingestionMetrics } from "./metrics";
import type { ResumeStorage } from "./storage";
import type { JsonProvider } from "../search/interpret";

const url = process.env.PARETO_TEST_DATABASE_URL;
if (url) process.env.DATABASE_URL = url;
const owner = "11111111-1111-4111-8111-111111111111";
const stranger = "22222222-2222-4222-8222-222222222222";
const resumeText = "Asha Nair\nSenior Java Developer\nHyderabad\nJava, AWS\n6 years experience\nNotice period 30 days\n";
const provider: JsonProvider = async () => ({
  provider: "Gemini", raw: {
    displayName: "Asha Nair", roleTitle: "Senior Java Developer", city: "Hyderabad",
    experienceMonths: 72, noticePeriodDays: 30,
    industry: null, education: null, employmentType: null,
    skills: ["Java","AWS"], pastRoles: [], certifications: [],
    warnings: [], evidence: [
      {field:"displayName",quote:"Asha Nair"},
      {field:"roleTitle",quote:"Senior Java Developer"},
      {field:"city",quote:"Hyderabad"},
      {field:"experienceMonths",quote:"6 years experience"},
      {field:"noticePeriodDays",quote:"30 days"},
      {field:"skill:Java",quote:"Java, AWS"},
      {field:"skill:AWS",quote:"Java, AWS"},
    ],
  },
});
function privateVault(): ResumeStorage {
  const objects = new Map<string, Buffer>();
  return {
    async upload(key, file) { objects.set(key, Buffer.from(file.bytes)); },
    async read(key) { const file = objects.get(key); if (!file) throw Error("no file"); return file; },
    async signedUrl() { return "https://private.invalid/signed"; },
    async remove(key) { objects.delete(key); },
  };
}
const completeProfile = {
  displayName: "Asha Nair", roleTitle: "Senior Java Developer", city: "Hyderabad",
  experienceMonths: 72, noticePeriodDays: 30,
  industry: null, education: null, employmentType: null,
  skills: ["Java","AWS"], pastRoles: [], certifications: [],
};
describe.skipIf(!url)("review, extraction audit and processing metrics in PostgreSQL", () => {
  const db = url ? database() : (undefined as never);
  const created: string[] = [];
  afterAll(async () => {
    if (created.length) {
      await db.candidate.deleteMany({ where: { sourceDocumentId: { in: created } } });
      await db.resumeDocument.deleteMany({ where: { id: { in: created } } });
    }
    await db.$disconnect();
  });
  async function upload(unique: string, ownerId = owner, storage = privateVault()) {
    const {document} = await queueResumeUpload(ownerId, "quality-"+unique+".txt",
      "text/plain", Buffer.from(resumeText + "\nFixture " + unique), storage);
    created.push(document.id);
    return { id: document.id, storage };
  }
  async function complete(unique: string, user = owner) {
    const entry = await upload(unique, user);
    const job = await claimJob("review-"+unique, {global:5,perOwner:4});
    expect(job?.documentId).toBe(entry.id);
    expect(await processClaim(job!, {storage:entry.storage,providers:[provider]})).toBe("READY");
    return entry;
  }
  it("collects measured attempt timing and immutable original extraction audit", async () => {
    const {id} = await complete("a");
    const history = await db.ingestionAttempt.findFirst({
      where: { job: { documentId:id } },
    });
    expect(history).toMatchObject({ provider:"Gemini",
      extractorVersion:"resume-extract.v1", evidenceCount:7,
      sourceChars: expect.any(Number), parseMs: expect.any(Number),
      modelMs:expect.any(Number),persistMs:expect.any(Number),durationMs:expect.any(Number) });
    expect(history!.durationMs).toBeGreaterThanOrEqual(0);
    const events = await resumeAuditHistory(owner,id);
    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      action:"MODEL_EXTRACTED", reviewVersion:0, provider:"Gemini",
      after: expect.objectContaining({ displayName:"Asha Nair" }),
    });
    await expect(resumeAuditHistory(stranger,id)).rejects.toMatchObject({status:404});
    await expect(resumeReviewProfile(stranger,id)).rejects.toMatchObject({status:404});
  });
  it("rejects review during active processing, rejects foreign actors, and stale versions", async () => {
    const entry = await upload("b");
    await expect(reviewResumeProfile(owner,entry.id,{
      action:"approve",expectedVersion:0,confirmedAgainstSource:true,
    })).rejects.toMatchObject({status:409});
    const claim = await claimJob("review-b", {global:5,perOwner:4});
    expect(claim?.documentId).toBe(entry.id);
    await processClaim(claim!,{storage:entry.storage,providers:[provider]});
    await expect(reviewResumeProfile(stranger,entry.id,{
      action:"approve",expectedVersion:0,confirmedAgainstSource:true,
    })).rejects.toMatchObject({status:404});
    await expect(reviewResumeProfile(owner,entry.id,{
      action:"approve",expectedVersion:1,confirmedAgainstSource:true,
    })).rejects.toMatchObject({status:409});
    const approved = await reviewResumeProfile(owner,entry.id,{
      action:"approve",expectedVersion:0,confirmedAgainstSource:true,
    });
    expect(approved).toMatchObject({reviewState:"HUMAN_VERIFIED",reviewVersion:1,documentStatus:"READY"});
    await expect(reviewResumeProfile(owner,entry.id,{
      action:"approve",expectedVersion:0,confirmedAgainstSource:true,
    })).rejects.toMatchObject({status:409});
    expect((await resumeAuditHistory(owner,entry.id)).events[0].action).toBe("HUMAN_APPROVED");
  });
  it("human corrections atomically update normalized candidate and delete stale model evidence", async () => {
    const entry = await complete("c");
    const corrected = {
      ...completeProfile, roleTitle:"Lead Platform Engineer",
      experienceMonths:84, skills:["Kubernetes","Java"],
      noticePeriodDays:null,
    };
    const updated = await reviewResumeProfile(owner,entry.id,{
      action:"correct",expectedVersion:0,confirmedAgainstSource:true,
      reason:"Verified work history against the original document.",
      profile:corrected,
    });
    expect(updated).toMatchObject({
      reviewVersion:1,reviewState:"HUMAN_VERIFIED",
      profile:expect.objectContaining({ roleTitle:"Lead Platform Engineer",
        experienceMonths:84,noticePeriodDays:null }),
    });
    const doc = await resumeImport(owner,entry.id);
    expect(doc.status).toBe("READY");
    expect(doc.evidence.map(x=>x.fieldKey)).not.toContain("roleTitle");
    expect(doc.evidence.map(x=>x.fieldKey)).not.toContain("noticePeriodDays");
    expect(doc.evidence.some(x=>x.fieldKey.startsWith("skill:"))).toBe(false);
    const candidate = await db.candidate.findFirstOrThrow({where:{sourceDocumentId:entry.id},
      include:{skills:{include:{skill:true}}}});
    expect(candidate.skills.map(x=>x.skillId).sort()).toEqual(["java","kubernetes"]);
    const audits = await resumeAuditHistory(owner,entry.id);
    expect(audits.events).toHaveLength(2);
    expect(audits.events[0]).toMatchObject({
      action:"HUMAN_CORRECTED",reviewVersion:1,
      changedFields:expect.arrayContaining(["roleTitle","skills","experienceMonths","noticePeriodDays"]),
      before:expect.objectContaining({roleTitle:"Senior Java Developer"}),
      after:expect.objectContaining({roleTitle:"Lead Platform Engineer"}),
    });
    const newer = await reviewResumeProfile(owner,entry.id,{
      action:"correct",expectedVersion:1,confirmedAgainstSource:true,
      reason:"Found an additional verified employment period.",
      profile:{...corrected,experienceMonths:96},
    });
    expect(newer.reviewVersion).toBe(2);
    expect((await resumeAuditHistory(owner,entry.id)).events).toHaveLength(3);
  });
  it("rejects false positives, removes them from search, and supports source-confirmed repair", async () => {
    const {id}=await complete("d");
    const rejected = await reviewResumeProfile(owner,id,{
      action:"reject",expectedVersion:0,confirmedAgainstSource:true,
      reason:"The extraction identifies another person and cannot be trusted.",
    });
    expect(rejected).toMatchObject({reviewVersion:1,reviewState:"NEEDS_REVIEW",profile:null});
    expect(await db.candidate.count({where:{sourceDocumentId:id}})).toBe(0);
    expect((await resumeImport(owner,id)).ingestionJob?.status).toBe("NEEDS_REVIEW");
    const repaired=await reviewResumeProfile(owner,id,{
      action:"correct",expectedVersion:1,confirmedAgainstSource:true,
      reason:"Verified manually using the private original resume.",
      profile:{...completeProfile,skills:null,city:null},
    });
    expect(repaired).toMatchObject({
      reviewState:"HUMAN_VERIFIED",reviewVersion:2,
      profile:expect.objectContaining({skills:null,city:null}),
    });
    const candidate=await db.candidate.findFirstOrThrow({where:{sourceDocumentId:id}});
    expect(candidate.skillsKnown).toBe(false);
    expect((await resumeAuditHistory(owner,id)).events.map(x=>x.action))
      .toEqual(["HUMAN_CORRECTED","HUMAN_REJECTED","MODEL_EXTRACTED"]);
  });
  it("reports only owner-scoped real operational and correction counts", async () => {
    const foreign = await complete("foreign",stranger);
    const ownerStats = await ingestionMetrics(owner,30);
    const otherStats = await ingestionMetrics(stranger,30);
    expect(ownerStats.jobs.READY).toBeGreaterThanOrEqual(3);
    expect(ownerStats.attempts.total).toBeGreaterThanOrEqual(3);
    expect(ownerStats.attempts.averageParseMs).not.toBeNull();
    expect(ownerStats.qualityActivity.modelExtractions).toBeGreaterThanOrEqual(3);
    expect(ownerStats.qualityActivity.correctionEvents).toBeGreaterThanOrEqual(2);
    expect(otherStats.qualityActivity.correctionEvents).toBe(0);
    expect(otherStats.attempts.total).toBeGreaterThanOrEqual(1);
    expect(await db.resumeProfileAudit.count({where:{ownerId:stranger,documentId:foreign.id}})).toBe(1);
    expect(ownerStats.caveats[0]).toContain("not measured extraction accuracy");
    await expect(ingestionMetrics(owner,365)).rejects.toThrow();
  });
});
