/*
  Warnings:

  - You are about to drop the column `isPopular` on the `CreditPackage` table. All the data in the column will be lost.
  - You are about to drop the column `keyPoints` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `milvusCollectionId` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `sentiment` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `topics` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `balance` on the `UserCredit` table. All the data in the column will be lost.
  - You are about to drop the `Template` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TemplateGeneration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Template" DROP CONSTRAINT "Template_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TemplateGeneration" DROP CONSTRAINT "TemplateGeneration_templateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TemplateGeneration" DROP CONSTRAINT "TemplateGeneration_userId_fkey";

-- AlterTable
ALTER TABLE "CreditPackage" DROP COLUMN "isPopular";

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "keyPoints",
DROP COLUMN "milvusCollectionId",
DROP COLUMN "sentiment",
DROP COLUMN "summary",
DROP COLUMN "topics",
ADD COLUMN     "deleteAt" TIMESTAMP(3),
ADD COLUMN     "isTemplate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "UserCredit" DROP COLUMN "balance";

-- DropTable
DROP TABLE "public"."Template";

-- DropTable
DROP TABLE "public"."TemplateGeneration";

-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlugin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlugin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plugin_slug_key" ON "Plugin"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlugin_userId_pluginId_key" ON "UserPlugin"("userId", "pluginId");

-- AddForeignKey
ALTER TABLE "UserPlugin" ADD CONSTRAINT "UserPlugin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlugin" ADD CONSTRAINT "UserPlugin_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
