import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Role } from "@/generated/prisma/enums";
import { BoxesIcon } from "lucide-react";
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
          <div className="items-center flex gap-2">
            <div className="border border-border text-foreground p-1.5 rounded-full"><BoxesIcon className="h-4 w-4" /></div>
            <CardTitle>{props.name}</CardTitle>
          </div>
          <CardAction>
            <Badge variant={props.role ==="ADMIN" ? "default" : "outline"}>{props.role}</Badge>
          </CardAction>
        </CardHeader>
      </Card>
    </Link>
  );
}
