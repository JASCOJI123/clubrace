import { z } from 'zod'

// ============ Single source of truth for API input validation (spec §46) ============
// Shared by apps/api (server) and apps/web (client-side pre-checks).

export const idParam = z.object({ id: z.string().uuid('Invalid UUID') })

const phone = z
  .string()
  .regex(/^\+?[0-9]{9,15}$/, 'Telefon raqam formati noto‘g‘ri')
  .optional()

export const onboardingSchema = z.object({
  name: z.string().trim().min(1, 'Ism kiritilishi shart').max(80),
  phone,
  driverType: z.enum(['TAXI', 'PRIVATE_DRIVER', 'DELIVERY', 'CARGO', 'OTHER']),
  incomeTarget: z.number().int().min(100_000).max(1_000_000_000).optional(),
  primaryGoal: z
    .enum(['INCREASE_INCOME', 'REDUCE_EXPENSES', 'MAINTAIN_CAR', 'SAVE_MONEY', 'UNDERSTAND_PROFITABILITY'])
    .optional(),
})

export const carSchema = z.object({
  brand: z.string().trim().min(1, 'Brend kerak').max(60),
  model: z.string().trim().min(1, 'Model kerak').max(60),
  year: z.number().int().min(1980).max(2100).optional(),
  plate: z.string().trim().max(20).optional(),
  vin: z.string().trim().max(30).optional(),
  fuelType: z.enum(['PETROL', 'DIESEL', 'GAS', 'ELECTRIC', 'HYBRID', 'OTHER']),
  mileageKms: z.number().int().min(0).max(5_000_000).default(0),
  isPrimary: z.boolean().default(false),
})

export const incomeSchema = z.object({
  amount: z.number().int().min(100, 'Summa kichik').max(100_000_000_000),
  date: z.coerce.date(),
  platform: z.enum(['YANDEX', 'UBER', 'INDRIVE', 'PRIVATE', 'DELIVERY', 'OTHER']),
  tripCount: z.number().int().min(0).max(1000).optional(),
  carId: z.string().uuid().optional(),
  workSessionId: z.string().uuid().optional(),
  notes: z.string().trim().max(500).optional(),
})

export const expenseSchema = z.object({
  amount: z.number().int().min(100, 'Summa kichik').max(100_000_000_000),
  date: z.coerce.date(),
  category: z.enum(['FUEL', 'GAS', 'OIL', 'REPAIR', 'TIRES', 'PARKING', 'CAR_WASH', 'INSURANCE', 'TAX', 'LOAN', 'OTHER']),
  carId: z.string().uuid().optional(),
  workSessionId: z.string().uuid().optional(),
  notes: z.string().trim().max(500).optional(),
})

export const goalSchema = z.object({
  title: z.string().trim().min(1, 'Maqsad nomi kerak').max(120),
  targetAmount: z.number().int().min(100_000, 'Maqsad summasi kichik').max(10_000_000_000),
  deadline: z.coerce.date().optional(),
  emoji: z.string().max(8).default('🎯'),
})

export const goalTransactionSchema = z.object({
  goalId: z.string().uuid(),
  amount: z.number().int().min(100).max(100_000_000_000),
  note: z.string().trim().max(300).optional(),
})

export const maintenanceSchema = z.object({
  carId: z.string().uuid(),
  serviceType: z.enum([
    'ENGINE_OIL', 'OIL_FILTER', 'AIR_FILTER', 'CABIN_FILTER', 'BRAKE_PADS',
    'TIRES', 'BATTERY', 'TECHNICAL_INSPECTION', 'INSURANCE', 'OTHER',
  ]),
  date: z.coerce.date(),
  cost: z.number().int().min(0).max(100_000_000_000),
  mileageKms: z.number().int().min(0).max(5_000_000),
  provider: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  nextDueDate: z.coerce.date().optional(),
  nextDueMileage: z.number().int().min(0).max(5_000_000).optional(),
})

export const mileageLogSchema = z.object({
  carId: z.string().uuid(),
  mileageKms: z.number().int().min(0).max(5_000_000),
  date: z.coerce.date().optional(),
  note: z.string().trim().max(200).optional(),
})

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone,
  driverType: z.enum(['TAXI', 'PRIVATE_DRIVER', 'DELIVERY', 'CARGO', 'OTHER']).optional(),
  incomeTarget: z.number().int().min(100_000).max(1_000_000_000).optional(),
})

export const notificationPrefsSchema = z.object({
  telegramEnabled: z.boolean().optional(),
  quietHoursStart: z.number().int().min(0).max(1440).nullable().optional(),
  quietHoursEnd: z.number().int().min(0).max(1440).nullable().optional(),
  enabled: z.record(z.boolean()).optional(),
})

export const privacySchema = z.object({
  leaderboard: z.boolean().optional(),
  profile: z.boolean().optional(),
  routes: z.boolean().optional(),
})

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(4000),
})

export const supportReplySchema = z.object({
  body: z.string().trim().min(1).max(4000),
})

// ---- Club / marketplace / routes / challenges (scaffold modules) ----

export const clubSearchSchema = z.object({
  category: z.enum(['FUEL', 'SERVICE', 'TIRES', 'OIL', 'CAR_WASH', 'INSURANCE', 'AUTO_DEALERS', 'OTHER']).optional(),
  featuredOnly: z.boolean().default(false),
})

export const marketplaceListingSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(3, 'Sarlavha qisqa').max(160),
  description: z.string().trim().max(4000).optional(),
  price: z.number().int().min(1000, 'Narx kichik').max(100_000_000_000),
  condition: z.enum(['NEW', 'LIKE_NEW', 'USED', 'SPARE_PARTS']),
  location: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(30).optional(),
})

export const marketplaceSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REMOVED', 'SOLD']).optional(),
  cursor: z.string().optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
})

export const reportListingSchema = z.object({
  reason: z.enum(['SCAM', 'WRONG_INFORMATION', 'ILLEGAL_CONTENT', 'SPAM', 'OFFENSIVE', 'OTHER']),
  description: z.string().trim().max(1000).optional(),
})

export const routeCreateSchema = z.object({
  fromCity: z.string().trim().min(2).max(80),
  toCity: z.string().trim().min(2).max(80),
  date: z.coerce.date(),
  departureTime: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/, 'Vaqt formati HH:MM').optional(),
  seatsAvailable: z.number().int().min(1).max(20),
  price: z.number().int().min(0).max(100_000_000_000).optional(),
  description: z.string().trim().max(1000).optional(),
  carId: z.string().uuid().optional(),
})

export const routeSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  cursor: z.string().optional(),
  take: z.coerce.number().int().min(1).max(50).default(20),
})

export const routeRequestSchema = z.object({
  seats: z.number().int().min(1).max(20).default(1),
  note: z.string().trim().max(500).optional(),
})

export const routeRatingSchema = z.object({
  routeId: z.string().uuid(),
  reviewedUserId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
})

// ---- Partner ----

export const partnerOnboardingSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  category: z.string().trim().max(60).optional(),
  description: z.string().trim().max(2000).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  workingHours: z.string().trim().max(300).optional(),
})

export const offerSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  discountText: z.string().trim().max(40).optional(),
  category: z.enum(['FUEL', 'SERVICE', 'TIRES', 'OIL', 'CAR_WASH', 'INSURANCE', 'AUTO_DEALERS', 'OTHER']),
  validUntil: z.coerce.date().optional(),
})

// ---- Admin ----

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const partnerCreateSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(6).max(72),
  phone: z.string().trim().min(5).max(30).optional(),
  category: z.string().trim().min(1).max(60).optional(),
})

export const driverAdminUpdateSchema = z.object({
  isSuspended: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  verify: z.boolean().optional(),
  name: z.string().trim().min(1).max(80).optional(),
})

export const broadcastSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  audience: z.enum(['ALL_DRIVERS', 'PRO_DRIVERS', 'CITY', 'DRIVER_TYPE', 'LEVEL', 'INACTIVE']),
  city: z.string().max(80).optional(),
  driverType: z.enum(['TAXI', 'PRIVATE_DRIVER', 'DELIVERY', 'CARGO', 'OTHER']).optional(),
  level: z.enum(['ROOKIE', 'ACTIVE', 'PRO', 'ELITE']).optional(),
  inactiveDays: z.number().int().min(1).max(365).default(14),
})

export const challengeAdminSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional(),
  metric: z.enum(['NET_PROFIT', 'WORK_CONSISTENCY', 'EXPENSE_DISCIPLINE', 'GOAL_PROGRESS', 'ACTIVITY']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reward: z.string().trim().max(120).optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'FINISHED']).default('DRAFT'),
})

export const settingsUpdateSchema = z.object({
  proPriceMonth: z.number().int().min(0).optional(),
  marketplaceCommissionPercent: z.number().min(0).max(50).optional(),
  demoMode: z.boolean().optional(),
})

// ---- AI ----
export const aiChatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
})

export const aiCoachSchema = z.object({
  goalAmount: z.number().int().min(100_000).max(10_000_000_000).optional(),
})

// ---- Payments ----
export const subscribeSchema = z.object({
  plan: z.enum(['PRO']),
  provider: z.enum(['local', 'telegram_stars']).optional(),
})
