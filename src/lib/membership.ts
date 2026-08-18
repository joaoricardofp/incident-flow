import type { Role } from "@/generated/prisma/enums";
import prisma from "./prisma";
import { cache } from "react";

type MembershipParams = {
  userId: string;
  workspaceId: string;
};

type RequireMembershipParams = MembershipParams & {
  minRole: Role;
};

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export const getMembership = cache(
  async ({
    userId,
    workspaceId,
  }: MembershipParams): Promise<{ role: Role } | null> => {
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
  },
);

const roleLevel: Record<Role, number> = {
  VIEWER: 1,
  ADMIN: 2,
};

export function hasMinimumRole({
  role,
  minRole,
}: {
  role: Role;
  minRole: Role;
}): boolean {
  return roleLevel[role] >= roleLevel[minRole];
}

export async function requireMembership({
  userId,
  workspaceId,
  minRole,
}: RequireMembershipParams): Promise<{ role: Role }> {
  const membership = await getMembership({ userId, workspaceId });

  if (!membership)
    throw new AuthorizationError("User is not a member of this workspace");

  if (!hasMinimumRole({ role: membership.role, minRole }))
    throw new AuthorizationError("User does not have the required role");

  return membership;
}
