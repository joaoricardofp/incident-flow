"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createTimelineComment } from "../actions";
import { type TimelineCommentSchema, timelineCommentSchema } from "../schema";

type CreateCommentFormProps = {
  incidentId: string;
  workspaceId: string;
  onSuccess: () => void;
};

type CreateCommentFormValues = z.input<typeof timelineCommentSchema>;

export function CreateCommentForm({
  incidentId,
  workspaceId,
  onSuccess,
}: CreateCommentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<
    CreateCommentFormValues,
    undefined,
    TimelineCommentSchema
  >({
    resolver: zodResolver(timelineCommentSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: TimelineCommentSchema) {
    startTransition(async () => {
      const result = await createTimelineComment(
        { incidentId, workspaceId },
        data,
      );

      if (!result.success) {
        toast.add({
          type: "error",
          description: result.error,
          priority: "high",
        });
        return;
      }

      form.reset();
      router.refresh();
      onSuccess();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="message"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="timeline-comment-message">
                Comment
              </FieldLabel>
              <Textarea
                {...field}
                aria-invalid={fieldState.invalid}
                disabled={isPending}
                id="timeline-comment-message"
                placeholder="Add a comment"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner /> : "Comment"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
