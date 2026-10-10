"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { renameWorkspace } from "../actions";
import { type RenameWorkspaceSchema, renameWorkspaceSchema } from "../schema";

export type RenameWorkspaceSuccess = {
  name: string;
  slug: string;
};

type RenameWorkspaceFormProps = {
  workspaceId: string;
  currentName: string;
  onSuccess?: (result: RenameWorkspaceSuccess) => void;
  onCancel?: () => void;
};

export function RenameWorkspaceForm({
  workspaceId,
  currentName,
  onSuccess,
  onCancel,
}: RenameWorkspaceFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<RenameWorkspaceSchema>({
    resolver: zodResolver(renameWorkspaceSchema),
    defaultValues: {
      name: currentName,
    },
  });

  function onSubmit(data: RenameWorkspaceSchema) {
    startTransition(async () => {
      const result = await renameWorkspace({ workspaceId, name: data.name });

      if (!result.success) {
        toast.add({
          type: "error",
          description: result.error,
          priority: "high",
        });
        return;
      }

      toast.add({ type: "success", description: "Workspace renamed." });
      router.refresh();
      onSuccess?.({ name: result.name, slug: result.slug });
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-3">
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <>
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="workspace-name">Workspace name</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  disabled={isPending}
                  id="workspace-name"
                  maxLength={100}
                  placeholder="Workspace name"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
              <Field>
                <div className="flex justify-end gap-2">
                  {onCancel ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isPending}
                      onClick={onCancel}
                    >
                      Cancel
                    </Button>
                  ) : null}
                  <Button type="submit" disabled={isPending}>
                    {isPending ? <Spinner /> : "Save changes"}
                  </Button>
                </div>
              </Field>
            </>
          )}
        />
      </FieldGroup>
    </form>
  );
}
