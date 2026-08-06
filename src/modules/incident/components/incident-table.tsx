import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { IncidentSummary } from "../queries";

type IncidentTableProps = {
  incidents: IncidentSummary[];
  workspaceSlug: string;
};

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function IncidentTable({
  incidents,
  workspaceSlug,
}: IncidentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created by</TableHead>
          <TableHead>Created at</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {incidents.map((incident) => (
          <TableRow key={incident.id}>
            <TableCell className="font-medium">
              <Link
                href={`/${workspaceSlug}/incidents/${incident.id}`}
                className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {incident.title}
              </Link>
            </TableCell>
            <TableCell>{formatEnum(incident.severity)}</TableCell>
            <TableCell>{formatEnum(incident.status)}</TableCell>
            <TableCell>{incident.createdBy?.name ?? "Deleted user"}</TableCell>
            <TableCell>{incident.createdAt.toLocaleDateString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
