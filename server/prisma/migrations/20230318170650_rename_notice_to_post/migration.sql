/*
  Warnings:

  - You are about to drop the `Notice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NoticeImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Notice" DROP CONSTRAINT "Notice_feedId_fkey";

-- DropForeignKey
ALTER TABLE "Notice" DROP CONSTRAINT "Notice_userId_fkey";

-- DropForeignKey
ALTER TABLE "NoticeImage" DROP CONSTRAINT "NoticeImage_noticeId_fkey";

-- DropTable
DROP TABLE "Notice";

-- DropTable
DROP TABLE "NoticeImage";

-- CreateTable
CREATE TABLE "Post" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "feedId" INTEGER NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostImage" (
    "id" SERIAL NOT NULL,
    "minimize" TEXT NOT NULL,
    "oversize" TEXT NOT NULL,
    "vertical" BOOLEAN NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "noticeId" INTEGER NOT NULL,

    CONSTRAINT "PostImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostImage" ADD CONSTRAINT "PostImage_noticeId_fkey" FOREIGN KEY ("noticeId") REFERENCES "Post"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
