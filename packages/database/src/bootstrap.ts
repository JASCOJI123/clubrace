/**
 * DRIVER HUB — idempotent production bootstrap (spec §59, §60).
 *
 * Creates the minimum configuration on a fresh database WITHOUT wiping anything:
 *   - first admin (ADMIN_EMAIL / ADMIN_PASSWORD)
 *   - system settings (products, flags) if missing
 *   - marketplace categories if none exist
 *
 * Safe to run on every boot. This is intentionally NOT the dev seed
 * (packages/database/src/seed.ts) which wipes all data and is dev-only.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@driverhub.uz').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe_12345'

  // 1. First admin — create only if this email doesn't exist yet.
  const existingAdmin = await prisma.adminUser.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const adminHash = await bcrypt.hash(adminPassword, 10)
    const adminUser = await prisma.user.create({
      data: { role: 'ADMIN', name: 'System Admin', onboardingDone: true },
    })
    await prisma.adminUser.create({
      data: { userId: adminUser.id, email: adminEmail, passwordHash: adminHash },
    })
    console.log(`✅ Admin yaratildi: ${adminEmail}`)
  } else {
    console.log(`⏭️  Admin allaqachon mavjud: ${adminEmail}`)
  }

  // 2. System settings — business config seeds (not hardcoded at runtime).
  if ((await prisma.systemSetting.count()) === 0) {
    await prisma.systemSetting.createMany({
      data: [
        { key: 'products', value: { pro: { priceMonthSoums: 49000 }, marketplaceCommissionPercent: 3 } },
        { key: 'flags', value: { demoMode: false, liveTelegram: !!process.env.TELEGRAM_BOT_TOKEN } },
      ],
    })
    console.log('✅ System settings yaratildi')
  } else {
    console.log('⏭️  System settings mavjud')
  }

  // 3. Marketplace categories.
  if ((await prisma.marketplaceCategory.count()) === 0) {
    const defs = [
      ['CARS', '🚗', 0],
      ['TIRES', '🛞', 1],
      ['PARTS', '🔩', 2],
      ['ACCESSORIES', '🎁', 3],
      ['OIL', '🛢', 4],
      ['TOOLS', '🧰', 5],
      ['ELECTRONICS', '📱', 6],
      ['OTHER', '📦', 7],
    ] as const
    await prisma.marketplaceCategory.createMany({
      data: defs.map(([slug, emoji, order]) => ({ name: emoji, slug, emoji, order })),
    })
    console.log('✅ Marketplace kategoriyalari yaratildi')
  } else {
    console.log('⏭️  Marketplace kategoriyalari mavjud')
  }

  console.log('🎉 Bootstrap yakunlandi.')
}

main()
  .catch((e) => {
    console.error('Bootstrap xato:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())