'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Location, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2, PlusCircle } from 'lucide-react';
import { LocationsTable } from '@/components/locations/locations-table';
import { Button } from '@/components/ui/button';

const LocationsMap = dynamic(
  () => import('@/components/locations/locations-map').then(mod => mod.LocationsMap), {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-b-lg" />,
  }
);

export default function GlobalLocationsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const locationsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'locations');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [firestore, user]);
  
  const clientsQuery = useMemo(() => {
    if (!user) return null;
    const ref = collection(firestore, 'clients');
    if (user.role === 'admin') return query(ref);
    return query(ref, where('management', '==', user.management));
  }, [firestore, user]);

  const { data: locations, loading: locationsLoading } = useCollection<Location>(locationsQuery);
  const { data: clients, loading: clientsLoading } = useCollection<Client>(clientsQuery);

  const locationsWithCoords = useMemo(() => {
    if (!locations) return [];
    return locations.filter(l => typeof l.latitude === 'number' && typeof l.longitude === 'number');
  }, [locations]);

  const isLoading = userLoading || locationsLoading || clientsLoading;
  const isIngeniero = user?.role === 'ingeniero';

  const handleEditLocation = (location: Location) => {
    router.push(`/locations/${location.id}`);
  };

  const handleDeleteLocation = (locationId: string) => {
    // handled in component context
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.locations')}>
        {!isIngeniero && (
          <Button size="sm" onClick={() => router.push('/locations/new')}>
            <PlusCircle className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t('Locations.add')}</span>
          </Button>
        )}
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <Card className="h-[500px] flex flex-col border-none shadow-md overflow-hidden">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {t('Locations.view')}
            </CardTitle>
          </CardHeader>
          <CardContent className='relative flex-grow p-0'>
            <LocationsMap clients={clients || []} locations={locationsWithCoords} />
            {isLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 p-4 text-center backdrop-blur-sm">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">{t('App.loading')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : locations && locations.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t('Locations.globalTitle')}</h2>
            <LocationsTable 
              data={locations} 
              onEdit={handleEditLocation} 
              onDelete={handleDeleteLocation} 
            />
          </div>
        ) : (
          <div className="flex h-[20vh] flex-col items-center justify-center rounded-lg border-2 border-dashed">
            <MapPin className="h-16 w-16 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{t('Locations.noLocations')}</h3>
          </div>
        )}
      </main>
    </div>
  );
}
