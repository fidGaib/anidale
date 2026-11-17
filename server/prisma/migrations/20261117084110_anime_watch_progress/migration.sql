-- CreateTable
CREATE TABLE "AnimeWatchProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "releaseId" INTEGER NOT NULL,
    "episodeId" INTEGER NOT NULL,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnimeWatchProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnimeWatchProgress_userId_updatedAt_idx" ON "AnimeWatchProgress"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeWatchProgress_userId_releaseId_key" ON "AnimeWatchProgress"("userId", "releaseId");

-- AddForeignKey
ALTER TABLE "AnimeWatchProgress" ADD CONSTRAINT "AnimeWatchProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeWatchProgress" ADD CONSTRAINT "AnimeWatchProgress_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "AnimeRelease"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeWatchProgress" ADD CONSTRAINT "AnimeWatchProgress_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "AnimeEpisode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
