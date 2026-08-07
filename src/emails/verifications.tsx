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

export interface VerificationEmailProps {
  userName: string;
  verificationUrl: string;
}

export default function VerificationEmail({
  userName,
  verificationUrl,
}: VerificationEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Confirm your email address to get started.</Preview>
      <Tailwind>
        <Body className="m-0 bg-slate-50 px-4 py-10 font-sans text-slate-800">
          <Container className="mx-auto max-w-[560px] rounded-xl border border-solid border-slate-200 bg-white p-10">
          <Section className="mb-8" aria-label="Company logo">
            <Text className="m-0 text-base font-bold uppercase leading-5 tracking-[1.5px] text-blue-600">
              IncidentFlow
            </Text>
          </Section>
          <Heading className="m-0 mb-6 text-[28px] font-bold leading-9 tracking-[-0.4px] text-slate-900">
            Welcome, {userName}!
          </Heading>
          <Text className="m-0 mb-4 text-base leading-6 text-slate-700">
            Thanks for creating an account. Please verify your email address to
            finish setting up your account.
          </Text>
          <Section className="my-7">
            <Button
              className="rounded-md bg-blue-600 px-5 py-3 text-base font-semibold leading-5 text-white no-underline"
              href={verificationUrl}
            >
              Verify email address
            </Button>
          </Section>
          <Text className="m-0 mb-4 text-base leading-6 text-slate-700">
            If the button does not work, copy and paste this link into your
            browser:
          </Text>
          <Link
            className="mb-6 block break-all text-sm leading-5 text-blue-600 underline"
            href={verificationUrl}
          >
            {verificationUrl}
          </Link>
          <Text className="m-0 border-l-4 border-solid border-blue-400 bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-900">
            Verifying your email helps us keep your account secure and lets us
            send you important account updates.
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
