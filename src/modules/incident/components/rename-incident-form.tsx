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
import { renameIncident } from "../actions";
import { type RenameIncidentSchema, renameIncidentSchema } from "../schema";

type RenameIncidentFormProps = {
  incidentId: string;
  workspaceId: string;
  currentTitle: string;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function RenameIncidentForm({
  incidentId,
  workspaceId,
  currentTitle,
  onSuccess,
  onCancel,
}: RenameIncidentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<RenameIncidentSchema>({
    resolver: zodResolver(renameIncidentSchema),
    defaultValues: {
      title: currentTitle,
    },
  });

  function onSubmit(data: RenameIncidentSchema) {
    startTransition(async () => {
      const result = await renameIncident({ incidentId, workspaceId }, data);

      if (!result.success) {
        toast.add({
          type: "error",
          description: result.error,
          priority: "high",
        });
        return;
      }

      toast.add({ type: "success", description: "Incident renamed." });
      router.refresh();
      onSuccess?.();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-3">
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <>
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="incident-title">Incident title</FieldLabel>
                <Input
                  {...field}
                  aria-invalid={fieldState.invalid}
                  disabled={isPending}
                  id="incident-title"
                  maxLength={150}
                  placeholder="Incident title"
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
