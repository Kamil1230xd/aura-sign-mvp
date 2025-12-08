// Prisma seed script for Aura-Sign MVP
// This script populates the database with initial test data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Seed identities
  console.log('Creating sample identities...');
  
  const identity1 = await prisma.identity.upsert({
    where: { address: '0x1234567890123456789012345678901234567890' },
    update: {},
    create: {
      address: '0x1234567890123456789012345678901234567890',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  const identity2 = await prisma.identity.upsert({
    where: { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' },
    update: {},
    create: {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  console.log(`✓ Created identity: ${identity1.address}`);
  console.log(`✓ Created identity: ${identity2.address}`);

  // Seed trust events
  console.log('Creating sample trust events...');

  const trustEvent1 = await prisma.trust_event.create({
    data: {
      from_address: identity1.address,
      to_address: identity2.address,
      trust_score: 0.85,
      event_type: 'attestation',
      created_at: new Date(),
    },
  });

  const trustEvent2 = await prisma.trust_event.create({
    data: {
      from_address: identity2.address,
      to_address: identity1.address,
      trust_score: 0.92,
      event_type: 'endorsement',
      created_at: new Date(),
    },
  });

  console.log(`✓ Created trust event: ${trustEvent1.id}`);
  console.log(`✓ Created trust event: ${trustEvent2.id}`);

  console.log('✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
