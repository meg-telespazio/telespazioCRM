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
import { useIsMobile } from '@/hooks/use-mobile';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const stageClasses: { [key in Opportunity['stage']]: string } = {
  Prospecting: 'bg-yellow-400 text-black hover:bg-yellow-500 border-transparent',
  Proposal: 'bg-[#000080] text-white hover:bg-[#000066] border-transparent',
  Negotiation: 'bg-[#000080] text-white hover:bg-[#000066] border-transparent',
  Won: 'bg-green-600 text-white hover:bg-green-700 border-transparent',
  Lost: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
  Canceled: 'bg-gray-300 text-gray-900 hover:bg-gray-400 border-transparent',
  Suspended: 'bg-gray-300 text-gray-900 hover:bg-gray-400 border-transparent',
};

type RecentOpportunitiesProps = {
  opportunities: Opportunity[];
  clients: Client[];
}

export function RecentOpportunities({ opportunities, clients }: RecentOpportunitiesProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const router = useRouter();

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
        <Table className={isMobile ? "table-fixed w-full" : ""}>
          <TableHeader>
            <TableRow>
              <TableHead className={isMobile ? 'w-2/3' : ''}>{t('Dashboard.recentOpportunities.opportunityHeader')}</TableHead>
              {!isMobile && <TableHead>{t('Dashboard.recentOpportunities.clientHeader')}</TableHead>}
              {!isMobile && <TableHead>{t('Dashboard.recentOpportunities.valueHeader')}</TableHead>}
              <TableHead className={`text-right ${isMobile ? 'w-1/3' : ''}`}>{t('Dashboard.recentOpportunities.stageHeader')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentOpportunities.map((opp) => (
              <TableRow key={opp.id} onClick={() => router.push(`/opportunities/${opp.id}`)} className="cursor-pointer">
                <TableCell className="font-medium">
                  <p className="truncate">{opp.title}</p>
                  {isMobile && (
                    <p className="text-xs text-muted-foreground truncate">{getClientName(opp.clientId)}</p>
                  )}
                </TableCell>
                {!isMobile && <TableCell>{getClientName(opp.clientId)}</TableCell>}
                {!isMobile && <TableCell>${opp.value.toLocaleString()}</TableCell>}
                <TableCell className="text-right">
                  <Badge className={cn('whitespace-nowrap', stageClasses[opp.stage])}>
                    {t(isMobile ? `StagesAbbr.${opp.stage}` : `Stages.${opp.stage}`)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
