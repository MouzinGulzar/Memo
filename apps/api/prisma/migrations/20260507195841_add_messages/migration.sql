-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "userPhone" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT,
    "mediaUrl" TEXT,
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
