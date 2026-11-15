/** Offline real-PDF pilot. No AI provider calls, database writes, or private keys. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildPdf, resumes } from "./generate-ats-resume-corpus.mjs";
import { parseResume, validateResume } from "../src/ingestion/parse.ts";
import { validateExtractedProfile } from "../src/ingestion/extract.ts";

const hashes = new Set(), output = [];
for(const sample of resumes){
 const bytes=buildPdf(sample);
 const sha256=createHash("sha256").update(bytes).digest("hex");
 assert.ok(!hashes.has(sha256),"Every resume must be a distinct document");
 hashes.add(sha256);
 const source=validateResume("resume-"+sample.id+".pdf","application/pdf",bytes);
 const pdf=await getDocument({data:new Uint8Array(bytes),useSystemFonts:true}).promise;
 const pageCount=pdf.numPages;await pdf.destroy();
 assert.equal(pageCount,1,"Every benchmark resume is exactly one page");
 const parsed=await parseResume(source);
 const normalized=parsed.text.replace(/\s+/g," ");
 assert.ok(parsed.text.length>750,"Text extraction must produce a substantial resume");
 assert.ok(!parsed.truncated,"Test resumes must not be truncated");
 assert.ok(normalized.includes(sample.name));
 assert.ok(normalized.includes(sample.title));
 assert.ok(normalized.includes(sample.city));
 assert.ok(normalized.includes("WORK EXPERIENCE")&&normalized.includes("CORE SKILLS")&&normalized.includes("EDUCATION"));
 assert.ok(normalized.includes("Professional experience: "+sample.experience+" years"));
 assert.ok(normalized.includes("Notice period: "+(sample.notice===null?"Not specified":sample.notice+" days")));
 for(const skill of sample.skills)assert.ok(normalized.includes(skill),"Missing skill: "+skill);
 const evidence=[
   {field:"displayName",quote:sample.name},
   {field:"roleTitle",quote:sample.title},
   {field:"city",quote:sample.city},
   {field:"experienceMonths",quote:"Professional experience: "+sample.experience+" years"},
   {field:"education",quote:sample.education},
   ...sample.skills.map(skill=>({field:"skill:"+skill,quote:skill})),
 ];
 if(sample.notice!==null)evidence.push({field:"noticePeriodDays",quote:"Notice period: "+sample.notice+" days"});
 const proposal={
  displayName:sample.name,roleTitle:sample.title,city:sample.city,
  experienceMonths:sample.experience*12,noticePeriodDays:sample.notice,
  industry:null,education:sample.education,employmentType:null,skills:sample.skills,
  pastRoles:[],certifications:[],evidence,warnings:[],
 };
 const verified=validateExtractedProfile(proposal,parsed,"OFFLINE_FIXTURE");
 assert.equal(verified.profile?.displayName,sample.name,"Name must have grounded evidence");
 assert.equal(verified.profile?.roleTitle,sample.title);
 assert.equal(verified.profile?.city,sample.city);
 assert.equal(verified.profile?.experienceMonths,sample.experience*12);
 assert.equal(verified.profile?.noticePeriodDays,sample.notice);
 assert.deepEqual(new Set(verified.profile?.skills??[]),new Set(sample.skills));
 assert.equal(verified.needsReview,false,"Correct fully-grounded test proposal should not require review");
 assert.ok(verified.evidence.every(e=>e.pageNumber===1),"Evidence must cite the actual PDF page");
 output.push({id:sample.id,bytes:bytes.length,pageCount,parsedChars:parsed.text.length,
  groundedFields:verified.evidence.length,sha256:sha256.slice(0,12)});
}
console.log(JSON.stringify({test:"Real PDF parser + ground-truth evidence oracle (no AI)",
 documents:output.length,successful:output.length,results:output},null,2));
