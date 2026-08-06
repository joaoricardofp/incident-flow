"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Severity } from "@/generated/prisma/enums";
import { createIncident } from "../actions";
import { type IncidentSchema, incidentSchema } from "../schema";

type CreateIncidentFormProps = {
  workspaceId: string;
  onSuccess: () => void;
};

type CreateIncidentFormValues = z.input<typeof incidentSchema>;

export function CreateIncidentForm({
  workspaceId,
  onSuccess,
}: CreateIncidentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateIncidentFormValues, undefined, IncidentSchema>({
    resolver: zodResolver(incidentSchema),
    defaultValues: {
      title: "",
      description: "",
      severity: Severity.MEDIUM,
    },
  });

  function onSubmit(data: IncidentSchema) {
    startTransition(async () => {
      const result = await createIncident({ workspaceId }, data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      form.reset();
      toast.success("Incident created successfully.");
      router.refresh();
      onSuccess();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="incident-title">Title</FieldLabel>
              <Input
                {...field}
                aria-invalid={fieldState.invalid}
                id="incident-title"
                placeholder="Briefly describe the incident"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="description"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="incident-description">
                Description
              </FieldLabel>
              <Textarea
                {...field}
                aria-invalid={fieldState.invalid}
                id="incident-description"
                placeholder="Add any useful context (optional)"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="severity"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="incident-severity">Severity</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  aria-invalid={fieldState.invalid}
                  id="incident-severity"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {Object.values(Severity).map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {severity.charAt(0) + severity.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Field>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Spinner /> : "Create incident"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
