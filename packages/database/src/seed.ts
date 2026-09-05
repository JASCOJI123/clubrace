/**
 * DRIVER HUB — development seed data.
 *
 * ⚠️ DEV-ONLY. Generates clearly synthetic, labelled data on a blank database.
 *    Never run against production. Demo-mode data is kept in a separate `isDemo`
 *    marker so it is never mixed with real records (spec §60).
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import type { AchievementCategory } from '@prisma/client'

const prisma = new PrismaClient()

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T,>(arr: readonly T[]): T => arr[rand(0, arr.length - 1)]!
const daysAgo = (n: number, hour = 12, minute = 0) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d
}

const INCOME_PLATFORMS = ['YANDEX', 'UBER', 'INDRIVE', 'PRIVATE', 'DELIVERY'] as const
const EXPENSE_CATEGORIES = [
  'FUEL', 'GAS', 'OIL', 'REPAIR', 'TIRES', 'PARKING', 'CAR_WASH', 'INSURANCE', 'OTHER',
] as const
const MAINTENANCE_TYPES = [
  'ENGINE_OIL', 'OIL_FILTER', 'AIR_FILTER', 'CABIN_FILTER', 'BRAKE_PADS', 'TIRES', 'BATTERY', 'TECHNICAL_INSPECTION', 'INSURANCE', 'OTHER',
] as const
const NAMES = [
  'Aziz', 'Bekzod', 'Dilshod', 'Farrukh', 'Gulom', 'Hasan', 'Ibrohim', 'Jasur',
  'Kamol', 'Laziz', 'Murod', 'Nodir', 'Otabek', 'Sardor', 'Timur', 'Ulugbek',
  'Vokhid', 'Yusuf', 'Zafar', 'Rustam',
] as const
const CAR_BRANDS = [
  'Chevrolet', 'Toyota', 'Kia', 'Hyundai', 'Daewoo', 'Suzuki', 'Lada', 'Faw',
] as const
const CAR_MODELS = [
  'Cobalt', 'Gentra', 'Nexia 3', 'Lacetti', 'Spark', 'Damas', 'Creta', 'K5',
  'Rio', 'Elantra', 'Malibu 2', 'Ravon R2', 'Camry 60', 'Labo', 'Matiz', 'Tracker',
] as const
const CITIES = ['Tashkent', 'Samarkand', 'Bukhara', 'Andijan', 'Fergana', 'Nukus', 'Namangan', 'Karshi'] as const

async function main() {
  console.log('🗄  Wiping existing dev data...')
  // wipe children first
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.adminAction.deleteMany(),
    prisma.report.deleteMany(),
    prisma.supportMessage.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.paymentEvent.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.referralReward.deleteMany(),
    prisma.referral.deleteMany(),
    prisma.routeReview.deleteMany(),
    prisma.routePassenger.deleteMany(),
    prisma.routeRequest.deleteMany(),
    prisma.route.deleteMany(),
    prisma.marketplaceReport.deleteMany(),
    prisma.marketplaceFavorite.deleteMany(),
    prisma.marketplaceImage.deleteMany(),
    prisma.marketplaceListing.deleteMany(),
    prisma.marketplaceCategory.deleteMany(),
    prisma.partnerLead.deleteMany(),
    prisma.offerRedemption.deleteMany(),
    prisma.offerClaim.deleteMany(),
    prisma.offerView.deleteMany(),
    prisma.partnerOffer.deleteMany(),
    prisma.partner.deleteMany(),
    prisma.challengeParticipant.deleteMany(),
    prisma.challenge.deleteMany(),
    prisma.driverAchievement.deleteMany(),
    prisma.achievement.deleteMany(),
    prisma.driverLevelRecord.deleteMany(),
    prisma.driverScoreEvent.deleteMany(),
    prisma.driverScore.deleteMany(),
    prisma.goalTransaction.deleteMany(),
    prisma.goal.deleteMany(),
    prisma.workSession.deleteMany(),
    prisma.incomeRecord.deleteMany(),
    prisma.expenseRecord.deleteMany(),
    prisma.maintenanceRecord.deleteMany(),
    prisma.carDocument.deleteMany(),
    prisma.car.deleteMany(),
    prisma.driver.deleteMany(),
    prisma.adminUser.deleteMany(),
    prisma.user.deleteMany(),
    prisma.systemSetting.deleteMany(),
  ])

  console.log('✅ Wiped. Seeding...')

  // --- Achievements
  const achievements = await Promise.all(
    [
      { code: 'STREAK_7', title: '7 kunlik seriya', description: '7 kun ketma-ket qayd yuritdingiz', emoji: '🔥', xpReward: 100, category: 'STREAK' },
      { code: 'FIRST_1M_PROFIT', title: 'Birinchi 1 mln sof foyda', description: 'Kumulyativ 1 000 000 so‘m sof foyda', emoji: '💰', xpReward: 200, category: 'EARNING' },
      { code: 'CAR_MAINTAINED', title: 'Mashina parvarishi', description: '10 ta ta’mirlash qaydi kiritildi', emoji: '🚗', xpReward: 100, category: 'VEHICLE' },
      { code: 'FIRST_GOAL', title: 'Birinchi maqsad', description: 'Birinchi maqsadingizni yakunladingiz', emoji: '🎯', xpReward: 150, category: 'GOAL' },
      { code: 'TRACKED_30', title: '30 kun nazorat', description: '30 kun qayd yuritishda davom etdingiz', emoji: '📊', xpReward: 250, category: 'CONSISTENCY' },
      { code: 'CHALLENGE_WIN', title: 'Challenge g‘olibi', description: 'Challengedan birinchi o‘rinni egalladingiz', emoji: '🏆', xpReward: 300, category: 'CHALLENGE' },
      { code: 'EXPENSE_DISCIPLE', title: 'Xarajat intizomi', description: '100 ta xarajat qaydi', emoji: '🧠', xpReward: 150, category: 'CONSISTENCY' },
    ].map(({ category, ...a }) => prisma.achievement.create({ data: { ...a, category: category as AchievementCategory } }))
  )

  // --- Admin bootstrap (from env, default provided)
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@driverhub.uz'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe_12345'
  const adminHash = await bcrypt.hash(adminPassword, 10)
  const adminUser = await prisma.user.create({
    data: {
      role: 'ADMIN',
      name: 'System Admin',
      onboardingDone: true,
    },
  })
  await prisma.adminUser.create({
    data: { userId: adminUser.id, email: adminEmail, passwordHash: adminHash },
  })
  const adminId = adminUser.id
  const adminActor = { id: adminId } // used for created_by on settings below

  // --- System settings (configurable business values — not hardcoded at runtime)
  await prisma.systemSetting.create({
    data: {
      key: 'products',
      value: {
        pro: { priceMonthSoums: 49000 },
        marketplaceCommissionPercent: 3,
      },
    },
  })
  await prisma.systemSetting.create({
    data: { key: 'flags', value: { demoMode: false, liveTelegram: false } },
  })

  // --- Marketplace categories
  const mktCats = await Promise.all(
    (
      [
        ['CARS', '🚗', 0], ['TIRES', '🛞', 1], ['PARTS', '🔩', 2], ['ACCESSORIES', '🎁', 3],
        ['OIL', '🛢', 4], ['TOOLS', '🧰', 5], ['ELECTRONICS', '📱', 6], ['OTHER', '📦', 7],
      ] as const
    ).map(([slug, emoji, order]) => prisma.marketplaceCategory.create({ data: { name: emoji, slug, emoji, order } }))
  )

  // --- Drivers + cars
  const drivers: { id: string; name: string }[] = []
  for (let i = 0; i < 20; i++) {
    const name = NAMES[i] ?? `Driver${i}`
    const tgId = BigInt(Math.floor(Math.random() * 1_000_000_000) + i)
    const user = await prisma.user.create({
      data: {
        role: 'DRIVER',
        name,
        telegramId: tgId,
        telegramUsername: `${name.toLowerCase()}_${i}`,
        driverType: pick(['TAXI', 'PRIVATE_DRIVER', 'DELIVERY', 'CARGO'] as const),
        onboardingDone: true,
        referralCode: `DH${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        settings: { notificationPrefs: { telegramEnabled: true } },
      },
    })
    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        driverType: user.driverType,
        incomeTargetMonth: pick([3000000, 4000000, 5000000, 6000000]),
        primaryGoal: pick(['INCREASE_INCOME', 'REDUCE_EXPENSES', 'SAVE_MONEY'] as const),
        level: pick(['ROOKIE', 'ACTIVE', 'PRO', 'ELITE'] as const),
        xp: rand(50, 1200),
      },
    })
    drivers.push({ id: user.id, name })
    const mk = rand(11000, 280000)
    const car = await prisma.car.create({
      data: {
        userId: user.id,
        brand: pick(CAR_BRANDS),
        model: pick(CAR_MODELS),
        year: rand(2010, 2024),
        plate: `01 ${String.fromCharCode(65 + rand(0, 25))}${rand(100, 999)} ${String.fromCharCode(65 + rand(0, 25))}${String.fromCharCode(65 + rand(0, 25))}`,
        fuelType: pick(['PETROL', 'GAS', 'DIESEL'] as const),
        mileageKms: mk,
      },
    })

    // Income records: ~30 days, 2-5 per day
    const incomePlatforms = pick([INCOME_PLATFORMS.slice(0, 3), INCOME_PLATFORMS.slice(0, 5)])
    for (let d = 0; d < 30; d++) {
      const count = rand(2, 5)
      for (let c = 0; c < count; c++) {
        await prisma.incomeRecord.create({
          data: {
            userId: user.id,
            carId: car.id,
            amount: rand(60000, 240000),
            date: daysAgo(30 - d, rand(8, 22), rand(0, 55)),
            platform: pick(incomePlatforms),
            tripCount: rand(8, 40),
          },
        })
      }
    }
    // Expenses: fuel daily, others occasionally
    for (let d = 0; d < 30; d++) {
      if (Math.random() < 0.9) {
        await prisma.expenseRecord.create({
          data: {
            userId: user.id,
            carId: car.id,
            category: Math.random() < 0.7 ? 'FUEL' : pick(EXPENSE_CATEGORIES),
            amount: rand(40000, 180000),
            date: daysAgo(30 - d, rand(7, 22), rand(0, 55)),
          },
        })
      }
    }
    // Maintenance records
    for (let m = 0; m < rand(2, 5); m++) {
      await prisma.maintenanceRecord.create({
        data: {
          userId: user.id,
          carId: car.id,
          serviceType: pick(MAINTENANCE_TYPES),
          date: daysAgo(rand(5, 200)),
          mileageKms: mk - rand(0, 40000),
          cost: rand(80000, 2_500_000),
          nextDueDate: daysAgo(-rand(5, 120)),
        },
      })
    }
    // Goal + transactions
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: pick(['Yangi telefon', 'Zaxira kapital', 'Yangilangan shina', 'Ta’til sarguzashti', 'Benzin uchun zaxira']),
        targetAmount: pick([3_000_000, 5_000_000, 10_000_000, 15_000_000]),
        deadline: daysAgo(-rand(10, 45)),
        status: 'ACTIVE',
        emoji: pick(['🎯', '💼', '🏡', '📱', '🛞']),
      },
    })
    for (let t = 0; t < rand(3, 8); t++) {
      await prisma.goalTransaction.create({
        data: { goalId: goal.id, amount: rand(50_000, 400_000), date: daysAgo(rand(0, 20)) },
      })
    }
  }

  // --- Referrals among drivers
  for (let i = 1; i < drivers.length; i++) {
    if (Math.random() < 0.4) {
      const referrer = pick(drivers.slice(0, i))
      await prisma.referral.create({
        data: {
          referrerId: referrer.id,
          inviteeId: drivers[i]!.id,
          status: pick(['PENDING', 'ACTIVE', 'REWARDED'] as const),
        },
      })
    }
  }

  // --- Partners + offers + coupons
  const partnerNames = ['ABC Tires', 'Nexia Servis', 'GazOil', 'Tashkent Wash', 'Auto Insurance Pro', 'Benzin24', 'Tyres.uz', 'Oil City', 'Lada Parts Market', 'Avtomebel'] as const
  const partners: { id: string }[] = []
  for (let i = 0; i < 10; i++) {
    const pName = partnerNames[i]!
    const partnerUser = await prisma.user.create({
      data: {
        role: 'PARTNER',
        name: pName,
        onboardingDone: true,
      },
    })
    const partner = await prisma.partner.create({
      data: {
        userId: partnerUser.id,
        businessName: pName,
        category: pick(['FUEL', 'SERVICE', 'TIRES', 'CAR_WASH', 'INSURANCE', 'OTHER'] as const),
        description: 'Demo hamkor profili (dev seed)',
        phone: `+998 ${rand(90, 99) } ${rand(100, 999)} ${rand(10, 99)} ${rand(10, 99)}`,
        address: `${pick(CITIES)} shahar`,
        status: pick(['APPROVED', 'PENDING'] as const),
        workingHours: { open: '09:00', close: '21:00' },
      },
    })
    partners.push({ id: partner.id })
    for (let o = 0; o < 2; o++) {
      await prisma.partnerOffer.create({
        data: {
          partnerId: partner.id,
          title: o === 0 ? '15% chegirma' : 'Har 3-mahsulot chegirma',
          description: `${pName} — demo taklif (dev seed)`,
          discountText: o === 0 ? '15%' : '10%',
          category: pick(['FUEL', 'SERVICE', 'TIRES', 'OIL', 'CAR_WASH', 'INSURANCE', 'AUTO_DEALERS'] as const),
          validUntil: daysAgo(-rand(5, 45)),
          status: pick(['APPROVED', 'PENDING'] as const),
          featured: Math.random() < 0.3,
          views: rand(0, 500),
          clicks: rand(0, 120),
        },
      })
    }
  }

  // --- Marketplace listings
  for (let i = 0; i < 20; i++) {
    const seller = pick(drivers)
    const cat = pick(mktCats)
    const listing = await prisma.marketplaceListing.create({
      data: {
        userId: seller.id,
        categoryId: cat.id,
        title: pick(['Cobalt sun’at qismlari', 'Uchta Р16 shina', 'Moy 10W-40 (5L)', 'Guruchli torim', 'Musical klaxon']),
        description: 'Demo e’lon (dev seed)',
        price: rand(150_000, 15_000_000),
        condition: pick(['NEW', 'LIKE_NEW', 'USED', 'SPARE_PARTS'] as const),
        location: pick(CITIES),
        contactPhone: `+998 ${rand(90, 99)} ${rand(100, 999)} ${rand(10, 99)} ${rand(10, 99)}`,
        status: pick(['APPROVED', 'PENDING', 'SOLD', 'REJECTED'] as const),
      },
    })
    await prisma.marketplaceImage.create({
      data: { listingId: listing.id, url: '/uploads/demo/listing-placeholder.svg', order: 0 },
    })
  }

  // --- Routes
  for (let i = 0; i < 10; i++) {
    const driver = pick(drivers)
    const [from, to] = [pick(CITIES), pick(CITIES)]
    await prisma.route.create({
      data: {
        userId: driver.id,
        fromCity: from,
        toCity: to,
        date: daysAgo(-rand(0, 10), rand(6, 20), rand(0, 55)),
        departureTime: `${rand(6, 20)}:${rand(0, 55).toString().padStart(2, '0')}`,
        seatsAvailable: rand(1, 3),
        price: rand(100_000, 350_000),
        status: pick(['PLANNED', 'ACTIVE', 'DONE'] as const),
      },
    })
  }

  // --- Challenges
  const challengeDefs = [
    { name: 'Hafta foydasi', metric: 'NET_PROFIT' as const, reward: '700 XP' },
    { name: 'Har kuni qayd', metric: 'ACTIVITY' as const, reward: '400 XP' },
    { name: 'Tejamkor hafta', metric: 'EXPENSE_DISCIPLINE' as const, reward: '500 XP' },
    { name: 'Maqsad intizomi', metric: 'GOAL_PROGRESS' as const, reward: '600 XP' },
    { name: 'Uzluksiz ish', metric: 'WORK_CONSISTENCY' as const, reward: '450 XP' },
  ]
  for (const c of challengeDefs) {
    const ch = await prisma.challenge.create({
      data: {
        name: c.name,
        description: 'Demo challenge (dev seed)',
        metric: c.metric,
        startDate: daysAgo(-2),
        endDate: daysAgo(12),
        reward: c.reward,
        status: 'ACTIVE',
      },
    })
    for (const d of drivers.slice(0, 8)) {
      if (Math.random() < 0.7) {
        await prisma.challengeParticipant.create({
          data: {
            challengeId: ch.id,
            userId: d.id,
            resultValue: rand(300_000, 4_000_000),
            optedOutLeaderboard: Math.random() < 0.15,
          },
        })
      }
    }
  }

  // --- Driver scores for everyone
  for (const d of drivers) {
    const score = rand(50, 96)
    await prisma.driverScore.create({
      data: {
        userId: d.id,
        score,
        components: {
          financialDiscipline: rand(40, 100),
          consistency: rand(40, 100),
          vehicleMaintenance: rand(30, 100),
          goalCompletion: rand(20, 100),
          communityActivity: rand(10, 90),
          customerRating: null,
        },
      },
    })
  }

  // Mark some drivers as demo (clearly separated DEMO DATA)
  const demoUser = await prisma.user.create({
    data: {
      role: 'DRIVER',
      name: 'Demo Haydovchi',
      telegramId: 999999999n,
      isDemo: true,
      onboardingDone: true,
      referralCode: 'DEMO1',
    },
  })
  await prisma.driver.create({
    data: {
      userId: demoUser.id,
      driverType: 'TAXI',
      incomeTargetMonth: 5_000_000,
      primaryGoal: 'INCREASE_INCOME',
      level: 'PRO',
      xp: 640,
    },
  })
  await prisma.car.create({
    data: {
      userId: demoUser.id,
      brand: 'Chevrolet',
      model: 'Cobalt',
      year: 2021,
      plate: '01 A777AA',
      fuelType: 'GAS',
      mileageKms: 82400,
    },
  })

  const counts = {
    users: await prisma.user.count(),
    cars: await prisma.car.count(),
    income: await prisma.incomeRecord.count(),
    expenses: await prisma.expenseRecord.count(),
    partners: await prisma.partner.count(),
    offers: await prisma.partnerOffer.count(),
    listings: await prisma.marketplaceListing.count(),
    routes: await prisma.route.count(),
    challenges: await prisma.challenge.count(),
  }
  console.log('🌱 Dev seed complete:', counts)
  console.log('🔑 Admin login:', { email: adminEmail, password: adminPassword })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void adminActor
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })