import { Role } from "@/generated/prisma/enums";
import prisma from "./prisma";

type MembershipParams = {
  userId: string;
  workspaceId: string;
};

type RequireMembershipParams = MembershipParams & {
  minRole: Role;
};

export async function getMembership({
  userId,
  workspaceId,
}: MembershipParams): Promise<{ role: Role } | null> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });

  if (!membership) return null;

  return {
    role: membership.role,
  };
}

export async function requireMembership({
  userId,
  workspaceId,
  minRole,
}: RequireMembershipParams): Promise<{ role: Role }> {
  const membership = await getMembership({ userId, workspaceId });

  if (!membership) throw new Error("User is not a member of this workspace");

  if (membership.role !== minRole)
    throw new Error("User does not have the required role");

  return membership;
}
