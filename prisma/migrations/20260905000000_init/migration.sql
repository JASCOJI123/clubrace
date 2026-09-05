-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DRIVER', 'PARTNER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "DriverType" AS ENUM ('TAXI', 'PRIVATE_DRIVER', 'DELIVERY', 'CARGO', 'OTHER');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('PETROL', 'DIESEL', 'GAS', 'ELECTRIC', 'HYBRID', 'OTHER');

-- CreateEnum
CREATE TYPE "PrimaryGoal" AS ENUM ('INCREASE_INCOME', 'REDUCE_EXPENSES', 'MAINTAIN_CAR', 'SAVE_MONEY', 'UNDERSTAND_PROFITABILITY');

-- CreateEnum
CREATE TYPE "IncomePlatform" AS ENUM ('YANDEX', 'UBER', 'INDRIVE', 'PRIVATE', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('FUEL', 'GAS', 'OIL', 'REPAIR', 'TIRES', 'PARKING', 'CAR_WASH', 'INSURANCE', 'TAX', 'LOAN', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('ENGINE_OIL', 'OIL_FILTER', 'AIR_FILTER', 'CABIN_FILTER', 'BRAKE_PADS', 'TIRES', 'BATTERY', 'TECHNICAL_INSPECTION', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkSessionStatus" AS ENUM ('ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "DriverLevel" AS ENUM ('ROOKIE', 'ACTIVE', 'PRO', 'ELITE');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('STREAK', 'EARNING', 'VEHICLE', 'GOAL', 'CONSISTENCY', 'CHALLENGE', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "ChallengeMetric" AS ENUM ('NET_PROFIT', 'WORK_CONSISTENCY', 'EXPENSE_DISCIPLINE', 'GOAL_PROGRESS', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OfferCategory" AS ENUM ('FUEL', 'SERVICE', 'TIRES', 'OIL', 'CAR_WASH', 'INSURANCE', 'AUTO_DEALERS', 'OTHER');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('CLAIMED', 'REDEEMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MarketplaceCategorySlug" AS ENUM ('CARS', 'TIRES', 'PARTS', 'ACCESSORIES', 'OIL', 'TOOLS', 'ELECTRONICS', 'OTHER');

-- CreateEnum
CREATE TYPE "ListingCondition" AS ENUM ('NEW', 'LIKE_NEW', 'USED', 'SPARE_PARTS');

-- CreateEnum
CREATE TYPE "MarketplaceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REMOVED', 'SOLD');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PLANNED', 'ACTIVE', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RouteRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACTIVE', 'REWARDED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('PRO_DAYS', 'BADGE');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('LOCAL', 'TELEGRAM_STARS', 'FUTURE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GOAL_REMINDER', 'GOAL_ACHIEVEMENT', 'MAINTENANCE_REMINDER', 'WEEKLY_REPORT', 'MONTHLY_REPORT', 'CHALLENGE_START', 'CHALLENGE_ENDING', 'CLUB_OFFER', 'MARKETPLACE_MESSAGE', 'ROUTE_REQUEST', 'SUBSCRIPTION_EXPIRATION', 'REFERRAL_REWARD', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SCAM', 'WRONG_INFORMATION', 'ILLEGAL_CONTENT', 'SPAM', 'OFFENSIVE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWED', 'ACTION_TAKEN', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReportTargetType" AS ENUM ('MARKETPLACE_LISTING', 'ROUTE', 'PARTNER_OFFER', 'USER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ADMIN_LOGIN', 'USER_SUSPEND', 'USER_BAN', 'USER_RESTORE', 'OFFER_APPROVE', 'OFFER_REJECT', 'LISTING_APPROVE', 'LISTING_REMOVE', 'ROUTE_REMOVE', 'PAYMENT_VERIFIED', 'SUBSCRIPTION_CHANGED', 'SCORE_CHANGED', 'BROADCAST_SENT', 'SETTINGS_CHANGED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'DRIVER',
    "telegramId" BIGINT,
    "telegramUsername" TEXT,
    "telegramFirstName" TEXT,
    "telegramLastName" TEXT,
    "telegramPhotoUrl" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "driverType" "DriverType",
    "languageCode" TEXT NOT NULL DEFAULT 'uz',
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "referralCode" TEXT,
    "referredByTgId" BIGINT,
    "settings" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "driverType" "DriverType",
    "incomeTargetMonth" INTEGER,
    "primaryGoal" "PrimaryGoal",
    "level" "DriverLevel" NOT NULL DEFAULT 'ROOKIE',
    "xp" INTEGER NOT NULL DEFAULT 0,
    "privacy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cars" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "plate" TEXT,
    "vin" TEXT,
    "fuelType" "FuelType" NOT NULL,
    "mileageKms" INTEGER NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "car_documents" (
    "id" UUID NOT NULL,
    "carId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "carId" UUID NOT NULL,
    "serviceType" "MaintenanceType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mileageKms" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "provider" TEXT,
    "notes" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "nextDueMileage" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_records" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "carId" UUID,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "platform" "IncomePlatform" NOT NULL,
    "tripCount" INTEGER,
    "workSessionId" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "income_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_records" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "carId" UUID,
    "category" "ExpenseCategory" NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receiptUrl" TEXT,
    "workSessionId" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "status" "WorkSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "emoji" TEXT DEFAULT '🎯',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_transactions" (
    "id" UUID NOT NULL,
    "goalId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "goal_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_scores" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "components" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_score_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "component" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_levels" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "level" "DriverLevel" NOT NULL,
    "xpAtThatTime" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🏆',
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "category" "AchievementCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_achievements" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "achievementId" UUID NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "metric" "ChallengeMetric" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reward" TEXT,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_participants" (
    "id" UUID NOT NULL,
    "challengeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'JOINED',
    "resultValue" DOUBLE PRECISION,
    "rank" INTEGER,
    "optedOutLeaderboard" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "businessName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "category" TEXT,
    "description" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "workingHours" JSONB,
    "socialLinks" JSONB,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_offers" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discountText" TEXT,
    "category" "OfferCategory" NOT NULL DEFAULT 'OTHER',
    "imageUrl" TEXT,
    "validUntil" TIMESTAMP(3),
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_views" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "userId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_claims" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "couponCode" TEXT NOT NULL,
    "status" "ClaimStatus" NOT NULL DEFAULT 'CLAIMED',
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_redemptions" (
    "id" UUID NOT NULL,
    "claimId" UUID NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "offer_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_leads" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "offerId" UUID,
    "userId" UUID,
    "name" TEXT,
    "phone" TEXT,
    "source" TEXT NOT NULL DEFAULT 'offer',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" "MarketplaceCategorySlug" NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '🛒',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "marketplace_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "condition" "ListingCondition" NOT NULL,
    "location" TEXT,
    "contactPhone" TEXT,
    "status" "MarketplaceStatus" NOT NULL DEFAULT 'PENDING',
    "moderationNote" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_images" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "marketplace_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_favorites" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_reports" (
    "id" UUID NOT NULL,
    "listingId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "carId" UUID,
    "fromCity" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "departureTime" TEXT,
    "seatsAvailable" INTEGER NOT NULL,
    "price" INTEGER,
    "description" TEXT,
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_requests" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "status" "RouteRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_passengers" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_reviews" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "reviewerUserId" UUID NOT NULL,
    "reviewedUserId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrerId" UUID NOT NULL,
    "inviteeId" UUID NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rewardGrantedAt" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_rewards" (
    "id" UUID NOT NULL,
    "referralId" UUID NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "value" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'GRANTED',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "priceMonth" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'UZS',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "data" JSONB,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "telegramEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "enabled" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" UUID,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "authorRole" "UserRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "targetType" "ReportTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedBy" UUID,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "actorRole" "UserRole",
    "action" "AuditAction" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedBy" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramId_key" ON "users"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_onboardingDone_idx" ON "users"("onboardingDone");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_userId_key" ON "admin_users"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "cars_userId_idx" ON "cars"("userId");

-- CreateIndex
CREATE INDEX "maintenance_records_userId_date_idx" ON "maintenance_records"("userId", "date");

-- CreateIndex
CREATE INDEX "maintenance_records_carId_idx" ON "maintenance_records"("carId");

-- CreateIndex
CREATE INDEX "maintenance_records_nextDueDate_idx" ON "maintenance_records"("nextDueDate");

-- CreateIndex
CREATE INDEX "income_records_userId_date_idx" ON "income_records"("userId", "date");

-- CreateIndex
CREATE INDEX "income_records_platform_idx" ON "income_records"("platform");

-- CreateIndex
CREATE INDEX "expense_records_userId_date_idx" ON "expense_records"("userId", "date");

-- CreateIndex
CREATE INDEX "expense_records_category_date_idx" ON "expense_records"("category", "date");

-- CreateIndex
CREATE INDEX "work_sessions_userId_startedAt_idx" ON "work_sessions"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "work_sessions_status_idx" ON "work_sessions"("status");

-- CreateIndex
CREATE INDEX "goals_userId_status_idx" ON "goals"("userId", "status");

-- CreateIndex
CREATE INDEX "goal_transactions_goalId_date_idx" ON "goal_transactions"("goalId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "driver_scores_userId_key" ON "driver_scores"("userId");

-- CreateIndex
CREATE INDEX "driver_score_events_userId_createdAt_idx" ON "driver_score_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "driver_levels_userId_idx" ON "driver_levels"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "driver_achievements_userId_achievementId_key" ON "driver_achievements"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "challenges_status_startDate_idx" ON "challenges"("status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_participants_challengeId_userId_key" ON "challenge_participants"("challengeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "partners_userId_key" ON "partners"("userId");

-- CreateIndex
CREATE INDEX "partner_offers_partnerId_idx" ON "partner_offers"("partnerId");

-- CreateIndex
CREATE INDEX "partner_offers_status_idx" ON "partner_offers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "offer_claims_couponCode_key" ON "offer_claims"("couponCode");

-- CreateIndex
CREATE UNIQUE INDEX "offer_claims_offerId_userId_key" ON "offer_claims"("offerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "offer_redemptions_claimId_key" ON "offer_redemptions"("claimId");

-- CreateIndex
CREATE INDEX "partner_leads_partnerId_createdAt_idx" ON "partner_leads"("partnerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_categories_slug_key" ON "marketplace_categories"("slug");

-- CreateIndex
CREATE INDEX "marketplace_listings_userId_idx" ON "marketplace_listings"("userId");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_createdAt_idx" ON "marketplace_listings"("status", "createdAt");

-- CreateIndex
CREATE INDEX "marketplace_listings_categoryId_idx" ON "marketplace_listings"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_favorites_listingId_userId_key" ON "marketplace_favorites"("listingId", "userId");

-- CreateIndex
CREATE INDEX "routes_userId_idx" ON "routes"("userId");

-- CreateIndex
CREATE INDEX "routes_fromCity_toCity_idx" ON "routes"("fromCity", "toCity");

-- CreateIndex
CREATE UNIQUE INDEX "route_requests_routeId_userId_key" ON "route_requests"("routeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "route_passengers_routeId_userId_key" ON "route_passengers"("routeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_inviteeId_key" ON "referrals"("inviteeId");

-- CreateIndex
CREATE INDEX "referrals_referrerId_createdAt_idx" ON "referrals"("referrerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "referral_rewards_referralId_key" ON "referral_rewards"("referralId");

-- CreateIndex
CREATE INDEX "subscriptions_userId_status_idx" ON "subscriptions"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_externalId_key" ON "payments"("externalId");

-- CreateIndex
CREATE INDEX "payments_userId_createdAt_idx" ON "payments"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "admin_actions_createdAt_idx" ON "admin_actions"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_documents" ADD CONSTRAINT "car_documents_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_records" ADD CONSTRAINT "income_records_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "work_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_records" ADD CONSTRAINT "expense_records_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "work_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_transactions" ADD CONSTRAINT "goal_transactions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_scores" ADD CONSTRAINT "driver_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_score_events" ADD CONSTRAINT "driver_score_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_levels" ADD CONSTRAINT "driver_levels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_achievements" ADD CONSTRAINT "driver_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_achievements" ADD CONSTRAINT "driver_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_offers" ADD CONSTRAINT "partner_offers_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_views" ADD CONSTRAINT "offer_views_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "partner_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "partner_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_claims" ADD CONSTRAINT "offer_claims_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_redemptions" ADD CONSTRAINT "offer_redemptions_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "offer_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_leads" ADD CONSTRAINT "partner_leads_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "marketplace_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_images" ADD CONSTRAINT "marketplace_images_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_favorites" ADD CONSTRAINT "marketplace_favorites_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_favorites" ADD CONSTRAINT "marketplace_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_reports" ADD CONSTRAINT "marketplace_reports_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_requests" ADD CONSTRAINT "route_requests_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_requests" ADD CONSTRAINT "route_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_passengers" ADD CONSTRAINT "route_passengers_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_passengers" ADD CONSTRAINT "route_passengers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_reviews" ADD CONSTRAINT "route_reviews_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_actions" ADD CONSTRAINT "admin_actions_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

