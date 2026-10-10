import { describe, expect, it } from "vitest";
import {
  buildPostmortemRoomId,
  emptyTiptapDoc,
  isCanonicalContent,
  isPlainJsonValue,
  liveblocksAuthSchema,
  normalizeEditorJson,
  parsePostmortemRoomId,
  publishPostmortemSchema,
  saveDraftSchema,
} from "@/modules/postmortem/schema";

const validDoc = {
  type: "doc",
  content: [
    { type: "paragraph", content: [{ type: "text", text: "Summary" }] },
  ],
};

/** Builds a doc exactly like ProseMirror's toJSON: null-prototype attrs. */
function prosemirrorStyleDoc(): Record<string, unknown> {
  const attrs = Object.assign(Object.create(null), { level: 2 });
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs,
        content: [{ type: "text", text: "Title" }],
      },
      { type: "paragraph", content: [{ type: "text", text: "Body" }] },
    ],
  };
}

function collectProtos(value: unknown, acc: unknown[] = []): unknown[] {
  if (value !== null && typeof value === "object") {
    acc.push(Object.getPrototypeOf(value));
    for (const item of Object.values(value)) collectProtos(item, acc);
  }
  return acc;
}

function expectDeepPlain(value: unknown): void {
  for (const proto of collectProtos(value)) {
    expect(proto === Object.prototype || proto === Array.prototype).toBe(true);
  }
}

describe("postmortem content schema", () => {
  it("accepts a valid Tiptap document", () => {
    expect(
      saveDraftSchema.safeParse({
        content: validDoc,
        baseUpdatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it("rejects legacy seed-shaped content as a draft", () => {
    expect(
      saveDraftSchema.safeParse({
        content: {
          summary: "Pool exhausted",
          impact: "18 minutes",
          rootCause: "Misconfig",
          actionItems: ["Fix pool"],
        },
        baseUpdatedAt: new Date().toISOString(),
      }).success,
    ).toBe(false);
  });

  it("rejects legacy version-shaped content", () => {
    expect(
      publishPostmortemSchema.safeParse({
        content: { version: 1, notes: "Initial version." },
      }).success,
    ).toBe(false);
  });

  it("rejects empty and non-object content", () => {
    const base = { baseUpdatedAt: new Date().toISOString() };
    expect(saveDraftSchema.safeParse({ ...base, content: null }).success).toBe(
      false,
    );
    expect(
      saveDraftSchema.safeParse({ ...base, content: "text" }).success,
    ).toBe(false);
    expect(
      saveDraftSchema.safeParse({ ...base, content: { type: "paragraph" } })
        .success,
    ).toBe(false);
  });

  it("classifies canonical vs legacy content", () => {
    expect(isCanonicalContent(validDoc)).toBe(true);
    expect(isCanonicalContent(emptyTiptapDoc())).toBe(true);
    expect(isCanonicalContent({ summary: "x" })).toBe(false);
    expect(isCanonicalContent({ version: 1 })).toBe(false);
    expect(isCanonicalContent(null)).toBe(false);
  });
});

describe("normalizeEditorJson (ProseMirror transport safety)", () => {
  it("normalizes null-prototype attrs to plain objects with data preserved", () => {
    const raw = prosemirrorStyleDoc();
    const headingAttrs = (raw.content as unknown[])[0] as Record<
      string,
      unknown
    >;

    // Precondition: ProseMirror really emits null-prototype attrs here.
    expect(Object.getPrototypeOf(headingAttrs.attrs)).toBe(null);

    const normalized = normalizeEditorJson(raw);

    expect(normalized).not.toBeNull();
    expect(normalized).toEqual({
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Title" }],
        },
        { type: "paragraph", content: [{ type: "text", text: "Body" }] },
      ],
    });
    // Every nested value now has a plain prototype, so the flight encoder
    // can no longer turn it into an unreadable temporary reference.
    expectDeepPlain(normalized);
    expect(isPlainJsonValue(normalized)).toBe(true);
    expect(
      saveDraftSchema.safeParse({
        content: normalized,
        baseUpdatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it("accepts the empty canonical document", () => {
    const normalized = normalizeEditorJson(emptyTiptapDoc());
    expect(normalized).toEqual({ type: "doc", content: [] });
    expect(isCanonicalContent(normalized)).toBe(true);
  });

  it("returns null for non-object input", () => {
    expect(normalizeEditorJson(null)).toBeNull();
    expect(normalizeEditorJson("text")).toBeNull();
    expect(normalizeEditorJson([{ type: "doc" }])).toBeNull();
  });
});

describe("postmortem room helpers", () => {
  it("builds a server-derived room id", () => {
    expect(buildPostmortemRoomId("abc123")).toBe("postmortem:abc123");
  });

  it("parses a valid room id", () => {
    expect(parsePostmortemRoomId("postmortem:abc123")).toBe("abc123");
  });

  it("rejects rooms outside the postmortem namespace", () => {
    expect(parsePostmortemRoomId("workspace:abc")).toBeNull();
    expect(parsePostmortemRoomId("postmortem:")).toBeNull();
    expect(parsePostmortemRoomId("postmortem:a:b")).toBeNull();
    expect(parsePostmortemRoomId("postmortem:a/b")).toBeNull();
    expect(parsePostmortemRoomId("other")).toBeNull();
  });

  it("validates the liveblocks auth payload", () => {
    expect(
      liveblocksAuthSchema.safeParse({ postmortemId: "abc" }).success,
    ).toBe(true);
    expect(
      liveblocksAuthSchema.safeParse({ room: "postmortem:abc" }).success,
    ).toBe(true);
    expect(liveblocksAuthSchema.safeParse({}).success).toBe(true);
  });
});
