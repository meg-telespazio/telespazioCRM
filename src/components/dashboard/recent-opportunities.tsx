import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { opportunities, clients } from '@/lib/data';
import type { Opportunity } from '@/lib/types';

const stageVariant: { [key in Opportunity['stage']]: "default" | "secondary" | "destructive" } = {
  Prospecting: "secondary",
  Proposal: "secondary",
  Negotiation: "secondary",
  Won: "default",
  Lost: "destructive",
};

export function RecentOpportunities() {
  const recentOpportunities = opportunities
    .sort((a, b) => b.closeDate.getTime() - a.closeDate.getTime())
    .slice(0, 5);

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown Client';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Opportunities</CardTitle>
        <CardDescription>
          A quick look at the latest opportunities.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opportunity</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Stage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOpportunities.map((opp) => (
              <TableRow key={opp.id}>
                <TableCell className="font-medium">{opp.title}</TableCell>
                <TableCell>{getClientName(opp.clientId)}</TableCell>
                <TableCell>${opp.value.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={stageVariant[opp.stage]}>{opp.stage}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
