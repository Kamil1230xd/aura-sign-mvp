import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Przykladowy seed: utworzenie podstawowego uzytkownika i/lub innych encji
  // Dostosuj pola do rzeczywistego schema.prisma
  try {
    await prisma.$connect()
    // Example: await prisma.user.upsert({ where: { email: 'dev@example.com' }, update: {}, create: { email: 'dev@example.com', name: 'Dev' } })
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
