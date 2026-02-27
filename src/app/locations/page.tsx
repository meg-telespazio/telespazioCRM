
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/layout/app-header';
import type { Location, Client } from '@/lib/types';
import { useI18n } from '@/firebase/client-provider';
import { collection, query } from 'firebase/firestore';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import { LocationsTable } from '@/components/locations/locations-table';

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
    return collection(firestore, 'locations');
  }, [firestore, user]);
  
  const clientsQuery = useMemo(() => {
    if (!user) return null;
    return collection(firestore, 'clients');
  }, [firestore, user]);

  const { data: locations, loading: locationsLoading } = useCollection<Location>(locationsQuery);
  const { data: clients, loading: clientsLoading } = useCollection<Client>(clientsQuery);

  const locationsWithCoords = useMemo(() => {
    if (!locations) return [];
    return locations.filter(l => typeof l.latitude === 'number' && typeof l.longitude === 'number');
  }, [locations]);

  const isLoading = userLoading || locationsLoading || clientsLoading;

  const handleEditLocation = (location: Location) => {
    router.push(`/locations/${location.id}`);
  };

  const handleDeleteLocation = (locationId: string) => {
    // Para la vista global, la eliminación se maneja desde el detalle del cliente para seguridad
    // o se podría implementar aquí con una confirmación.
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.locations')} />
      <main className="flex-1 p-4 sm:p-6 space-y-6">
        <Card className="h-[500px] flex flex-col">
          <CardHeader>
            <CardTitle>{t('Locations.view')}</CardTitle>
          </CardHeader>
          <CardContent className='relative flex-grow p-4 pt-0'>
            <LocationsMap client={null} locations={locationsWithCoords} />
            {isLoading && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-b-lg bg-background/80 p-4 text-center backdrop-blur-sm">
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
