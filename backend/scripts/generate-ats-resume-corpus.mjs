/** Original, fictional ATS resume PDFs. Deterministic; no network, AI, or database. */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const resumes = [
 {id:"001",name:"Aarav Mehta",title:"Backend Software Engineer",city:"Pune",experience:5,notice:30,
  skills:["Java","Spring Boot","PostgreSQL","Docker","AWS","Redis"],education:"B.Tech Computer Science, Westbridge Institute of Technology, 2021",
  summary:"Backend engineer building Java APIs, high-volume services, and reliable data pipelines for SaaS products.",
  jobs:[["Backend Engineer","Northshore Systems","2023 - Present","Designed Spring Boot APIs supporting order ingestion with idempotent writes and PostgreSQL indexes.","Added Redis caching and Docker-based release checks; reduced repeated database reads."],["Software Engineer","Cedarstack Technologies","2021 - 2023","Maintained Java services and AWS deployments; wrote integration tests for critical workflows.","Built audit logs and alerting for payment retry failures."]],
  project:"Developed an internal service-health dashboard using Java, PostgreSQL, and Prometheus."},
 {id:"002",name:"Meera Iyer",title:"Data Analyst",city:"Bengaluru",experience:3,notice:15,
  skills:["SQL","Python","Pandas","Power BI","Excel","Statistics"],education:"B.Sc Statistics, Lakeside University, 2023",
  summary:"Analyst translating ambiguous business questions into reproducible SQL analysis and stakeholder-ready reporting.",
  jobs:[["Data Analyst","Cobalt Retail Analytics","2024 - Present","Built SQL data-quality checks and Power BI dashboards for regional merchandising teams.","Automated weekly Excel reporting with Python and Pandas; documented metric definitions."],["Junior Data Analyst","Granite Insights","2023 - 2024","Explored product-funnel trends using SQL cohorts and statistical summaries.","Partnered with engineering to reconcile duplicate user-event records."]],
  project:"Created a churn-analysis notebook using Pandas, exploratory statistics, and validation checks."},
 {id:"003",name:"Kabir Rao",title:"Frontend Engineer",city:"Hyderabad",experience:4,notice:60,
  skills:["TypeScript","React","Next.js","CSS","Accessibility","Playwright"],education:"B.E Information Technology, Meridian College, 2022",
  summary:"Frontend engineer focused on accessible workflows, component systems, and resilient React applications.",
  jobs:[["Frontend Engineer","Brightlane Software","2024 - Present","Built React and Next.js workspace screens with accessible forms and keyboard navigation.","Introduced Playwright smoke tests and reduced unnecessary client-side data requests."],["UI Developer","Lakefront Digital","2022 - 2024","Implemented responsive TypeScript components and reusable CSS design tokens.","Partnered with designers on focus states, loading patterns, and mobile QA."]],
  project:"Built an accessible scheduling UI with responsive calendar views and automated visual checks."},
 {id:"004",name:"Sara Fernandes",title:"Machine Learning Engineer",city:"Mumbai",experience:6,notice:45,
  skills:["Python","PyTorch","Scikit-learn","FastAPI","MLflow","Docker"],education:"M.Tech Artificial Intelligence, Harborview University, 2020",
  summary:"Applied ML engineer shipping validated models and monitoring data drift in production services.",
  jobs:[["ML Engineer","Orbit Data Research","2022 - Present","Deployed PyTorch inference services with FastAPI and structured model version metadata.","Introduced MLflow experiment tracking and input-drift alerts for classification models."],["Data Scientist","Pinecone Analytics Studio","2020 - 2022","Built Scikit-learn baselines and reproducible feature pipelines for risk scoring.","Wrote offline evaluation reports with slice-wise error breakdowns."]],
  project:"Prototyped a document classifier with model-card limitations and confidence calibration."},
 {id:"005",name:"Nikhil Shah",title:"DevOps Engineer",city:"Noida",experience:7,notice:90,
  skills:["Linux","Kubernetes","Terraform","AWS","GitHub Actions","Prometheus"],education:"B.Tech Electronics Engineering, Riverstone University, 2019",
  summary:"Infrastructure engineer improving deploy reliability, observability, and repeatable cloud environments.",
  jobs:[["Senior DevOps Engineer","Summit Platform Services","2022 - Present","Managed Kubernetes environments and Terraform modules for isolated AWS deployments.","Built Prometheus service alerts and GitHub Actions workflows with rollout verification."],["DevOps Engineer","Shoreline Networks","2019 - 2022","Standardized Linux server provisioning and automated TLS certificate rotation.","Documented incident recovery steps and worked through on-call postmortems."]],
  project:"Created a reproducible Kubernetes staging cluster with infrastructure checks and rollback tests."},
 {id:"006",name:"Ananya Bose",title:"Product Designer",city:"Delhi",experience:4,notice:null,
  skills:["Figma","User Research","Prototyping","Design Systems","Accessibility","Usability Testing"],education:"B.Des Interaction Design, Eastwood School of Design, 2022",
  summary:"Product designer clarifying complex enterprise tasks through research, prototyping, and usable interfaces.",
  jobs:[["Product Designer","Mosaic Product Labs","2024 - Present","Mapped onboarding journeys through interviews and iterative Figma prototypes.","Consolidated form patterns and accessibility guidance into a shared design system."],["Associate Designer","Velvet Studio","2022 - 2024","Designed mobile and desktop flows for subscription management tools.","Ran moderated usability sessions and documented reproducible task failures."]],
  project:"Designed a low-vision-friendly application form using research findings and annotated prototypes."},
 {id:"007",name:"Rohan Desai",title:"Cybersecurity Analyst",city:"Chennai",experience:2,notice:30,
  skills:["SIEM","Splunk","Python","Linux","Incident Response","Network Security"],education:"B.Sc Cybersecurity, Seaview Institute, 2024",
  summary:"Security analyst triaging detections, documenting incidents, and automating repeatable investigation tasks.",
  jobs:[["Security Analyst","Boundary Shield Services","2025 - Present","Triaged Splunk detections and correlated authentication logs across Linux hosts.","Wrote Python utilities to normalize indicators and improve incident evidence packages."],["Security Operations Intern","MapleGate Security","2024 - 2025","Investigated suspicious network access in a supervised SOC environment.","Prepared containment checklists and practiced incident response tabletop exercises."]],
  project:"Built a defensive log-normalization tool with safe sample events and rule-based alerts."},
 {id:"008",name:"Priya Nair",title:"Java Full Stack Developer",city:"Kochi",experience:5,notice:30,
  skills:["Java","Spring Boot","Angular","MySQL","REST APIs","JUnit"],education:"B.Tech Information Technology, Southern Coast University, 2021",
  summary:"Full-stack engineer developing reliable Java APIs and maintainable Angular business applications.",
  jobs:[["Software Engineer","CompassWorks Software","2023 - Present","Built Spring Boot REST APIs, MySQL migrations, and JUnit tests for procurement workflows.","Implemented Angular data grids with accessible filters and clear validation feedback."],["Associate Software Engineer","Bluebay IT","2021 - 2023","Maintained Java microservices and investigated production query regressions.","Improved shared frontend components and wrote deployment checklists."]],
  project:"Delivered a supplier onboarding prototype with an Angular interface and Java service layer."},
 {id:"009",name:"Aditya Kulkarni",title:"Data Engineer",city:"Pune",experience:5,notice:60,
  skills:["Python","Apache Spark","Airflow","SQL","AWS","Data Modeling"],education:"B.E Computer Engineering, Central Valley College, 2021",
  summary:"Data engineer creating monitored batch pipelines, data models, and consistent analytics datasets.",
  jobs:[["Data Engineer","NovaGrid Analytics","2023 - Present","Built Airflow jobs and Apache Spark transformations for daily event aggregation.","Added data-quality assertions, retry policy, and warehouse lineage documentation."],["Analytics Engineer","Aspen Business Systems","2021 - 2023","Modeled SQL reporting tables and reduced redundant scheduled transformations.","Improved AWS object-storage partitioning and pipeline runbook quality."]],
  project:"Implemented a synthetic event warehouse with daily quality checks and failure alerts."},
 {id:"010",name:"Zoya Khan",title:"QA Automation Engineer",city:"Jaipur",experience:3,notice:null,
  skills:["Playwright","TypeScript","API Testing","Postman","CI/CD","SQL"],education:"BCA Computer Applications, Cityline University, 2023",
  summary:"QA engineer strengthening release confidence with test automation, API checks, and clear defect reports.",
  jobs:[["QA Automation Engineer","Stonebridge SaaS","2024 - Present","Built Playwright browser checks for authentication, imports, and role-based workflows.","Automated API regression tests and investigated SQL-backed data reconciliation issues."],["QA Analyst","CivicPath Technology","2023 - 2024","Performed exploratory tests and documented actionable reproduction steps.","Created Postman collections and helped stabilize release acceptance criteria."]],
  project:"Created a browser smoke-test suite with deterministic fixtures and CI artifacts."},
];
const hash=data=>createHash("sha256").update(data).digest("hex");
const pdfEscape=s=>s.replaceAll("\\","\\\\").replaceAll("(","\\(").replaceAll(")","\\)");
function wrap(s,width=100){
 const words=s.split(/\s+/),lines=[];let row="";
 for(const word of words){if(word.length>width)throw Error("Unbreakable text");
  const next=row?row+" "+word:word;
  if(next.length>width && row){lines.push(row);row=word;}else row=next;}
 if(row)lines.push(row);return lines;
}
export function buildPdf(profile){
 const ops=[];let y=748;
 function text(s,x=48,size=9.25,bold=false){
  if(!/^[\x20-\x7e]+$/.test(s))throw Error("Only printable ASCII supported");
  ops.push("BT /"+(bold?"F2":"F1")+" "+size+" Tf "+x+" "+y+" Td ("+pdfEscape(s)+") Tj ET");
 }
 const gap=n=>{y-=n;};
 const line=()=>ops.push("0.65 G 0.6 w 48 "+y+" m 564 "+y+" l S 0 G");
 const section=label=>{gap(13);text(label.toUpperCase(),48,9.4,true);gap(8);line();gap(13);};
 const paragraph=(s,bullet=false)=>{
  for(const row of wrap(s,bullet?98:102)){text((bullet?"- ":"")+row,bullet?58:48,9.25);gap(12);}
 };
 text(profile.name,48,19,true);gap(20);
 text(profile.title+"  |  "+profile.city+", India",48,9.8,true);gap(17);
 text("candidate"+profile.id+"@example.test  |  +91 00000 "+String(10000+Number(profile.id))+"  |  Portfolio: example.test/"+profile.id,48,8.9);gap(13);line();
 section("Professional Summary");paragraph(profile.summary);
 section("Core Skills");paragraph(profile.skills.join("  |  "));
 const notice=profile.notice===null?"Not specified":profile.notice+" days";
 text("Professional experience: "+profile.experience+" years  |  Notice period: "+notice,48,9.25);gap(10);
 section("Work Experience");
 for(const job of profile.jobs){
  text(job[0]+"  |  "+job[1]+"  |  "+job[2],48,9.5,true);gap(14);
  paragraph(job[3],true);paragraph(job[4],true);gap(5);
 }
 section("Projects");paragraph(profile.project,true);
 section("Education");paragraph(profile.education);
 if(y<58)throw Error("Resume overflows page: "+profile.id);
 const stream=ops.join("\n")+"\n",objects=[
 "<< /Type /Catalog /Pages 2 0 R >>",
 "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
 "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
 "<< /Length "+Buffer.byteLength(stream,"latin1")+" >>\nstream\n"+stream+"endstream",
 "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
 "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
 ];
 let pdf="%PDF-1.4\n% Pareto synthetic benchmark\n";const offsets=[0];
 for(let i=0;i<objects.length;i++){offsets.push(Buffer.byteLength(pdf,"latin1"));pdf+=(i+1)+" 0 obj\n"+objects[i]+"\nendobj\n";}
 const xref=Buffer.byteLength(pdf,"latin1");
 pdf+="xref\n0 "+(objects.length+1)+"\n0000000000 65535 f \n";
 pdf+=offsets.slice(1).map(n=>String(n).padStart(10,"0")+" 00000 n \n").join("");
 pdf+="trailer\n<< /Root 1 0 R /Size "+(objects.length+1)+" >>\nstartxref\n"+xref+"\n%%EOF\n";
 return Buffer.from(pdf,"latin1");
}
export async function writeCorpus(dir){
 await mkdir(dir,{recursive:true});const documents=[];
 for(const p of resumes){const fileName="resume-"+p.id+".pdf",bytes=buildPdf(p);
  await writeFile(resolve(dir,fileName),bytes);
  documents.push({fileName,sha256:hash(bytes),bytes:bytes.length,synthetic:true,
   expected:{displayName:p.name,roleTitle:p.title,city:p.city,
    experienceMonths:p.experience*12,noticePeriodDays:p.notice,skills:p.skills,education:p.education}});
 }
 const manifest={schemaVersion:1,synthetic:true,
  provenance:"Original fictional resumes generated by Pareto; not real job applicants",
  note:"Ground truth must never be seeded to candidate tables during ingestion benchmark",documents};
 await writeFile(resolve(dir,"ground-truth.json"),JSON.stringify(manifest,null,2)+"\n");
 return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const n=process.argv.indexOf("--out");
 const output=n!==-1&&process.argv[n+1]?resolve(process.argv[n+1]):resolve("ats-resume-pilot");
 const manifest=await writeCorpus(output);
 console.log(JSON.stringify({output,count:manifest.documents.length,
  totalBytes:manifest.documents.reduce((sum,d)=>sum+d.bytes,0)},null,2));
}
