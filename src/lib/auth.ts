import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { headers } from "next/headers";
import { cache } from "react";
import prisma from "./prisma";
import { resend } from "./resend";
import ResetPasswordEmail from "@/emails/reset-password";
import VerificationEmail from "@/emails/verifications";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email/password authentication with email verification
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,

    // Send password reset emails via Resend
    sendResetPassword: async ({ user, url, token }) => {
      void resend.emails.send({
        from: `IncidetFlow <${process.env.EMAIL_FROM!}>`,
        to: [user.email],
        subject: "Reset your password",
        react: ResetPasswordEmail({ userName: user.name!, resetUrl: url }),
      });
    },
  },

  // Email verification settings
  emailVerification: {
    sendOnSignIn: true,
    autoSignInAfterVerification: true,

    // Send verification emails via Resend
    sendVerificationEmail: async ({ user, url, token }) => {
      void resend.emails.send({
        from: `IncidetFlow <${process.env.EMAIL_FROM!}>`,
        to: [user.email],
        subject: "Verify your email",
        react: VerificationEmail({
          userName: user.name!,
          verificationUrl: url,
        }),
      });
    },
  },

  // Social providers authentication
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});

export type Session = typeof auth.$Infer.Session;

export const getSession = cache(async (): Promise<Session | null> => {
  return await auth.api.getSession({ headers: await headers() });
});
