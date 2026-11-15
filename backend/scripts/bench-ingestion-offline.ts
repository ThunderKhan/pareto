/** Honest offline CPU benchmark. No Supabase, Gemini, Groq or DB I/O.
 * Repeats the same 10 distinct synthetic PDFs; this is NOT a benchmark of
 * 500 unique uploads or of an AI provider's rate limits.
 */
import { performance } from "node:perf_hooks";
import { buildPdf, resumes } from "./generate-ats-resume-corpus.mjs";
import { parseResume, validateResume } from "../src/ingestion/parse";
import { rank, type CandidateProfile } from "../src/search/evaluate";
import type { Rule } from "../src/search/criteria";

function option(name: string, fallback: number, max: number): number {
  const index = process.argv.indexOf("--" + name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index+1]);
  if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error("Invalid --"+name);
  return value;
}
function stats(values: number[]) {
  const sorted=[...values].sort((a,b)=>a-b);
  const q=(p:number)=>Math.round(sorted[Math.ceil(sorted.length*p)-1]*100)/100;
  return {count:values.length,p50Ms:q(0.5),p95Ms:q(0.95),
    maxMs:q(1),sumMs:Math.round(values.reduce((s,n)=>s+n,0)*100)/100};
}
function profile(i: number): CandidateProfile {
  const record = resumes[i%resumes.length];
  return {id:"bench-"+String(i).padStart(5,"0"),displayName:record.name,
    roleTitle:record.title,city:record.city,experienceMonths:record.experience*12,
    noticePeriodDays:record.notice,industry:null,education:record.education,
    employmentType:null,pastRoles:record.jobs.map((job: string[])=>job[0]),
    certifications:[],skills:record.skills};
}
const docs = option("docs",50,1000), searchCount=option("search",500,1000),runs=option("runs",20,200);
const source = resumes.map(r=>({name:"resume-"+r.id+".pdf",bytes:buildPdf(r)}));
const parseTimes:number[]=[];
for(let i=0;i<docs;i++){
  const file=source[i%source.length];
  const start=performance.now();
  const validated=validateResume(file.name,"application/pdf",file.bytes);
  const parsed=await parseResume(validated);
  if(parsed.pages.length!==1 || parsed.text.length<700)throw Error("Corrupt benchmark PDF");
  parseTimes.push(performance.now()-start);
}
const candidates=Array.from({length:searchCount},(_,i)=>profile(i));
const rules: Rule[]=[
  {field:"experience",mode:"required",minMonths:48},
  {field:"skill",mode:"preferred",value:"Java",exclude:false},
];
const searchTimes:number[]=[];let lastCount=0;
for(let i=0;i<runs;i++){
  const start=performance.now();
  const ranked=rank(candidates,rules);
  lastCount=ranked.length;
  searchTimes.push(performance.now()-start);
}
console.log(JSON.stringify({
  benchmark:"pareto-offline-parse-and-rank-v1",synthetic:true,
  environment:{node:process.version,platform:process.platform,arch:process.arch},
  pdf:{operations:docs,uniqueDocuments:source.length,
    latency:stats(parseTimes),throughputDocsPerSecond:Math.round(docs*1000/parseTimes.reduce((s,n)=>s+n,0)*100)/100},
  search:{profiles:searchCount,runs,lastRankedCount:lastCount,
    latency:stats(searchTimes)},
  peakObservedRssMiB:Math.round(process.memoryUsage().rss/1048576),
  limitations:[
    "Only 10 distinct real PDF documents are repeated for parser load.",
    "Search profiles are in-memory synthetic objects, not imported records.",
    "No object storage, database query, worker queue, AI requests, provider quotas, network latency or authenticated frontend are measured.",
    "Use live 10-document acceptance plus deployed load tests before claiming supported upload throughput.",
  ],
},null,2));
