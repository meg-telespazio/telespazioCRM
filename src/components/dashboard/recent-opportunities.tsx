'use client';

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
import type { Opportunity, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';

const stageVariant: { [key in Opportunity['stage']]: "default" | "secondary" | "destructive" } = {
  Prospecting: "secondary",
  Proposal: "secondary",
  Negotiation: "secondary",
  Won: "default",
  Lost: "destructive",
};

type RecentOpportunitiesProps = {
  opportunities: Opportunity[];
  clients: Client[];
}

export function RecentOpportunities({ opportunities, clients }: RecentOpportunitiesProps) {
  const { t } = useI18n();
  const recentOpportunities = [...opportunities]
    .sort((a, b) => b.closeDate.getTime() - a.closeDate.getTime())
    .slice(0, 5);

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown Client';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Dashboard.recentOpportunities.title')}</CardTitle>
        <CardDescription>
          {t('Dashboard.recentOpportunities.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Dashboard.recentOpportunities.opportunityHeader')}</TableHead>
              <TableHead>{t('Dashboard.recentOpportunities.clientHeader')}</TableHead>
              <TableHead>{t('Dashboard.recentOpportunities.valueHeader')}</TableHead>
              <TableHead>{t('Dashboard.recentOpportunities.stageHeader')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOpportunities.map((opp) => (
              <TableRow key={opp.id}>
                <TableCell className="font-medium">{opp.title}</TableCell>
                <TableCell>{getClientName(opp.clientId)}</TableCell>
                <TableCell>${opp.value.toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={stageVariant[opp.stage]}>{t(`Stages.${opp.stage}`)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
