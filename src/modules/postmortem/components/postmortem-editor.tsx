"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react";
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { type Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { Text } from "@/components/ui/typography";
import {
  publishPostmortem,
  savePostmortemDraft,
} from "@/modules/postmortem/actions";
import {
  isCanonicalContent,
  normalizeEditorJson,
} from "@/modules/postmortem/schema";

type PostmortemEditorProps = {
  roomId: string;
  postmortemId: string;
  workspaceId: string;
  initialContent: unknown;
  baseUpdatedAt: string;
  canEdit: boolean;
};

function Toolbar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={!editor.can().chain().focus().toggleBold().run()}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Bold
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Italic
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        List
      </Button>
    </div>
  );
}

function CollaborativeTiptap({
  postmortemId,
  workspaceId,
  initialContent,
  baseUpdatedAt,
  canEdit,
}: Omit<PostmortemEditorProps, "roomId">) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [base, setBase] = useState(baseUpdatedAt);
  const canonical = isCanonicalContent(initialContent)
    ? initialContent
    : undefined;

  type ExtensionOptions = NonNullable<
    Parameters<typeof useLiveblocksExtension>[0]
  >;
  const liveblocksExtension = useLiveblocksExtension({
    initialContent: canonical as ExtensionOptions["initialContent"],
  });
  const editor = useEditor({
    extensions: [StarterKit, liveblocksExtension],
    editable: canEdit,
  });

  function snapshot(): Record<string, unknown> | null {
    if (!editor) return null;
    try {
      // ProseMirror builds node attrs as null-prototype objects, which the
      // flight encoder silently turns into unreadable references in Server
      // Action args. Normalize to plain JSON so save/publish transport the
      // exact persistable document. Server validation stays strict.
      return normalizeEditorJson(editor.getJSON());
    } catch {
      return null;
    }
  }

  function handleSave() {
    const content = snapshot();
    if (!content) {
      toast.add({ type: "error", description: "Editor is not ready yet." });
      return;
    }
    startTransition(async () => {
      const result = await savePostmortemDraft(
        { postmortemId, workspaceId },
        { content, baseUpdatedAt: base },
      );
      if (!result.success) {
        toast.add({
          type: "error",
          description: result.error,
          priority: "high",
        });
        return;
      }
      if (result.updatedAt) setBase(result.updatedAt);
      toast.add({ type: "success", description: "Draft saved." });
      router.refresh();
    });
  }

  function handlePublish() {
    const content = snapshot();
    if (!content) {
      toast.add({ type: "error", description: "Editor is not ready yet." });
      return;
    }
    startTransition(async () => {
      const result = await publishPostmortem(
        { postmortemId, workspaceId },
        { content, baseUpdatedAt: base },
      );
      if (!result.success) {
        toast.add({
          type: "error",
          description: result.error,
          priority: "high",
        });
        return;
      }
      if (result.updatedAt) setBase(result.updatedAt);
      toast.add({ type: "success", description: "Postmortem published." });
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
      {!isCanonicalContent(initialContent) && (
        <div className="border-b border-border bg-muted px-4 py-2">
          <Text variant="small" className="mt-0">
            This postmortem was created in a legacy format. A blank document is
            shown for editing; the original content remains available in version
            history below.
          </Text>
        </div>
      )}
      {!canEdit && (
        <div className="border-b border-border bg-muted px-4 py-2">
          <Text variant="small" className="mt-0">
            You have read-only access to this postmortem.
          </Text>
        </div>
      )}
      {canEdit && <Toolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="min-h-64 px-4 py-3 [&_.tiptap]:min-h-56 [&_.tiptap]:outline-none"
      />
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? <Spinner /> : "Save draft"}
          </Button>
          <Button
            variant="outline"
            onClick={handlePublish}
            disabled={isPending}
          >
            {isPending ? <Spinner /> : "Publish"}
          </Button>
          <Text variant="muted" className="mt-0 ml-auto text-xs">
            Drafts save to PostgreSQL; publishing snapshots a version.
          </Text>
        </div>
      )}
    </div>
  );
}

export function PostmortemEditor(props: PostmortemEditorProps) {
  const { roomId, ...rest } = props;
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks/auth">
      <RoomProvider id={roomId} initialPresence={{}}>
        <ClientSideSuspense
          fallback={
            <div className="rounded-xl px-4 py-8 ring-1 ring-foreground/10">
              <Text variant="muted" className="mt-0 text-sm">
                Loading collaborative editor…
              </Text>
            </div>
          }
        >
          {() => <CollaborativeTiptap {...rest} />}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  );
}
