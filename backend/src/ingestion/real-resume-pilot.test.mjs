import { afterAll, describe, expect, it } from "vitest";
import { database } from "../search/db.ts";
import { queueResumeUpload, resumeImport } from "./service.ts";
import { claimJob, jobHistory } from "./queue.ts";
import { processClaim } from "./processor.ts";
import { buildPdf, resumes } from "../../scripts/generate-ats-resume-corpus.mjs";

const url=process.env.PARETO_TEST_DATABASE_URL;
if(url)process.env.DATABASE_URL=url;
const owner="11111111-1111-4111-8111-111111111111";
const objects=new Map(),created=[];
const storage={
 async upload(key,file){if(objects.has(key))throw Error("duplicate private key");objects.set(key,Buffer.from(file.bytes));},
 async read(key){const v=objects.get(key);if(!v)throw Error("private object missing");return Buffer.from(v);},
 async signedUrl(){return "https://private.invalid/pilot.pdf";},
 async remove(key){objects.delete(key);},
};
function providerFor(p){
 const evidence=[
  {field:"displayName",quote:p.name},
  {field:"roleTitle",quote:p.title},
  {field:"city",quote:p.city},
  {field:"experienceMonths",quote:"Professional experience: "+p.experience+" years"},
  {field:"education",quote:p.education},
  ...p.skills.map(skill=>({field:"skill:"+skill,quote:skill})),
 ];
 if(p.notice!==null)evidence.push({field:"noticePeriodDays",quote:"Notice period: "+p.notice+" days"});
 return async()=>({provider:"Gemini",raw:{
  displayName:p.name,roleTitle:p.title,city:p.city,experienceMonths:p.experience*12,
  noticePeriodDays:p.notice,industry:null,education:p.education,employmentType:null,
  skills:p.skills,pastRoles:[],certifications:[],warnings:[],evidence,
 }});
}
describe.skipIf(!url)("real synthetic PDF resume ingestion via PostgreSQL worker with mocked AI",()=>{
 const db=url?database():null;
 afterAll(async()=>{
  if(!db)return;
  if(created.length)await db.candidate.deleteMany({where:{sourceDocumentId:{in:created}}});
  if(created.length)await db.resumeDocument.deleteMany({where:{id:{in:created}}});
  await db.$disconnect();
 });
 it("uploads 10 distinct real PDF bytes into queue and creates evidence-backed candidates",async()=>{
  const uploaded=[];
  for(const p of resumes){
   const fileName="resume-"+p.id+".pdf";
   const result=await queueResumeUpload(owner,fileName,"application/pdf",buildPdf(p),storage);
   expect(result.duplicate).toBe(false);
   expect(result.document).toMatchObject({status:"STORED",ingestionJob:{status:"QUEUED"}});
   created.push(result.document.id);
   uploaded.push({documentId:result.document.id,profile:p});
  }
  for(const {documentId,profile} of uploaded){
   const claim=await claimJob("pdf-pilot-"+profile.id,{global:1,perOwner:1});
   expect(claim?.documentId).toBe(documentId);
   expect(await processClaim(claim,{storage,providers:[providerFor(profile)]})).toBe("READY");
   const imported=await resumeImport(owner,documentId);
   expect(imported.candidate).toMatchObject({
    displayName:profile.name,roleTitle:profile.title,city:profile.city,
   });
   // Import summary intentionally exposes only basic candidate metadata.
   // Validate numerical fields against their owner-scoped persisted record.
   const stored=await db.candidate.findFirstOrThrow({
    where:{ownerId:owner,sourceDocumentId:documentId},
    select:{experienceMonths:true,noticePeriodDays:true},
   });
   expect(stored).toEqual({experienceMonths:profile.experience*12,
    noticePeriodDays:profile.notice});
   expect(imported.ingestionJob).toMatchObject({status:"READY",attempts:1});
   const evidence=await db.resumeEvidence.findMany({where:{documentId}});
   expect(evidence.length).toBeGreaterThanOrEqual(profile.skills.length+4);
   expect(evidence.every(x=>x.pageNumber===1)).toBe(true);
   const history=await jobHistory(owner,documentId);
   expect(history.history).toHaveLength(1);
   expect(history.history[0].sourceChars).toBeGreaterThan(750);
   expect(history.history[0].outcome).toBe("READY");
  }
  expect(await db.candidate.count({where:{ownerId:owner,sourceDocumentId:{in:created}}})).toBe(10);
  // Repeating the same uploaded bytes does not create another document or AI job.
  const duplicate=await queueResumeUpload(owner,"other-name.pdf","application/pdf",buildPdf(resumes[0]),storage);
  expect(duplicate).toMatchObject({duplicate:true});
  expect(duplicate.document.id).toBe(created[0]);
  expect(await db.ingestionJob.count({where:{documentId:created[0]}})).toBe(1);
 });
});
