"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { Status } from "@/generated/prisma/enums";
import { formatEnum } from "@/lib/format-enum";
import { updateIncidentStatus } from "../actions";
import { type UpdateStatusSchema, updateStatusSchema } from "../schema";

type UpdateStatusControlProps = {
  incidentId: string;
  workspaceId: string;
  currentStatus: Status;
};

export function UpdateStatusControl({
  incidentId,
  workspaceId,
  currentStatus,
}: UpdateStatusControlProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateStatusSchema>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      status: currentStatus,
    },
  });
  const { reset } = form;

  useEffect(() => {
    reset({ status: currentStatus });
  }, [currentStatus, reset]);

  const selectedStatus = form.watch("status");
  const statusOptions = Object.values(Status);

  function onSubmit(data: UpdateStatusSchema) {
    startTransition(async () => {
      const result = await updateIncidentStatus(
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

      if (result.noop) {
        toast.add({
          type: "info",
          description: "The status has already been updated by someone else",
        });
      }

      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-3">
        <Controller
          control={form.control}
          name="status"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="incident-status">Status</FieldLabel>
              <Select
                value={formatEnum(field.value)}
                onValueChange={field.onChange}
                disabled={isPending}
              >
                <SelectTrigger
                  aria-invalid={fieldState.invalid}
                  id="incident-status"
                  className="w-full"
                >
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {formatEnum(status)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Field className="items-end">
          <Button
            type="submit"
            disabled={
              isPending ||
              !selectedStatus ||
              selectedStatus === currentStatus
            }
          >
            {isPending ? <Spinner /> : "Update status"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
