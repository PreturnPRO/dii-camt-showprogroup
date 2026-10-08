CREATE TABLE "IssuedDocument" (
  "id" SERIAL NOT NULL,
  "kind" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "issuedById" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "IssuedDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IssuedDocument_token_key" ON "IssuedDocument"("token");
CREATE INDEX "IssuedDocument_subjectId_kind_idx" ON "IssuedDocument"("subjectId", "kind");
