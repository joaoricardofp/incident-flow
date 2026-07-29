import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Role } from "@/generated/prisma/enums";
import Link from "next/link";

type WorkspaceCardProps = {
  name: string;
  slug: string;
  role: Role;
}

export function WorkspaceCard({ ...props }: WorkspaceCardProps) {
  return (
    <Link href={`/${props.slug}`}>
      <Card>
        <CardHeader>
          <CardTitle>{props.name}</CardTitle>
          <CardAction>
            <Badge variant={props.role ==="ADMIN" ? "default" : "outline"}>{props.role}</Badge>
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
