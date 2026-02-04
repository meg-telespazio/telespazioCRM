import { AppHeader } from '@/components/layout/app-header';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { OpportunitiesChart } from '@/components/dashboard/opportunities-chart';
import { RecentOpportunities } from '@/components/dashboard/recent-opportunities';

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title="Dashboard" />
      <div className="flex-1 space-y-4 p-4 sm:p-6">
        <StatsCards />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <div className="col-span-4">
            <OpportunitiesChart />
          </div>
          <div className="col-span-4 lg:col-span-3">
            <RecentOpportunities />
          </div>
        </div>
      </div>
    </div>
  );
}
