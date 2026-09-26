import { Spinner } from "@/components/ui/spinner";
import { Heading, Text } from "@/components/ui/typography";
import { joinWorkspace } from "@/modules/workspace/actions";
import { redirect } from "next/navigation";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const result = await joinWorkspace({ token });

  if (!result.success) {
    switch (result.code) {
      case "USER_NOT_FOUND":
        redirect(`/sign-in?inviteToken=${token}`);
        break;
      case "TOKEN_REQUIRED":
      case "INVALID_TOKEN":
        redirect("/dashboard");
        break;
      case "ALREADY_MEMBER":
        redirect(`/${result.slug}`);
        break;
    }
  }

  redirect(`/${result.slug}`);

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="flex flex-col items-center justify-center gap-0.5">
        <div className="flex items-center justify-center gap-2">
          <Spinner />
          <Heading>Joining workspace</Heading>
        </div>
        <Text variant="muted">Awaiting response to your request...</Text>
      </div>
    </div>
  );
}
