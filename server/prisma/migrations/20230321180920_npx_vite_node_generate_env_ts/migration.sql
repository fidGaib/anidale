/*
  Warnings:

  - You are about to drop the column `minimize` on the `PostImage` table. All the data in the column will be lost.
  - You are about to drop the column `oversize` on the `PostImage` table. All the data in the column will be lost.
  - Added the required column `high` to the `PostImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `medium` to the `PostImage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `small` to the `PostImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PostImage" DROP COLUMN "minimize",
DROP COLUMN "oversize",
ADD COLUMN     "high" TEXT NOT NULL,
ADD COLUMN     "medium" TEXT NOT NULL,
ADD COLUMN     "small" TEXT NOT NULL;
