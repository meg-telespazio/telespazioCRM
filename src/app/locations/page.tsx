'use client';

import { useMemo, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

  const [focusedLocation, setFocusedLocation] = useState<Location | null>(null);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

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

  const { data: locationsData, loading: locationsLoading } = useCollection<Location>(locationsQuery);
  const { data: clients, loading: clientsLoading } = useCollection<Client>(clientsQuery);

  const filteredLocations = useMemo(() => {
    if (!locationsData) return [];
    let filtered = locationsData;
    if (showOnlyMine && user?.role === 'ejecutivo') {
      filtered = filtered.filter(loc => loc.assignedTo === user.uid);
    }
    return filtered;
  }, [locationsData, showOnlyMine, user]);

  const locationsWithCoords = useMemo(() => {
    return filteredLocations.filter(l => typeof l.latitude === 'number' && typeof l.longitude === 'number');
  }, [filteredLocations]);

  const isLoading = userLoading || locationsLoading || clientsLoading;
  const isIngeniero = user?.role === 'ingeniero';
  const isEjecutivo = user?.role === 'ejecutivo';

  const handleEditLocation = (location: Location) => {
    router.push(`/locations/${location.id}`);
  };

  const handleDeleteLocation = (locationId: string) => {
    // handled in component context
  };

  const handleFocusOnMap = (location: Location) => {
    setFocusedLocation(null); // Reset focus to trigger effect if it's the same
    setTimeout(() => {
      setFocusedLocation(location);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t('Pages.locations')}>
        <div className="flex items-center gap-4">
          {isEjecutivo && (
            <div className="flex items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/20">
              <Switch 
                id="mine-filter" 
                checked={showOnlyMine} 
                onCheckedChange={setShowOnlyMine} 
              />
              <Label htmlFor="mine-filter" className="text-[10px] font-bold uppercase tracking-tighter cursor-pointer">
                {t('Actions.showOnlyMine')}
              </Label>
            </div>
          )}
          {!isIngeniero && (
            <Button size="sm" onClick={() => router.push('/locations/new')}>
              <PlusCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('Locations.add')}</span>
            </Button>
          )}
        </div>
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
            <LocationsMap 
              clients={clients || []} 
              locations={locationsWithCoords} 
              focusedLocation={focusedLocation}
            />
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
        ) : filteredLocations && filteredLocations.length > 0 ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t('Locations.globalTitle')}</h2>
            <LocationsTable 
              data={filteredLocations} 
              onEdit={handleEditLocation} 
              onDelete={handleDeleteLocation} 
              onFocus={handleFocusOnMap}
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
