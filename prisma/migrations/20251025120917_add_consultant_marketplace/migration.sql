-- CreateTable
CREATE TABLE "ConsultantCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT DEFAULT '#3B82F6',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT,
    "profileImage" TEXT,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "education" TEXT,
    "certifications" JSONB,
    "languages" JSONB,
    "categoryId" TEXT NOT NULL,
    "specializations" JSONB,
    "licenseNumber" TEXT,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "availability" JSONB,
    "responseTime" TEXT,
    "consultationTypes" JSONB,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationDate" TIMESTAMP(3),
    "verificationDocs" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "completedBookings" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantSlot" (
    "id" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantBooking" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "sessionDate" TIMESTAMP(3) NOT NULL,
    "sessionDuration" INTEGER NOT NULL DEFAULT 60,
    "sessionType" TEXT NOT NULL,
    "sessionUrl" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "documents" JSONB,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cancellationReason" TEXT,
    "meetingNotes" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantReview" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "consultantId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "professionalismRating" INTEGER,
    "communicationRating" INTEGER,
    "expertiseRating" INTEGER,
    "timelinessRating" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantPayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "paymentMethod" TEXT NOT NULL,
    "merchantCode" TEXT NOT NULL,
    "merchantName" TEXT NOT NULL,
    "transactionId" TEXT,
    "paymentUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paidAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "gatewayResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantCategory_name_key" ON "ConsultantCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Consultant_userId_key" ON "Consultant"("userId");

-- CreateIndex
CREATE INDEX "Consultant_categoryId_idx" ON "Consultant"("categoryId");

-- CreateIndex
CREATE INDEX "Consultant_isVerified_status_idx" ON "Consultant"("isVerified", "status");

-- CreateIndex
CREATE INDEX "Consultant_averageRating_idx" ON "Consultant"("averageRating");

-- CreateIndex
CREATE INDEX "ConsultantSlot_consultantId_dayOfWeek_idx" ON "ConsultantSlot"("consultantId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "ConsultantBooking_clientId_idx" ON "ConsultantBooking"("clientId");

-- CreateIndex
CREATE INDEX "ConsultantBooking_consultantId_idx" ON "ConsultantBooking"("consultantId");

-- CreateIndex
CREATE INDEX "ConsultantBooking_sessionDate_idx" ON "ConsultantBooking"("sessionDate");

-- CreateIndex
CREATE INDEX "ConsultantBooking_status_idx" ON "ConsultantBooking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantReview_bookingId_key" ON "ConsultantReview"("bookingId");

-- CreateIndex
CREATE INDEX "ConsultantReview_consultantId_idx" ON "ConsultantReview"("consultantId");

-- CreateIndex
CREATE INDEX "ConsultantReview_rating_idx" ON "ConsultantReview"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantPayment_bookingId_key" ON "ConsultantPayment"("bookingId");

-- CreateIndex
CREATE INDEX "ConsultantPayment_status_idx" ON "ConsultantPayment"("status");

-- CreateIndex
CREATE INDEX "ConsultantPayment_transactionId_idx" ON "ConsultantPayment"("transactionId");

-- AddForeignKey
ALTER TABLE "Consultant" ADD CONSTRAINT "Consultant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultant" ADD CONSTRAINT "Consultant_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ConsultantCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantSlot" ADD CONSTRAINT "ConsultantSlot_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantBooking" ADD CONSTRAINT "ConsultantBooking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantBooking" ADD CONSTRAINT "ConsultantBooking_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantReview" ADD CONSTRAINT "ConsultantReview_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ConsultantBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantReview" ADD CONSTRAINT "ConsultantReview_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantReview" ADD CONSTRAINT "ConsultantReview_consultantId_fkey" FOREIGN KEY ("consultantId") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantPayment" ADD CONSTRAINT "ConsultantPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ConsultantBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
