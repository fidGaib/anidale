/*
  Warnings:

  - Added the required column `type` to the `PostImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PostImage" ADD COLUMN     "type" TEXT NOT NULL;
