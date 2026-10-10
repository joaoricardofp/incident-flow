import { z } from "zod";

/**
 * Canonical postmortem content is a Tiptap JSON document.
 * Legacy records (e.g. seed data with `{ summary, ... }` or
 * `{ version, notes }`) are intentionally NOT coerced: they remain
 * readable via version history but are never loaded as editable drafts.
 */
export const tiptapDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(z.unknown()).optional(),
});

export type TiptapDoc = z.infer<typeof tiptapDocSchema>;

export function isCanonicalContent(content: unknown): content is TiptapDoc {
  return tiptapDocSchema.safeParse(content).success;
}

export function emptyTiptapDoc(): TiptapDoc {
  return { type: "doc", content: [] };
}

/**
 * Deep plain-JSON check for Server Action payloads.
 *
 * ProseMirror/Tiptap build node attrs as null-prototype objects, and the
 * Next.js flight encoder silently converts null-prototype values (as well as
 * functions/symbols) into unreadable temporary references in Server Action
 * args. Such values survive Zod `unknown` passthrough and `JSON.stringify`,
 * but explode when Prisma walks the value. Only null/undefined, JSON
 * scalars, plain arrays and `Object.prototype`-or-null-prototype objects are
 * accepted. Every operation used here is safe on such references (no property
 * reads that can throw), and cycles are rejected instead of recursed forever.
 */
export function isPlainJsonValue(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): boolean {
  if (value === null || value === undefined) return true;
  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean") {
    return true;
  }
  if (type !== "object") return false;
  if (seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.every((item) => isPlainJsonValue(item, seen));
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(value).every((item) => isPlainJsonValue(item, seen));
}

/**
 * Normalizes editor JSON into plain-prototype JSON for transport.
 *
 * Must run on Tiptap/ProseMirror output before sending it through Server
 * Actions: node attrs arrive with null prototypes and would otherwise be
 * converted into unreadable flight references. The round-trip preserves
 * every persistable value; values with no JSON representation (functions,
 * symbols) cannot be stored in PostgreSQL jsonb anyway. Never throws:
 * returns null when the input cannot be represented as a JSON object.
 */
export function normalizeEditorJson(
  value: unknown,
): Record<string, unknown> | null {
  try {
    const normalized: unknown = JSON.parse(JSON.stringify(value));
    if (
      typeof normalized !== "object" ||
      normalized === null ||
      Array.isArray(normalized)
    ) {
      return null;
    }
    return normalized as Record<string, unknown>;
  } catch {
    return null;
  }
}

const contentField = z.unknown().refine(
  (value) => {
    if (typeof value !== "object" || value === null) return false;
    if (!isPlainJsonValue(value)) return false;
    const text = JSON.stringify(value);
    if (text.length < 2 || text.length > 200_000) return false;
    return isCanonicalContent(value);
  },
  { message: "Content must be a valid Tiptap document" },
);

export const createPostmortemSchema = z.object({
  incidentId: z.string().min(1),
  content: contentField.optional(),
});

export type CreatePostmortemSchema = z.infer<typeof createPostmortemSchema>;

export const saveDraftSchema = z.object({
  content: contentField,
  baseUpdatedAt: z.string().datetime(),
});

export type SaveDraftSchema = z.infer<typeof saveDraftSchema>;

export const publishPostmortemSchema = z.object({
  content: contentField,
  baseUpdatedAt: z.string().datetime().optional(),
});

export type PublishPostmortemSchema = z.infer<typeof publishPostmortemSchema>;

export const liveblocksAuthSchema = z.object({
  postmortemId: z.string().min(1).optional(),
  room: z.string().min(1).optional(),
});

export type LiveblocksAuthSchema = z.infer<typeof liveblocksAuthSchema>;

/** Server-derived room id. Never accept a client-provided room as-is. */
export function buildPostmortemRoomId(postmortemId: string): string {
  return `postmortem:${postmortemId}`;
}

/** Extract the postmortem id from a room id of the form `postmortem:<id>`. */
export function parsePostmortemRoomId(room: string): string | null {
  const prefix = "postmortem:";
  if (!room.startsWith(prefix)) return null;
  const id = room.slice(prefix.length);
  if (!id || id.includes(":") || id.includes("/") || id.includes(" ")) {
    return null;
  }
  return id;
}
