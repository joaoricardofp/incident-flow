"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { toast } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { GitHubIcon } from "../icons";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "../ui/field";
import { Input } from "../ui/input";
import { InputPassword } from "../ui/input-password";
import { Spinner } from "../ui/spinner";
import { signInWithGitHub } from "./github-sign-in";

const schema = z.object({
  email: z.email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters.").trim(),
});

type formData = z.infer<typeof schema>;

export function SignInForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const form = useForm<formData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
  });

  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(data: formData) {
    if (isPending) return;

    startTransition(async () => {
      await authClient.signIn.email(
        {
          email: data.email,
          password: data.password,
          callbackURL: "/dashboard",
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
              description: "Logged in successfully!",
            });
            router.push("/dashboard");
          },
        },
      );
    });
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Sign in to your account</CardTitle>
        </CardHeader>
        <CardContent>
          <form id="sign-in-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <Button
                  variant="outline"
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    signInWithGitHub({ isPending, startTransition })
                  }
                >
                  <GitHubIcon />
                  {isPending ? <Spinner /> : "Continue with GitHub"}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or
              </FieldSeparator>
              <Controller
                name="email"
                control={form.control}
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
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>
                      Password
                      <a className="ml-auto text-sm text-primary underline" href="/reset-password">Forgot password?</a>
                    </FieldLabel>
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
              <Field>
                <Button id="sign-in-form" type="submit" disabled={isPending}>
                  {isPending ? <Spinner /> : "Sign In"}
                </Button>
                <FieldDescription className="text-center">
                  Don't have an account? <a href="/sign-up">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
