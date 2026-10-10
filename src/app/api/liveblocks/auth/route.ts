import { Liveblocks } from "@liveblocks/node";
import { getSession } from "@/lib/auth";
import { requireMembership } from "@/lib/membership";
import prisma from "@/lib/prisma";
import {
  buildPostmortemRoomId,
  liveblocksAuthSchema,
  parsePostmortemRoomId,
} from "@/modules/postmortem/schema";

function json(status: number, body: Record<string, string>) {
  return Response.json(body, { status });
}

/**
 * Liveblocks auth endpoint.
 *
 * Each request re-validates session + current membership + role and the
 * Postmortem -> Incident -> Workspace binding. Room ids are derived on the
 * server (`postmortem:<postmortemId>`); a client-supplied room is only
 * accepted when it exactly matches the derived room.
 *
 * NOTE on revocation: permissions are evaluated at (re)authorize time, so a
 * demoted/removed member is rejected on the next connect/reconnect. An
 * already-open socket keeps its previously issued token until it expires or
 * disconnects (Liveblocks service limitation). Server Actions still enforce
 * authorization independently, so a lingering socket cannot persist or
 * publish.
 */
export async function POST(request: Request) {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    return json(500, { error: "Liveblocks is not configured" });
  }

  const session = await getSession();
  if (!session) {
    return json(401, { error: "Unauthorized" });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Invalid request body" });
  }

  const parsed = liveblocksAuthSchema.safeParse(payload);
  if (!parsed.success) {
    return json(400, { error: "Invalid request body" });
  }

  let postmortemId = parsed.data.postmortemId ?? null;
  if (parsed.data.room) {
    const fromRoom = parsePostmortemRoomId(parsed.data.room);
    if (!fromRoom) {
      return json(403, { error: "Forbidden" });
    }
    if (postmortemId && postmortemId !== fromRoom) {
      return json(403, { error: "Forbidden" });
    }
    postmortemId = fromRoom;
  }
  if (!postmortemId) {
    return json(400, { error: "Invalid request body" });
  }

  try {
    const postmortem = await prisma.postmortem.findUnique({
      where: { id: postmortemId },
      select: {
        id: true,
        incident: { select: { workspaceId: true } },
      },
    });
    if (!postmortem) {
      // Hide existence across workspaces: unknown or foreign rooms are 404.
      return json(404, { error: "Not found" });
    }

    let role: "ADMIN" | "VIEWER";
    try {
      const membership = await requireMembership({
        userId: session.user.id,
        workspaceId: postmortem.incident.workspaceId,
        minRole: "VIEWER",
      });
      role = membership.role;
    } catch {
      return json(404, { error: "Not found" });
    }

    const room = buildPostmortemRoomId(postmortem.id);
    const liveblocks = new Liveblocks({ secret });
    const liveblocksSession = liveblocks.prepareSession(session.user.id, {
      userInfo: { name: session.user.name },
    });
    liveblocksSession.allow(room, role === "ADMIN" ? ["*:write"] : ["*:read"]);

    const { status, body } = await liveblocksSession.authorize();
    return new Response(body, { status });
  } catch (error) {
    // Infra failure (e.g. transient database outage): explicit JSON instead
    // of an empty 500 so the Liveblocks client error stays diagnosable and
    // authorization semantics are unchanged (still no token issued).
    console.error("[liveblocks-auth] unexpected error", error);
    return json(503, { error: "Liveblocks authentication unavailable" });
  }
}
