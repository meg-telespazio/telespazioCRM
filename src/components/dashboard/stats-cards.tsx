import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign, Briefcase, Users } from 'lucide-react';
import { opportunities, clients } from '@/lib/data';

export function StatsCards() {
  const totalRevenue = opportunities
    .filter((opp) => opp.stage === 'Won')
    .reduce((sum, opp) => sum + opp.value, 0);

  const openOpportunities = opportunities.filter(
    (opp) => opp.stage !== 'Won' && opp.stage !== 'Lost'
  ).length;

  const totalClients = clients.length;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            From all won opportunities
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Open Opportunities</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{openOpportunities}</div>
          <p className="text-xs text-muted-foreground">
            Currently active sales deals
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{totalClients}</div>
          <p className="text-xs text-muted-foreground">Managed clients</p>
        </CardContent>
      </Card>
    </div>
  );
}
