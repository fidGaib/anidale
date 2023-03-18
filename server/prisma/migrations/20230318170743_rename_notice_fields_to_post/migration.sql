/*
  Warnings:

  - You are about to drop the column `noticeId` on the `PostImage` table. All the data in the column will be lost.
  - Added the required column `postId` to the `PostImage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PostImage" DROP CONSTRAINT "PostImage_noticeId_fkey";

-- AlterTable
ALTER TABLE "PostImage" DROP COLUMN "noticeId",
ADD COLUMN     "postId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
