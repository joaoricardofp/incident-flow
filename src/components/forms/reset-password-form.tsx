"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import { Input } from "../ui/input";
import { InputPassword } from "../ui/input-password";
import { Spinner } from "../ui/spinner";

const requestSchema = z.object({
  email: z.email("Invalid email address."),
});

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .trim(),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type RequestFormData = z.infer<typeof requestSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

export function ResetPasswordForm({
  token,
  className,
  ...props
}: React.ComponentProps<"div"> & { token?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isResettingPassword = Boolean(token);
  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });
  const resetForm = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  });

  function requestPasswordReset(data: RequestFormData) {
    if (isPending) return;

    startTransition(async () => {
      await authClient.requestPasswordReset(
        {
          email: data.email,
          redirectTo: `${window.location.origin}/reset-password`,
        },
        {
          onError: (ctx) => {
            toast.add({
              type: "error",
              description: ctx.error.message,
              priority: "high",
            });
          },
          onSuccess: () => {
            toast.add({
              type: "success",
              description:
                "If an account exists for this email, a reset link has been sent.",
            });
          },
        },
      );
    });
  }

  function resetPassword(data: ResetFormData) {
    if (!token || isPending) return;

    startTransition(async () => {
      await authClient.resetPassword(
        { newPassword: data.password, token },
        {
          onError: (ctx) => {
            toast.add({
              type: "error",
              description: ctx.error.message,
              priority: "high",
            });
          },
          onSuccess: () => {
            toast.add({
              type: "success",
              description: "Your password has been reset. Please sign in.",
            });
            router.push("/sign-in");
          },
        },
      );
    });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            {isResettingPassword
              ? "Choose a new password"
              : "Reset your password"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isResettingPassword ? (
            <form
              aria-busy={isPending}
              onSubmit={resetForm.handleSubmit(resetPassword)}
            >
              <FieldGroup>
                <Controller
                  name="password"
                  control={resetForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>New password</FieldLabel>
                      <InputPassword
                        {...field}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="confirmPassword"
                  control={resetForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Confirm new password</FieldLabel>
                      <InputPassword
                        {...field}
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Spinner /> : "Reset password"}
                </Button>
              </FieldGroup>
            </form>
          ) : (
            <form
              aria-busy={isPending}
              onSubmit={requestForm.handleSubmit(requestPasswordReset)}
            >
              <FieldGroup>
                <FieldDescription>
                  Enter your email address and we&apos;ll send you a reset link.
                </FieldDescription>
                <Controller
                  name="email"
                  control={requestForm.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Email</FieldLabel>
                      <Input
                        {...field}
                        aria-invalid={fieldState.invalid}
                        type="email"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Button type="submit" disabled={isPending}>
                  {isPending ? <Spinner /> : "Send reset link"}
                </Button>
                <FieldDescription className="text-center">
                  Remembered your password? <a href="/sign-in">Sign in</a>
                </FieldDescription>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
