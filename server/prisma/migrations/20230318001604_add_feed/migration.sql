/*
  Warnings:

  - A unique constraint covering the columns `[feedId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `feedId` to the `Notice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `feedId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Notice" ADD COLUMN     "feedId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "feedId" INTEGER;

-- CreateTable
CREATE TABLE "Feed" (
    "id" SERIAL NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "Feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_feedId_key" ON "User"("feedId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notice" ADD CONSTRAINT "Notice_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

WITH "new_feed" AS (
  INSERT INTO "Feed" ("userId") SELECT id FROM "User" RETURNING id
)
UPDATE "User" SET "feedId" = new_feed.id FROM new_feed WHERE "User".id = new_feed.id;

-- Обновляем поле feedId в таблице Notice
UPDATE "Notice" SET "feedId" = "User"."feedId" FROM "User" WHERE "Notice"."userId" = "User".id;

ALTER TABLE "User" ALTER COLUMN "feedId" SET NOT NULL;
ALTER TABLE "Notice" ALTER COLUMN "feedId" SET NOT NULL;