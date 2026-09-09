-- CreateTable
CREATE TABLE "car_mileage_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "carId" UUID NOT NULL,
    "mileageKms" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "car_mileage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "car_mileage_logs_carId_date_idx" ON "car_mileage_logs"("carId", "date");

-- AddForeignKey
ALTER TABLE "car_mileage_logs" ADD CONSTRAINT "car_mileage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "car_mileage_logs" ADD CONSTRAINT "car_mileage_logs_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
