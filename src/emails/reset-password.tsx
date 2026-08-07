import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

export interface ResetPasswordEmailProps {
  userName: string;
  resetUrl: string;
}

export default function ResetPasswordEmail({
  userName,
  resetUrl,
}: ResetPasswordEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Reset your password securely.</Preview>
      <Tailwind>
        <Body className="m-0 bg-slate-50 px-4 py-10 font-sans text-slate-800">
          <Container className="mx-auto max-w-[560px] rounded-xl border border-solid border-slate-200 bg-white p-10">
          <Section className="mb-8" aria-label="Company logo">
            <Text className="m-0 text-base font-bold uppercase leading-5 tracking-[1.5px] text-blue-600">
              IncidentFlow
            </Text>
          </Section>
          <Heading className="m-0 mb-6 text-[28px] font-bold leading-9 tracking-[-0.4px] text-slate-900">
            Reset your password
          </Heading>
          <Text className="m-0 mb-4 text-base leading-6 text-slate-700">
            Hi {userName},
          </Text>
          <Text className="m-0 mb-4 text-base leading-6 text-slate-700">
            We received a request to reset the password for your account. Use
            the button below to choose a new password.
          </Text>
          <Section className="my-7">
            <Button
              className="rounded-md bg-blue-600 px-5 py-3 text-base font-semibold leading-5 text-white no-underline"
              href={resetUrl}
            >
              Reset password
            </Button>
          </Section>
          <Text className="m-0 mb-4 text-base leading-6 text-slate-700">
            This link expires in 60 minutes. If the button does not work, copy
            and paste this link into your browser:
          </Text>
          <Link
            className="mb-6 block break-all text-sm leading-5 text-blue-600 underline"
            href={resetUrl}
          >
            {resetUrl}
          </Link>
          <Text className="m-0 border-l-4 border-solid border-slate-400 bg-slate-50 px-4 py-3 text-sm leading-5 text-slate-600">
            If you did not request a password reset, you can safely ignore this
            email. Your password will remain unchanged.
          </Text>
          <Hr className="my-8 mb-5 border-slate-200" />
          <Text className="m-0 text-center text-xs leading-[18px] text-slate-500">
            © {new Date().getFullYear()} IncidentFlow. All rights reserved.
          </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
