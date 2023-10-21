-- CreateTable
CREATE TABLE "NocLine" (
    "id" SERIAL NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "nocCode" TEXT NOT NULL,
    "publicName" TEXT NOT NULL,
    "referenceName" TEXT NOT NULL,

    CONSTRAINT "NocLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NocLine_lineNo_key" ON "NocLine"("lineNo");
