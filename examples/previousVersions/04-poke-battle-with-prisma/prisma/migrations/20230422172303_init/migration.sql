-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Battle" (
    "id" TEXT NOT NULL,
    "log" JSONB[],
    "playerId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "winner" BOOLEAN NOT NULL,
    "pokemon1" TEXT NOT NULL,
    "pokemon2" TEXT NOT NULL,
    "winnerName" TEXT NOT NULL,
    "loserName" TEXT NOT NULL,
    "isDraw" BOOLEAN NOT NULL,

    CONSTRAINT "Battle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
