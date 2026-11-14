import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { fixtures } from "./fixtures.mjs";

const ownerId = process.env.DEMO_OWNER_ID?.toLowerCase();
const connectionString = process.env.DATABASE_URL;
if (!ownerId || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ownerId) || !connectionString) {
  throw new Error("Set DATABASE_URL and DEMO_OWNER_ID (the test recruiter's Supabase user UUID).");
}

// Keep the same deterministic IDs and candidate attributes as the original seed.
// Prepare bulk writes outside the transaction: over a remote Supabase pooler,
// hundreds of sequential network round trips can exhaust Prisma's transaction timeout.
const prefix = `demo-v1-${ownerId}-`;
const candidates = fixtures.map(({ key, skills, ...profile }) => ({
  id: `${prefix}${String(key).padStart(3, "0")}`,
  ownerId,
  ...profile,
  skillsKnown: skills !== null,
}));
const uniqueSkills = new Map();
const links = [];
for (const { key, skills } of fixtures) {
  const candidateId = `${prefix}${String(key).padStart(3, "0")}`;
  for (const displayName of skills ?? []) {
    const skillId = displayName.toLowerCase();
    uniqueSkills.set(skillId, { id: skillId, displayName });
    links.push({ candidateId, skillId });
  }
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  await db.$transaction(async (tx) => {
    // createMany(skipDuplicates) keeps shared skills stable across recruiters.
    await tx.skill.createMany({ data: [...uniqueSkills.values()], skipDuplicates: true });
    // Delete only this recruiter's synthetic v1 fixtures, never their other
    // candidate data. FK cascade removes old links; stable IDs preserve references.
    await tx.candidate.deleteMany({ where: { ownerId, id: { startsWith: prefix } } });
    await tx.candidate.createMany({ data: candidates });
    await tx.candidateSkill.createMany({ data: links });
  }, { maxWait: 10000, timeout: 60000 });
  console.log(`Seeded ${fixtures.length} synthetic profiles for the configured recruiter (demo-v1).`);
} finally {
  await db.$disconnect();
}
