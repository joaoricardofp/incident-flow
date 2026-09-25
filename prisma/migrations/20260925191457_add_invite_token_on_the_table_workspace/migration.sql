/*
  Warnings:

  - A unique constraint covering the columns `[inviteToken]` on the table `workspace` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `inviteToken` to the `workspace` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "workspace" ADD COLUMN     "inviteToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "workspace_inviteToken_key" ON "workspace"("inviteToken");
