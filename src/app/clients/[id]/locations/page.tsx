'use client';

import { useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useUser,
  useFirestore,
  useDoc,
  useCollection,
} from '@/firebase';
import { useI18n } from '@/firebase/client-provider';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Client, Location } from '@/lib/types';
import { deleteLocation } from '@/lib/firestore/locations';
import dynamic from 'next/dynamic';

import { AppHeader } from '@/components/layout/app-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  PlusCircle,
} from 'lucide-react';
import { LocationsTable } from '@/components/locations/locations-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LocationsMap = dynamic(
  () => import('@/components/locations/locations-map').then(mod => mod.LocationsMap), {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full rounded-b-lg" />,
  }
);


export default function ClientLocationsPage() {
  const { t } = useI18n();
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const clientDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'clients', clientId);
  }, [firestore, clientId, user]);
  const { data: client, loading: clientLoading } = useDoc<Client>(clientDocRef);

  const locationsQuery = useMemo(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'locations'),
      where('clientId', '==', clientId)
    );
  }, [firestore, clientId, user]);
  
  const { data: locations, loading: locationsLoading } = useCollection<Location>(locationsQuery);

  const locationsWithCoords = useMemo(() => {
    if (!locations) return [];
    return locations.filter(l => typeof l.latitude === 'number' && typeof l.longitude === 'number');
  }, [locations]);

  const handleEditLocation = (location: Location) => {
    router.push(`/locations/${location.id}`);
  };

  const handleDeleteLocation = (locationId: string) => {
    if (window.confirm(t('Actions.confirmDelete'))) {
      deleteLocation(firestore, locationId);
    }
  };

  const isLoading = userLoading || clientLoading || locationsLoading;
  
  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={isLoading || !client ? t('App.loading') : t('Locations.title', { clientName: client.name })}>
          <Button variant="outline" onClick={() => router.push('/clients')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('Actions.backToClientList')}
          </Button>
          <Button onClick={() => router.push(`/locations/new?clientId=${clientId}`)} disabled={isLoading || !client}>
             <PlusCircle className="mr-2 h-4 w-4" />
             {t('Locations.add')}
          </Button>
      </AppHeader>
      <main className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {isLoading ? (
                <Skeleton className="h-[500px]" />
            ) : !client ? (
                <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed">
                    <p>Client not found.</p>
                </div>
            ) : locations && locations.length > 0 ? (
                <LocationsTable data={locations} onEdit={handleEditLocation} onDelete={handleDeleteLocation} />
            ) : (
                <div className="flex h-[40vh] flex-col items-center justify-center rounded-lg border-2 border-dashed">
                    <MapPin className="h-16 w-16 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">{t('Locations.noLocations')}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t('Locations.noLocationsDescription')}</p>
                </div>
            )}
          </div>
          <div className="lg:col-span-1">
             <Card className="h-[500px]">
                <CardHeader>
                    <CardTitle>Mapa</CardTitle>
                </CardHeader>
                <CardContent className='relative h-full rounded-b-lg p-0'>
                  <LocationsMap client={client} locations={locationsWithCoords} />
                   {(!isLoading && client && locationsWithCoords.length === 0) && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-b-lg bg-background/80 p-4 text-center backdrop-blur-sm">
                        <MapPin className="h-16 w-16 text-muted-foreground" />
                        <p className="mt-2 text-center text-sm text-muted-foreground">{t('Locations.noLocationsMap')}</p>
                    </div>
                  )}
                </CardContent>
             </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
