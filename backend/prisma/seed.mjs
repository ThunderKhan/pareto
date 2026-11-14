import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { fixtures } from "./fixtures.mjs";

const ownerId = process.env.DEMO_OWNER_ID;
const connectionString = process.env.DATABASE_URL;
if (!ownerId || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(ownerId) || !connectionString) {
  throw new Error("Set DATABASE_URL and DEMO_OWNER_ID (the test recruiter's Supabase user UUID).");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
try {
  await db.$transaction(async (tx) => {
    for (const { key, skills, ...profile } of fixtures) {
      const id = `demo-v1-${ownerId.toLowerCase()}-${String(key).padStart(3, "0")}`;
      await tx.candidate.upsert({
        where: { id, ownerId },
        create: { id, ownerId, ...profile, skillsKnown: skills !== null },
        update: { ...profile, skillsKnown: skills !== null },
      });
      await tx.candidateSkill.deleteMany({ where: { candidateId: id } });
      for (const displayName of skills ?? []) {
        const skillId = displayName.toLowerCase();
        await tx.skill.upsert({ where: { id: skillId }, update: {}, create: { id: skillId, displayName } });
        await tx.candidateSkill.create({ data: { candidateId: id, skillId } });
      }
    }
  }, { timeout: 30000 });
  console.log(`Seeded ${fixtures.length} synthetic profiles for the configured recruiter (demo-v1).`);
} finally {
  await db.$disconnect();
}
