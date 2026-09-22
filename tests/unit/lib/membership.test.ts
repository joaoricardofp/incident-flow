import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "@/generated/prisma/enums";

vi.mock("@/lib/prisma", () => ({
  default: {
    membership: {
      findUnique: vi.fn(),
    },
  },
}));

import {
  AuthorizationError,
  getMembership,
  hasMinimumRole,
  requireMembership,
} from "@/lib/membership";
import prisma from "@/lib/prisma";

const findUnique = vi.mocked(prisma.membership.findUnique);

describe("membership authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats ADMIN as stronger than VIEWER", () => {
    expect(hasMinimumRole({ role: Role.ADMIN, minRole: Role.ADMIN })).toBe(
      true,
    );
    expect(hasMinimumRole({ role: Role.ADMIN, minRole: Role.VIEWER })).toBe(
      true,
    );
    expect(hasMinimumRole({ role: Role.VIEWER, minRole: Role.VIEWER })).toBe(
      true,
    );
    expect(hasMinimumRole({ role: Role.VIEWER, minRole: Role.ADMIN })).toBe(
      false,
    );
  });

  it("rejects invalid role values", () => {
    expect(
      hasMinimumRole({
        role: "INVALID" as Role,
        minRole: Role.VIEWER,
      }),
    ).toBe(false);
    expect(
      hasMinimumRole({
        role: Role.ADMIN,
        minRole: "INVALID" as Role,
      }),
    ).toBe(false);
  });

  it("returns the role for an existing membership", async () => {
    findUnique.mockResolvedValue({ role: Role.ADMIN } as never);

    await expect(
      getMembership({ userId: "user-1", workspaceId: "workspace-1" }),
    ).resolves.toEqual({ role: Role.ADMIN });
  });

  it("returns null when the user has no membership", async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      getMembership({ userId: "user-2", workspaceId: "workspace-2" }),
    ).resolves.toBeNull();
  });

  it("allows a member whose role meets the minimum", async () => {
    findUnique.mockResolvedValue({ role: Role.ADMIN } as never);

    await expect(
      requireMembership({
        userId: "user-3",
        workspaceId: "workspace-3",
        minRole: Role.VIEWER,
      }),
    ).resolves.toEqual({ role: Role.ADMIN });
  });

  it("throws AuthorizationError for a missing membership", async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      requireMembership({
        userId: "user-4",
        workspaceId: "workspace-4",
        minRole: Role.VIEWER,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("throws AuthorizationError for an insufficient role", async () => {
    findUnique.mockResolvedValue({ role: Role.VIEWER } as never);

    await expect(
      requireMembership({
        userId: "user-5",
        workspaceId: "workspace-5",
        minRole: Role.ADMIN,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
