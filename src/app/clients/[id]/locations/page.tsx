'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  Loader2,
  Upload,
  ChevronRight,
} from 'lucide-react';
import { LocationsTable } from '@/components/locations/locations-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LocationImporter } from '@/components/locations/location-importer';

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
  
  const [isImporterOpen, setImporterOpen] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState<Location | null>(null);
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

  const handleFocusOnMap = (location: Location) => {
    setFocusedLocation(null);
    setTimeout(() => {
      setFocusedLocation(location);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const isLoading = userLoading || clientLoading || locationsLoading;
  const isIngeniero = user?.role === 'ingeniero';
  
  return (
    <>
      <div className="flex flex-1 flex-col">
        <AppHeader title={
          isLoading || !client ? t('App.loading') : (
            <div className="flex items-center gap-2">
              <Link href="/clients" className="text-muted-foreground hover:text-primary transition-colors">{t('Pages.clients')}</Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Link href={`/clients/${client.id}/summary`} className="text-muted-foreground hover:text-primary transition-colors">{client.name}</Link>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <span>{t('Pages.locations')}</span>
            </div>
          )
        }>
            <Button variant="outline" onClick={() => router.push('/clients')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('Actions.backToClientList')}
            </Button>
            {!isIngeniero && (
              <>
                <Button variant="outline" onClick={() => setImporterOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  {t('Importer.button')}
                </Button>
                <Button onClick={() => router.push(`/locations/new?clientId=${clientId}`)} disabled={isLoading || !client}>
                   <PlusCircle className="mr-2 h-4 w-4" />
                   {t('Locations.add')}
                </Button>
              </>
            )}
        </AppHeader>
        <main className="flex-1 p-4 sm:p-6 overflow-hidden">
          <div className="flex flex-col gap-6">
              <Card className="h-[400px] flex flex-col border-none shadow-md overflow-hidden">
                  <CardHeader className="bg-slate-50 border-b">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        Mapa
                      </CardTitle>
                  </CardHeader>
                  <CardContent className='relative flex-grow p-0'>
                    <LocationsMap 
                      client={client} 
                      locations={locationsWithCoords} 
                      focusedLocation={focusedLocation}
                    />
                     {isLoading && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 p-4 text-center backdrop-blur-sm">
                          <Loader2 className="h-12 w-12 animate-spin text-primary" />
                          <p className="mt-4 text-sm text-muted-foreground">{t('App.loading')}</p>
                      </div>
                     )}
                     {(!isLoading && locationsWithCoords.length === 0) && (
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 p-4 text-center backdrop-blur-sm">
                          <MapPin className="h-16 w-16 text-muted-foreground" />
                          <p className="mt-2 text-center text-sm text-muted-foreground">{t('Locations.noLocationsMap')}</p>
                      </div>
                    )}
                  </CardContent>
               </Card>
              <div>
                {isLoading ? (
                    <Skeleton className="h-[300px]" />
                ) : !client ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
                        <p>Client not found.</p>
                    </div>
                ) : locations && locations.length > 0 ? (
                    <LocationsTable 
                      data={locations} 
                      onEdit={handleEditLocation} 
                      onDelete={handleDeleteLocation} 
                      onFocus={handleFocusOnMap}
                    />
                ) : (
                    <div className="flex h-[20vh] flex-col items-center justify-center rounded-lg border-2 border-dashed">
                        <MapPin className="h-16 w-16 text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">{t('Locations.noLocations')}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{t('Locations.noLocationsDescription')}</p>
                    </div>
                )}
              </div>
          </div>
        </main>
      </div>
      <LocationImporter
        isOpen={isImporterOpen}
        onOpenChange={setImporterOpen}
        clientId={clientId}
        locations={locations || []}
      />
    </>
  );
}