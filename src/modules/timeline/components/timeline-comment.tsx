import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Text } from "@/components/ui/typography";
import type { CommentTimelineItem } from "../queries";

type TimelineCommentProps = {
  item: CommentTimelineItem;
};

export function TimelineComment({ item }: TimelineCommentProps) {
  const authorName = item.author?.name ?? "Deleted user";

  return (
    <article className="relative flex gap-3 pl-1 before:absolute before:top-8 before:bottom-[-1.5rem] before:left-4 before:w-px before:bg-border last:before:hidden">
      <Avatar size="sm" className="relative shrink-0 ring-4 ring-card">
        <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border bg-muted/50 px-3 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium">{authorName}</span>
          <time
            className="text-xs text-muted-foreground"
            dateTime={item.createdAt.toISOString()}
          >
            {item.createdAt.toLocaleDateString()}
          </time>
        </div>
        <div>
          <Text className="text-sm leading-6">{item.message}</Text>
        </div>
      </div>
    </article>
  );
}
